import React, { useState, useEffect, useMemo } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { INITIAL_CHALLENGES } from '../data/platformData';
import { computeStripeCheckoutBreakdown } from '../engine/stripeCheckout';
import {
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';

export type CryptoCoinOption = 'USDT_BEP20';

export const StripeCheckoutModal: React.FC = () => {
  const {
    user,
    challenges,
    userCoupons,
    adminCoupons,
    paymentSettings,
    stripeCheckoutSession,
    closeStripeCheckout,
    submitAccountPurchaseRequest,
    pushNotification,
    navigate,
  } = usePlatform();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  const [transactionRef, setTransactionRef] = useState('');
  const [payerNotes, setPayerNotes] = useState('');
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState('');
  const [paymentScreenshotName, setPaymentScreenshotName] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<string | null>(null);

  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');

  useEffect(() => {
    if (stripeCheckoutSession) {
      setSelectedChallengeId(stripeCheckoutSession.challengeId);
      setSubmittedOrderNumber(null);
      setTransactionRef('');
      setPayerNotes('');
      setPaymentScreenshotUrl('');
      setPaymentScreenshotName('');
      setFormError('');
      const initCode = stripeCheckoutSession.initialCouponCode || '';
      setCouponInput(initCode);
      setAppliedCoupon(initCode);
      setCouponFeedback(
        initCode
          ? { type: 'success', msg: `Coupon code ${initCode.toUpperCase()} applied.` }
          : null
      );
    }
  }, [stripeCheckoutSession]);

  const activeId = selectedChallengeId || stripeCheckoutSession?.challengeId || 'two-step-100000';

  const baseChallenge = useMemo(() => {
    return (
      challenges.find((c) => c.id === activeId) ||
      INITIAL_CHALLENGES.find((c) => c.id === activeId) ||
      challenges[0] ||
      INITIAL_CHALLENGES[0]
    );
  }, [activeId, challenges]);

  const breakdown = useMemo(
    () =>
      computeStripeCheckoutBreakdown(
        baseChallenge,
        appliedCoupon,
        userCoupons,
        adminCoupons
      ),
    [baseChallenge, appliedCoupon, userCoupons, adminCoupons]
  );

  const effectiveChallenge = useMemo(() => {
    return (
      challenges.find((c) => c.id === breakdown.targetChallengeId) ||
      INITIAL_CHALLENGES.find((c) => c.id === breakdown.targetChallengeId) ||
      baseChallenge
    );
  }, [challenges, breakdown.targetChallengeId, baseChallenge]);

  // Dynamic Crypto Info Map based on Admin Payment Gateway Settings (Exclusively USDT BEP-20)
  const cryptoDetails = useMemo(() => {
    const bep20Address =
      paymentSettings.cryptoUsdtBep20 ||
      '0x8F49aC7E219B40FundedApex7291E8823c91A421';
    return {
      label: 'USDT (BEP-20 · BNB Smart Chain)',
      address: bep20Address,
      qr:
        paymentSettings.cryptoUsdtBep20Qr ||
        `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(bep20Address)}`,
    };
  }, [paymentSettings]);

  if (!stripeCheckoutSession) return null;

  const handleCopyText = (label: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    pushNotification('Copied to Clipboard', `${label}: ${text}`, 'info');
  };

  const handleApplyCoupon = () => {
    setFormError('');
    const clean = couponInput.trim().toUpperCase();
    if (!clean) {
      setAppliedCoupon('');
      setCouponFeedback(null);
      return;
    }
    const test = computeStripeCheckoutBreakdown(
      baseChallenge,
      clean,
      userCoupons,
      adminCoupons
    );
    if (!test.validCode) {
      setAppliedCoupon('');
      setCouponFeedback({
        type: 'error',
        msg: test.errorMessage || 'Invalid or expired coupon code.',
      });
      return;
    }
    setAppliedCoupon(clean);
    setCouponFeedback({
      type: 'success',
      msg: `${test.discountPct}% OFF coupon (${clean}) applied! New total: $${test.finalAmountUsd.toFixed(
        2
      )} USD.`,
    });
  };

  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPaymentScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPaymentScreenshotUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrderForConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanRef =
      transactionRef.trim() || (paymentScreenshotName ? `IMG-PROOF-${paymentScreenshotName}` : '');
    if (!cleanRef && !paymentScreenshotUrl) {
      setFormError(
        'Please upload your Crypto Payment Screenshot image or enter your Transaction Hash (TxID).'
      );
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      try {
        const req = submitAccountPurchaseRequest({
          challengeId: effectiveChallenge.id,
          couponCode: breakdown.appliedCode || undefined,
          paymentMethod: 'CRYPTO',
          transactionRef: cleanRef,
          payerNotes: `Coin: ${cryptoDetails.label} | ${payerNotes.trim()}`,
          paymentScreenshotUrl: paymentScreenshotUrl || undefined,
          finalAmountUsd: breakdown.finalAmountUsd,
          discountPct: breakdown.discountPct,
        });
        setSubmitting(false);
        setSubmittedOrderNumber(req.orderNumber);
      } catch (err: unknown) {
        setSubmitting(false);
        setFormError(err instanceof Error ? err.message : 'Unable to submit purchase request.');
      }
    }, 350);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="FUNDED APEX Crypto Evaluation Checkout"
      data-testid="stripe-checkout-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#020A08]/90 backdrop-blur-md overflow-y-auto apex-backdrop-enter"
    >
      <div className="w-full max-w-4xl bg-[#051612] border border-[#00FFA3]/40 rounded-3xl shadow-[0_32px_90px_rgba(0,255,163,0.18)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-auto apex-scale-in text-[#F0FDF9]">
        {/* LEFT COLUMN: EVALUATION SUMMARY & COUPON BREAKDOWN */}
        <div className="lg:col-span-5 bg-[#030F0C] p-5 sm:p-7 border-b lg:border-b-0 lg:border-r border-[#00FFA3]/20 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00FFA3]/15 border border-[#00FFA3]/45 text-xs font-mono font-bold text-[#00FFA3]">
                <img
                  src="/assets/aistudio/IMG_20261108_140853_727c5a1e.png"
                  alt="FUNDED APEX"
                  className="w-4 h-4 object-contain rounded-full"
                />
                <span>BEP-20 CRYPTO CHECKOUT</span>
              </div>
              <span className="text-[11px] font-semibold text-[#99F6E4]">Instant Verification</span>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#5EEAD4] uppercase tracking-wider mb-1.5">
                Select Account Size
              </div>

              {/* Account Size Quick Selector Pills ($5K, $10K, $25K, $50K, $100K, $200K) */}
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                {[5000, 10000, 25000, 50000, 100000, 200000].map((size) => {
                  const match = challenges.find(
                    (c) => c.type === effectiveChallenge.type && c.accountSize === size
                  );
                  const isSelected = effectiveChallenge.accountSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        if (match) setSelectedChallengeId(match.id);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00FFA3] text-[#02140E] border-[#00FFA3] font-extrabold shadow-[0_0_16px_rgba(0,255,163,0.4)]'
                          : 'bg-[#07211B] text-[#CCFBF1] border-[#00FFA3]/25 hover:border-[#00FFA3]/70'
                      }`}
                    >
                      ${size >= 1000 ? `${size / 1000}K` : size}
                    </button>
                  );
                })}
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white">
                {effectiveChallenge.title}
              </h2>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span
                  data-testid="stripe-final-amount"
                  className="text-3xl sm:text-4xl font-extrabold font-mono text-[#00FFA3]"
                >
                  ${breakdown.finalAmountUsd.toFixed(2)}
                </span>
                <span className="text-xs font-mono font-semibold text-[#99F6E4]">USDT (BEP-20)</span>
                {breakdown.discountPct > 0 && (
                  <span className="text-sm font-mono line-through text-teal-600">
                    ${breakdown.originalPriceUsd.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2.5 pt-3.5 border-t border-[#00FFA3]/20 text-xs">
              <div className="flex justify-between">
                <span className="text-[#99F6E4]">{effectiveChallenge.title} Fee</span>
                <span className="font-mono font-bold text-white">
                  ${breakdown.originalPriceUsd.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#99F6E4]">Account Capital</span>
                <span className="font-mono font-bold text-white">
                  ${effectiveChallenge.accountSize.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#99F6E4]">Profit Target / Max DD</span>
                <span className="font-mono font-bold text-[#2DD4BF]">
                  +{effectiveChallenge.profitTargetPct}% / {effectiveChallenge.maxDrawdownPct}%
                </span>
              </div>
              {breakdown.appliedCode && (
                <div className="flex justify-between text-[#00FFA3] font-bold">
                  <span>Coupon ({breakdown.appliedCode})</span>
                  <span className="font-mono">
                    -{breakdown.discountPct}% (-${breakdown.discountAmountUsd.toFixed(2)})
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2.5 border-t border-[#00FFA3]/20 text-sm font-bold">
                <span className="text-white">Total Payable</span>
                <span className="font-mono font-extrabold text-[#00FFA3]">
                  ${breakdown.finalAmountUsd.toFixed(2)} USDT
                </span>
              </div>
            </div>

            {/* Coupon Code Input Box */}
            <div className="space-y-2 pt-1">
              <label
                htmlFor="checkout-coupon-input"
                className="block text-xs font-semibold text-[#CCFBF1] flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5 text-[#00FFA3]" />
                <span>Discount Coupon Code</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="checkout-coupon-input"
                  data-testid="stripe-coupon-input"
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. APEX90)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#07211B] border border-[#00FFA3]/30 text-xs font-mono font-bold text-white placeholder-teal-600 uppercase focus:outline-none focus:border-[#00FFA3]"
                />
                <button
                  type="button"
                  data-testid="stripe-apply-coupon-btn"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2.5 rounded-xl bg-[#00FFA3]/15 hover:bg-[#00FFA3]/25 border border-[#00FFA3]/50 text-xs font-bold text-[#00FFA3] cursor-pointer transition-colors"
                >
                  Apply
                </button>
              </div>

              {couponFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold ${
                    couponFeedback.type === 'success'
                      ? 'bg-[#00FFA3]/15 border border-[#00FFA3]/45 text-[#00FFA3]'
                      : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
                  }`}
                >
                  {couponFeedback.msg}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#00FFA3]/20 flex items-center gap-2.5 text-[11px] text-[#99F6E4]">
            <ShieldCheck className="w-4 h-4 text-[#00FFA3] shrink-0" />
            <span>
              Your evaluation account activates automatically as soon as Admin confirms your BEP-20 payment.
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: UNIFIED USDT (BEP-20) PAYMENT QR & VERIFICATION FORM (NO BACK BUTTON) */}
        <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#00FFA3]/20 pb-3.5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#00FFA3]" />
                <span>USDT (BEP-20) Crypto Payment</span>
              </h3>
              <p className="text-xs text-[#99F6E4] mt-0.5">
                Scan QR or copy BEP-20 address below, then upload payment screenshot &amp; TxHash
              </p>
            </div>
            <button
              type="button"
              aria-label="Close checkout"
              onClick={closeStripeCheckout}
              className="p-2 rounded-xl bg-[#07211B] hover:bg-[#0B2E26] border border-[#00FFA3]/30 text-[#CCFBF1] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {submittedOrderNumber ? (
            <div
              data-testid="purchase-confirmation-sent"
              className="py-8 px-5 rounded-3xl bg-[#030F0C] border border-[#00FFA3]/50 text-center space-y-5 apex-scale-in my-auto"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#00FFA3] text-[#02140E] flex items-center justify-center shadow-[0_0_28px_rgba(0,255,163,0.45)]">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#00FFA3]/15 border border-[#00FFA3]/40 text-[#00FFA3] text-xs font-mono font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>AWAITING ADMIN CONFIRMATION · #{submittedOrderNumber}</span>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold text-white pt-1">
                  Crypto Payment Request Submitted!
                </h4>
                <p className="text-xs sm:text-sm text-[#99F6E4] max-w-md mx-auto leading-relaxed">
                  Your <strong className="text-white">{effectiveChallenge.title}</strong> order (
                  <strong className="text-[#00FFA3]">${breakdown.finalAmountUsd.toFixed(2)} USDT</strong> via{' '}
                  <strong className="text-white">{cryptoDetails.label}</strong>) has been sent to Admin for instant activation.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    closeStripeCheckout();
                    navigate('dashboard');
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00FFA3] hover:bg-[#00E592] text-[#02140E] text-xs font-extrabold cursor-pointer transition-colors"
                >
                  Open Trader Dashboard →
                </button>
                <button
                  type="button"
                  onClick={closeStripeCheckout}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#07211B] border border-[#00FFA3]/30 text-xs font-bold text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitOrderForConfirmation} className="space-y-4">
              {/* 1. EXCLUSIVE BEP-20 NETWORK BANNER */}
              <div className="px-3.5 py-2.5 rounded-2xl bg-[#07211B] border border-[#00FFA3]/45 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00FFA3] animate-pulse" />
                  <span className="font-mono text-xs sm:text-sm font-bold text-white">
                    Network: <strong className="text-[#00FFA3]">USDT (BEP-20 · BNB Smart Chain)</strong>
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#00FFA3]/15 border border-[#00FFA3]/45 text-[10px] font-mono font-bold text-[#00FFA3] uppercase">
                  BEP-20 Only
                </span>
              </div>

              {/* 2. QR CODE + WALLET ADDRESS + COPY BUTTON */}
              <div className="rounded-2xl p-4 bg-[#030F0C] border border-[#00FFA3]/25 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white p-2 rounded-2xl shrink-0 border-2 border-[#00FFA3] flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(0,255,163,0.2)]">
                  <img
                    src={cryptoDetails.qr}
                    alt="USDT BEP-20 Deposit QR Code"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                        cryptoDetails.address
                      )}`;
                    }}
                  />
                </div>

                <div className="space-y-2.5 flex-1 min-w-0 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#00FFA3] uppercase tracking-wider">
                      Official BEP-20 Deposit Wallet Address
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      Send: <strong className="text-[#00FFA3]">${breakdown.finalAmountUsd.toFixed(2)} USDT</strong>
                    </span>
                  </div>

                  <div className="font-mono text-xs text-white font-bold break-all p-2.5 rounded-xl bg-[#07211B] border border-[#00FFA3]/30 select-all">
                    {cryptoDetails.address}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText('USDT BEP-20 Wallet', cryptoDetails.address)}
                      className="px-3.5 py-2 rounded-xl bg-[#00FFA3] hover:bg-[#00E592] text-[#02140E] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors shadow-[0_0_14px_rgba(0,255,163,0.3)]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy BEP-20 Address</span>
                    </button>
                    <span className="text-[11px] text-[#99F6E4]">
                      Send only USDT via BNB Smart Chain (BEP-20)
                    </span>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-xs font-bold text-rose-200">
                  {formError}
                </div>
              )}

              {/* 3. SCREENSHOT UPLOAD & TXHASH INPUT IN ONE CLEAN GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="checkout-screenshot-upload"
                    className="block text-xs font-bold text-[#00FFA3] mb-1.5"
                  >
                    1. Upload Payment Screenshot *
                  </label>
                  <div className="p-2.5 rounded-xl bg-[#030F0C] border border-dashed border-[#00FFA3]/40 hover:border-[#00FFA3] transition-colors">
                    <input
                      id="checkout-screenshot-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotFileChange}
                      className="w-full text-xs text-[#CCFBF1] file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#00FFA3] file:text-[#02140E] hover:file:bg-[#00E592] file:cursor-pointer cursor-pointer"
                    />
                    {paymentScreenshotUrl && (
                      <div className="mt-2 flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#07211B] border border-[#00FFA3]/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={paymentScreenshotUrl}
                            alt="Proof"
                            className="w-9 h-9 rounded object-cover border border-[#00FFA3]/60 shrink-0"
                          />
                          <span className="text-[11px] font-semibold text-[#00FFA3] truncate">
                            ✓ {paymentScreenshotName || 'Proof attached'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentScreenshotUrl('');
                            setPaymentScreenshotName('');
                          }}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="checkout-tx-ref"
                    className="block text-xs font-bold text-[#00FFA3] mb-1.5"
                  >
                    2. BEP-20 Transaction Hash (TxID)
                  </label>
                  <input
                    id="checkout-tx-ref"
                    data-testid="checkout-tx-ref-input"
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="0x... BEP-20 TxHash"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030F0C] border border-[#00FFA3]/30 text-xs font-mono font-bold text-white placeholder-teal-600 focus:outline-none focus:border-[#00FFA3]"
                  />
                  <input
                    id="checkout-notes"
                    type="text"
                    value={payerNotes}
                    onChange={(e) => setPayerNotes(e.target.value)}
                    placeholder="Optional sender note"
                    className="w-full mt-2 px-3.5 py-2 rounded-xl bg-[#030F0C] border border-[#00FFA3]/20 text-xs text-[#CCFBF1] placeholder-teal-600 focus:outline-none focus:border-[#00FFA3]"
                  />
                </div>
              </div>

              <button
                type="submit"
                data-testid="stripe-submit-pay-btn"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00E5A3] via-[#00FFA3] to-[#2DD4BF] hover:from-[#00FFA3] hover:to-[#5EEAD4] text-[#02140E] text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-[0_8px_28px_rgba(0,255,163,0.35)] transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[2.8]" />
                <span>
                  {submitting
                    ? 'Submitting Crypto Payment...'
                    : `Complete $${breakdown.finalAmountUsd.toFixed(2)} USDT (BEP-20) Purchase →`}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

