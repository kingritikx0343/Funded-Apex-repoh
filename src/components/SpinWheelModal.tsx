import React, { useState } from 'react';
import { X, Gift, Sparkles, Copy, Check, ArrowRight } from 'lucide-react';
import { usePlatform, type PageRoute } from '../context/PlatformContext';

interface SpinWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: PageRoute) => void;
}

export const SpinWheelModal: React.FC<SpinWheelModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { user, spinRewards, spinDailyWheel, userCoupons, navigate } = usePlatform();
  const [spinning, setSpinning] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [wonResult, setWonResult] = useState<{
    label: string;
    description: string;
    couponCode?: string;
  } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const canSpinToday = !user?.lastSpinDate || user.lastSpinDate !== todayStr;

  const handleNav = (page: PageRoute) => {
    navigate(page);
    if (onNavigate) onNavigate(page);
  };

  const handleSpin = () => {
    if (!user) {
      onClose();
      handleNav('login');
      return;
    }
    if (spinning || !canSpinToday) return;

    setSpinning(true);
    setWonResult(null);
    setStatusError(null);
    const nextRot = rotationDeg + 1440 + Math.floor(Math.random() * 360);
    setRotationDeg(nextRot);

    setTimeout(() => {
      const result = spinDailyWheel({ requireAuth: true });
      setSpinning(false);
      if (result.ok && result.reward) {
        setWonResult({
          label: result.reward.label,
          description: result.reward.description,
          couponCode: result.coupon?.code,
        });
      } else if (result.error) {
        setStatusError(result.error);
      }
    }, 2200);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/88 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#050806] border border-[#00E676]/28 shadow-[0_28px_90px_rgba(0,0,0,0.98),0_0_40px_rgba(0,230,118,0.14)] overflow-hidden p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#0E1510] border border-[#00E676]/30 flex items-center justify-center text-[#00E676]">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-extrabold text-white">
                FUNDED APEX — Daily Trader Rewards
              </h2>
              <p className="text-xs text-[#A7B1AA]">
                Spin once every 24 hours for evaluation discounts & free account vouchers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[8px] bg-[#090D0A] text-[#A7B1AA] hover:text-white border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Wheel */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-[#090D0A] border-4 border-[#00E676]/40 shadow-[0_0_45px_rgba(0,230,118,0.18)] flex items-center justify-center overflow-hidden">
            <div
              className="w-full h-full rounded-full transition-transform duration-[2200ms] ease-out flex items-center justify-center"
              style={{
                transform: `rotate(${rotationDeg}deg)`,
                background:
                  'conic-gradient(from 0deg, #090D0A 0deg 60deg, #0E1510 60deg 120deg, #090D0A 120deg 180deg, #131B15 180deg 240deg, #090D0A 240deg 300deg, #0E1510 300deg 360deg)',
              }}
            >
              {spinRewards.slice(0, 6).map((seg, i) => (
                <div
                  key={seg.id}
                  className="absolute text-[10px] font-mono font-extrabold text-[#00E676] tracking-wider"
                  style={{
                    transform: `rotate(${i * 60 + 30}deg) translateY(-76px)`,
                  }}
                >
                  {seg.label}
                </div>
              ))}
            </div>
            <div className="absolute w-14 h-14 rounded-full bg-[#00E676] text-[#000000] font-display font-extrabold text-xs flex items-center justify-center shadow-[0_0_24px_rgba(0,230,118,0.6)]">
              APEX
            </div>
          </div>
        </div>

        {wonResult && (
          <div className="p-4 rounded-xl bg-[#0E1510] border border-[#00E676]/40 space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#00E676]">
              <Sparkles className="w-4 h-4" />
              <span>REWARD UNLOCKED: {wonResult.label}</span>
            </div>
            <p className="text-xs text-[#A7B1AA]">{wonResult.description}</p>
            {wonResult.couponCode && (
              <div className="pt-1 flex items-center justify-center gap-2">
                <span className="px-3 py-1.5 rounded-[8px] bg-[#030504] border border-[#00E676]/30 font-mono text-xs font-bold text-white">
                  {wonResult.couponCode}
                </span>
                <button
                  onClick={() => copyCode(wonResult.couponCode!)}
                  className="px-3 py-1.5 rounded-[8px] bg-[#00E676] text-black text-xs font-bold inline-flex items-center gap-1"
                >
                  {copiedCode === wonResult.couponCode ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCode === wonResult.couponCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {statusError && (
          <div className="p-3 rounded-[9px] bg-[#FF5252]/10 border border-[#FF5252]/30 text-xs text-[#FF5252] text-center">
            {statusError}
          </div>
        )}

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleSpin}
            disabled={spinning || (Boolean(user) && !canSpinToday)}
            className="w-full btn-primary-gradient py-3 px-6 text-xs sm:text-sm font-extrabold disabled:opacity-50"
          >
            {!user
              ? 'Sign In to Spin Daily Wheel'
              : spinning
              ? 'Spinning Institutional Wheel...'
              : canSpinToday
              ? 'Spin Now for Reward'
              : 'Daily Spin Used — Come Back Tomorrow'}
          </button>
        </div>

        {/* Owned Unredeemed Coupons */}
        {userCoupons.filter((c) => !c.redeemed).length > 0 && (
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#77837B] flex items-center justify-between">
              <span>Your Active Reward Vouchers</span>
              <button
                onClick={() => {
                  onClose();
                  handleNav('challenges');
                }}
                className="text-[#00E676] hover:underline inline-flex items-center gap-1"
              >
                <span>Redeem at Checkout</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
              {userCoupons
                .filter((c) => !c.redeemed)
                .map((c) => (
                  <div
                    key={c.id}
                    className="px-3 py-2 rounded-[8px] bg-[#090D0A] border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#00E676]">{c.code}</span>
                      <span className="text-[#A7B1AA] ml-2">({c.label})</span>
                    </div>
                    <button
                      onClick={() => copyCode(c.code)}
                      className="text-[#A7B1AA] hover:text-white font-mono text-[11px]"
                    >
                      {copiedCode === c.code ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpinWheelModal;
