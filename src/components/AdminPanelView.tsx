import React, { useState } from 'react';
import { usePlatform, UserRole, PaymentGatewaySettings } from '../context/PlatformContext';
import { AccountStatus, ChallengeType } from '../engine/tradingEngine';
import { ACCOUNT_SIZES, ChallengeTemplate, COUNTRIES } from '../data/platformData';
import {
  Building2,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Key,
  Lock,
  Plus,
  ShieldCheck,
  Smartphone,
  TicketPercent,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

type AdminTab =
  | 'confirmations'
  | 'terminal_passwords'
  | 'payments'
  | 'coupons'
  | 'users'
  | 'accounts'
  | 'challenges'
  | 'payouts'
  | 'logs';

export const AdminPanelView: React.FC = () => {
  const {
    route,
    user,
    navigate,
    challenges,
    allUsers,
    allAccounts,
    payouts,
    adminLogs,
    adminCoupons,
    paymentSettings,
    purchaseRequests,
    emailNotifications,
    adminSaveChallenge,
    adminToggleArchiveChallenge,
    adminUpdateAccountStatus,
    adminUpdateAccountTerminalPassword,
    adminGenerateAllAccountPasscodes,
    adminUpdateUserRole,
    adminAddOrVerifyPayout,
    adminCreateUserAndAccount,
    adminResetUserPassword,
    adminDeleteUser,
    adminCreateCoupon,
    adminToggleCoupon,
    adminDeleteCoupon,
    adminSavePaymentSettings,
    adminApprovePurchaseRequest,
    adminRejectPurchaseRequest,
    adminAllocateAccountToUser,
  } = usePlatform();

  const [tab, setTab] = useState<AdminTab>(
    route === 'support' ? 'accounts' : 'confirmations'
  );

  // Manual Account Allocation State
  const [allocUserId, setAllocUserId] = useState<string>('');
  const [allocChallengeId, setAllocChallengeId] = useState<string>('two-step-50000');
  const [allocFeedback, setAllocFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(
    null
  );

  // Per-account Terminal User ID & Passcode Generator & Quick Editor State
  const [selectedPasscodeAccId, setSelectedPasscodeAccId] = useState<string>('');
  const [customUserIdInput, setCustomUserIdInput] = useState<string>('');
  const [customPasscodeInput, setCustomPasscodeInput] = useState<string>('');
  const [passcodeSavedNotice, setPasscodeSavedNotice] = useState<string | null>(null);

  // Coupon Creator State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponDiscountInput, setCouponDiscountInput] = useState<number>(20);
  const [couponDescInput, setCouponDescInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(
    null
  );

  // Payment Gateway Settings Form State
  const [payForm, setPayForm] = useState<PaymentGatewaySettings>(paymentSettings);
  const [paySavedMsg, setPaySavedMsg] = useState<string | null>(null);

  // User & Password Creation Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newUserIsAdmin, setNewUserIsAdmin] = useState<boolean>(false);
  const [newUserCountry, setNewUserCountry] = useState('India');
  const [newUserCreateAcc, setNewUserCreateAcc] = useState(true);
  const [newUserAccountSize, setNewUserAccountSize] = useState<number>(50000);
  const [newUserProgram, setNewUserProgram] = useState<ChallengeType>('two_step');
  const [newUserLeverage] = useState<number>(100);
  const [userCreationError, setUserCreationError] = useState<string | null>(null);
  const [userCreationSuccess, setUserCreationSuccess] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    accountNumber?: string;
    accountSize?: number;
    challengeTitle?: string;
    terminalPassword?: string;
  } | null>(null);

  // Password Reset Modal State
  const [resetTargetUser, setResetTargetUser] = useState<(typeof allUsers)[0] | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New / Edit Challenge Form State
  const [chTitle, setChTitle] = useState('$25,000 Two Step Challenge');
  const [chType, setChType] = useState<ChallengeType>('two_step');
  const [chSize, setChSize] = useState<number>(25000);
  const [chPrice, setChPrice] = useState<number>(79);
  const [chTarget, setChTarget] = useState<number>(8);
  const [chDailyDd, setChDailyDd] = useState<number>(5);
  const [chMaxDd, setChMaxDd] = useState<number>(10);
  const [chSplit, setChSplit] = useState<number>(90);
  const [chMinDays, setChMinDays] = useState<number>(3);
  const [chLeverage, setChLeverage] = useState<number>(100);
  const [chTerminalUserId, setChTerminalUserId] = useState('APEX-ID-2026');
  const [chTerminalPassword, setChTerminalPassword] = useState('APEX-2026');

  // Payout form state
  const [poTrader, setPoTrader] = useState('');
  const [poUser, setPoUser] = useState('');
  const [poAmount, setPoAmount] = useState<number>(4850);
  const [poCurrency, setPoCurrency] = useState('USD (USDC)');
  const [poSize, setPoSize] = useState<number>(100000);
  const [poProgram, setPoProgram] = useState('Two Step Challenge');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  if (!user || !['admin', 'super_admin', 'support'].includes(user.role)) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-[#00FFA3]" />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-white">
          Restricted Administrative Portal
        </h1>
        <p className="text-sm text-slate-300 max-w-md mx-auto">
          This area requires verified Administrator permissions. Please sign in with an authorized
          Admin account.
        </p>
        <button
          type="button"
          onClick={() => navigate(user ? 'dashboard' : 'login')}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg"
        >
          Return to Authorized Area
        </button>
      </main>
    );
  }

  const isFullAdmin = ['admin', 'super_admin'].includes(user.role);
  const pendingOrdersCount = purchaseRequests.filter((r) => r.status === 'pending').length;

  const handleManualAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    setAllocFeedback(null);
    const targetUid = allocUserId || allUsers[0]?.uid;
    if (!targetUid) {
      setAllocFeedback({ type: 'err', msg: 'Please select a registered user.' });
      return;
    }
    const res = adminAllocateAccountToUser({ targetUid, challengeId: allocChallengeId });
    if (!res.ok) {
      setAllocFeedback({ type: 'err', msg: res.error || 'Failed to allocate account.' });
    } else {
      setAllocFeedback({
        type: 'ok',
        msg: `Activated Account #${res.account?.accountNumber} ($${res.account?.startingBalance.toLocaleString()}) · Terminal Passcode: ${res.account?.terminalPassword || 'APEX-2026'}!`,
      });
    }
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFeedback(null);
    const res = adminCreateCoupon({
      code: couponCodeInput,
      discountPct: couponDiscountInput,
      description: couponDescInput,
    });
    if (!res.ok) {
      setCouponFeedback({ type: 'err', msg: res.error || 'Could not create coupon.' });
    } else {
      setCouponFeedback({
        type: 'ok',
        msg: `Coupon ${couponCodeInput.toUpperCase()} (${couponDiscountInput}% OFF) created!`,
      });
      setCouponCodeInput('');
      setCouponDescInput('');
    }
  };

  const handleQrFileUpload = (
    field: 'cryptoUsdtBep20Qr' | 'cryptoUsdtTrc20Qr' | 'cryptoBtcQr' | 'cryptoEthQr' | 'cryptoSolQr',
    file?: File
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const nextSettings = {
          ...payForm,
          [field]: reader.result,
          ...(field === 'cryptoUsdtBep20Qr' ? { cryptoUsdtTrc20Qr: reader.result } : {}),
        };
        setPayForm(nextSettings);
        adminSavePaymentSettings(nextSettings);
        setPaySavedMsg(`Uploaded USDT (BEP20) QR code image (${file.name}) and updated live checkout!`);
        setTimeout(() => setPaySavedMsg(null), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePaymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const syncedSettings = {
      ...payForm,
      cryptoUsdtTrc20: payForm.cryptoUsdtBep20,
      cryptoUsdtTrc20Qr: payForm.cryptoUsdtBep20Qr,
    };
    setPayForm(syncedSettings);
    adminSavePaymentSettings(syncedSettings);
    setPaySavedMsg('USDT (BEP20) payment details & Terminal Security Credentials saved and updated live!');
    setTimeout(() => setPaySavedMsg(null), 4000);
  };

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFullAdmin) return;
    const typeLabel =
      chType === 'instant'
        ? 'Instant Funding'
        : chType === 'one_step'
        ? 'One Step Challenge'
        : chType === 'two_step'
        ? 'Two Step Challenge'
        : 'Three Step Challenge';
    const existingMatch = challenges.find((c) => c.type === chType && c.accountSize === chSize);
    const newCh: ChallengeTemplate = {
      id: existingMatch ? existingMatch.id : `${chType.replace('_', '-')}-${chSize}`,
      title: chTitle,
      type: chType,
      typeLabel,
      accountSize: chSize,
      priceUsd: chPrice,
      startingBalance: chSize,
      profitTargetPct: chTarget,
      dailyDrawdownPct: chDailyDd,
      maxDrawdownPct: chMaxDd,
      minTradingDays: chMinDays,
      maxTradingDays: 0,
      leverage: chLeverage,
      profitSplitPct: chSplit,
      instruments: [
        'XAUUSD',
        'EURUSD',
        'GBPUSD',
        'USDJPY',
        'BTCUSD',
        'ETHUSD',
        'NAS100',
        'US30',
        'US500',
      ],
      status: 'available',
      expirationDays: 365,
      terminalUserId: chTerminalUserId.trim() || `APEX-ID-${Math.floor(1000 + Math.random() * 9000)}`,
      terminalPassword: chTerminalPassword.trim() || `APEX-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    adminSaveChallenge(newCh);
  };

  const handleAddVerifiedPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFullAdmin || !poTrader.trim()) return;
    adminAddOrVerifyPayout({
      id: `payout-${Date.now()}`,
      traderName: poTrader.trim(),
      username: poUser.trim() || `@${poTrader.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      amountUsd: poAmount,
      currency: poCurrency,
      status: 'Verified',
      paymentDate: new Date().toISOString().slice(0, 10),
      accountSize: poSize,
      programType: poProgram,
    });
    setPoTrader('');
    setPoUser('');
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ADMIN HEADER BAR WITH OFFICIAL LOGO */}
      <div className="apex-glass-card rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 mt-0.5">
              <div
                aria-hidden="true"
                className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#00FFA3]/40 via-[#06B6D4]/30 to-[#00FFA3]/40 blur-md pointer-events-none"
              />
              <img
                src="/assets/aistudio/IMG_20261108_140853_727c5a1e.png"
                alt="FUNDED APEX"
                className="relative z-10 w-full h-full object-contain rounded-full shadow-[0_0_16px_rgba(0,255,163,0.35)]"
              />
            </div>
            <div className="space-y-1.5">
              <div className="apex-kicker">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>FUNDED APEX EXECUTIVE GOVERNANCE · {user.role.toUpperCase()}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                {route === 'support'
                  ? 'Support Operations Desk'
                  : 'Institutional Administrator Control Center'}
              </h1>
              <p className="text-xs sm:text-sm text-[#94B8AA] max-w-2xl">
                Approve UPI, Bank Transfer, and Crypto evaluation orders, manually allocate accounts, create discount coupons, and manage trader &amp; admin access.
              </p>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="px-4 py-3.5 apex-metric-tile">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6EE7B7]">
                Pending Orders
              </div>
              <div className="font-mono text-2xl font-extrabold text-amber-300 mt-1">
                {pendingOrdersCount}
              </div>
            </div>
            <div className="px-4 py-3.5 apex-metric-tile">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6EE7B7]">
                Active Coupons
              </div>
              <div className="font-mono text-2xl font-extrabold text-[#00FFA3] mt-1">
                {adminCoupons.filter((c) => c.active).length}
              </div>
            </div>
            <div className="px-4 py-3.5 apex-metric-tile">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6EE7B7]">
                Total Accounts
              </div>
              <div className="font-mono text-2xl font-extrabold text-white mt-1">
                {allAccounts.length}
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/20">
          {isFullAdmin && (
            <button
              type="button"
              data-testid="admin-tab-confirmations"
              onClick={() => setTab('confirmations')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer flex items-center gap-2 ${
                tab === 'confirmations'
                  ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-extrabold shadow-[0_0_20px_rgba(0,255,163,0.3)]'
                  : 'bg-[#040D09] text-slate-300 hover:text-white border border-emerald-500/20'
              }`}
            >
              <span>Order Confirmations &amp; Manual Add</span>
              {pendingOrdersCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[#02120A] font-mono text-[10px] font-black">
                  {pendingOrdersCount}
                </span>
              )}
            </button>
          )}

          {isFullAdmin && (
            <button
              type="button"
              data-testid="admin-tab-terminal-passwords"
              onClick={() => setTab('terminal_passwords')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                tab === 'terminal_passwords'
                  ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-extrabold shadow-[0_0_20px_rgba(0,255,163,0.3)]'
                  : 'bg-[#040D09] text-slate-300 hover:text-white border border-emerald-500/20'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Terminal Passwords ({allAccounts.length})</span>
            </button>
          )}

          {isFullAdmin && (
            <button
              type="button"
              data-testid="admin-tab-payments"
              onClick={() => setTab('payments')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
                tab === 'payments'
                  ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-extrabold shadow-[0_0_20px_rgba(0,255,163,0.3)]'
                  : 'bg-[#040D09] text-slate-300 hover:text-white border border-emerald-500/20'
              }`}
            >
              Crypto &amp; Terminal Security
            </button>
          )}

          {isFullAdmin && (
            <button
              type="button"
              data-testid="admin-tab-coupons"
              onClick={() => setTab('coupons')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
                tab === 'coupons'
                  ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-extrabold shadow-[0_0_20px_rgba(0,255,163,0.3)]'
                  : 'bg-[#040D09] text-slate-300 hover:text-white border border-emerald-500/20'
              }`}
            >
              Coupon Codes ({adminCoupons.length})
            </button>
          )}

          {isFullAdmin && (
            <button
              type="button"
              data-testid="admin-tab-users"
              onClick={() => setTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
                tab === 'users'
                  ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-extrabold shadow-[0_0_20px_rgba(0,255,163,0.3)]'
                  : 'bg-[#040D09] text-slate-300 hover:text-white border border-emerald-500/20'
              }`}
            >
              Users &amp; Admin Role ({allUsers.length})
            </button>
          )}

          <button
            type="button"
            data-testid="admin-tab-accounts"
            onClick={() => setTab('accounts')}
            className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
              tab === 'accounts'
                ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-extrabold shadow-[0_0_20px_rgba(0,255,163,0.3)]'
                : 'bg-[#040D09] text-slate-300 hover:text-white border border-emerald-500/20'
            }`}
          >
            All Trading Accounts ({allAccounts.length})
          </button>

          {isFullAdmin && (
            <button
              type="button"
              onClick={() => setTab('challenges')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
                tab === 'challenges'
                  ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-extrabold shadow-[0_0_20px_rgba(0,255,163,0.3)]'
                  : 'bg-[#040D09] text-slate-300 hover:text-white border border-emerald-500/20'
              }`}
            >
              Programs ({challenges.length})
            </button>
          )}

          {isFullAdmin && (
            <button
              type="button"
              onClick={() => setTab('payouts')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
                tab === 'payouts'
                  ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-extrabold shadow-[0_0_20px_rgba(0,255,163,0.3)]'
                  : 'bg-[#040D09] text-slate-300 hover:text-white border border-emerald-500/20'
              }`}
            >
              Payouts ({payouts.length})
            </button>
          )}

          {isFullAdmin && (
            <button
              type="button"
              onClick={() => setTab('logs')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
                tab === 'logs'
                  ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-extrabold shadow-[0_0_20px_rgba(0,255,163,0.3)]'
                  : 'bg-[#040D09] text-slate-300 hover:text-white border border-emerald-500/20'
              }`}
            >
              Audit Logs ({adminLogs.length})
            </button>
          )}
        </div>
      </div>

      {/* DEDICATED TAB: PER-ACCOUNT TERMINAL PASSWORDS GENERATOR & MANAGER */}
      {tab === 'terminal_passwords' && isFullAdmin && (
        <section className="space-y-6 apex-fade-up">
          <div className="bg-[#06140E]/95 border border-emerald-500/35 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
              <div>
                <div className="text-xs font-mono font-extrabold text-[#00FFA3] uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4" />
                  <span>PER-ACCOUNT TERMINAL ACCESS CONTROL</span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white mt-1">
                  Account Terminal Passwords Generator &amp; Manager
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Every trading account has its own unique Terminal Passcode. Generate a new passcode for any account and copy it to share with the trader.
                </p>
              </div>

              <button
                type="button"
                data-testid="generate-all-terminal-passcodes-btn"
                onClick={() => {
                  adminGenerateAllAccountPasscodes();
                  setPasscodeSavedNotice(
                    'Generated unique Terminal User IDs (APEX-ID-XXXX) & Passwords (APEX-XXXX) for all accounts and dispatched Cloud Function emails from fundedapexsupport@gmail.com!'
                  );
                  setTimeout(() => setPasscodeSavedNotice(null), 5000);
                }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-[0_10px_25px_rgba(0,255,163,0.3)] shrink-0"
              >
                ↻ Generate All User IDs &amp; Passwords + Email Traders
              </button>
            </div>

            {passcodeSavedNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-xs font-bold text-[#00FFA3] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passcodeSavedNotice}</span>
              </div>
            )}

            {/* Quick Single-Account User ID & Passcode Generator Box */}
            <div className="p-5 rounded-2xl bg-[#030A07] border border-emerald-500/30 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  1. Select Trader Account
                </label>
                <select
                  value={selectedPasscodeAccId || allAccounts[0]?.id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedPasscodeAccId(id);
                    const found = allAccounts.find((a) => a.id === id);
                    if (found) {
                      setCustomUserIdInput(found.terminalUserId || '');
                      setCustomPasscodeInput(found.terminalPassword || '');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06140E] border border-emerald-500/35 text-xs font-mono text-white"
                >
                  {allAccounts.map((acc) => {
                    const owner = allUsers.find((u) => u.uid === acc.userId);
                    return (
                      <option key={acc.id} value={acc.id}>
                        #{acc.accountNumber} — {owner?.fullName || 'Trader'} ($
                        {acc.startingBalance.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    2. Terminal User ID
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomId = `APEX-ID-${Math.floor(1000 + Math.random() * 9000)}`;
                      setCustomUserIdInput(randomId);
                    }}
                    className="text-[11px] font-mono font-extrabold text-[#00FFA3] hover:text-white underline cursor-pointer"
                  >
                    + Generate ID
                  </button>
                </div>
                <input
                  type="text"
                  value={
                    customUserIdInput ||
                    allAccounts.find((a) => a.id === (selectedPasscodeAccId || allAccounts[0]?.id))
                      ?.terminalUserId ||
                    ''
                  }
                  onChange={(e) => setCustomUserIdInput(e.target.value.toUpperCase())}
                  placeholder="APEX-ID-4829"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs font-mono font-extrabold text-[#00FFA3]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    3. Terminal Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomCode = `APEX-${Math.floor(1000 + Math.random() * 9000)}`;
                      setCustomPasscodeInput(randomCode);
                    }}
                    className="text-[11px] font-mono font-extrabold text-[#00FFA3] hover:text-white underline cursor-pointer"
                  >
                    + Generate Pass
                  </button>
                </div>
                <input
                  type="text"
                  value={
                    customPasscodeInput ||
                    allAccounts.find((a) => a.id === (selectedPasscodeAccId || allAccounts[0]?.id))
                      ?.terminalPassword ||
                    ''
                  }
                  onChange={(e) => setCustomPasscodeInput(e.target.value.toUpperCase())}
                  placeholder="APEX-7391"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs font-mono font-extrabold text-[#00FFA3]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const targetId = selectedPasscodeAccId || allAccounts[0]?.id;
                  if (!targetId) return;
                  const targetAcc = allAccounts.find((a) => a.id === targetId);
                  const idToSave =
                    customUserIdInput.trim() ||
                    targetAcc?.terminalUserId ||
                    `APEX-ID-${Math.floor(1000 + Math.random() * 9000)}`;
                  const codeToSave =
                    customPasscodeInput.trim() ||
                    `APEX-${Math.floor(1000 + Math.random() * 9000)}`;
                  adminUpdateAccountTerminalPassword(targetId, codeToSave, idToSave);
                  setCustomUserIdInput(idToSave);
                  setCustomPasscodeInput(codeToSave);
                  setPasscodeSavedNotice(
                    `Saved ID "${idToSave}" & Password "${codeToSave}" for Account #${targetAcc?.accountNumber || ''} and emailed trader via Cloud Functions!`
                  );
                  setTimeout(() => setPasscodeSavedNotice(null), 5000);
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                Save &amp; Email Trader
              </button>
            </div>

            {/* Table of All Accounts with Individual Generate & Copy User ID + Passcode Controls */}
            <div className="overflow-x-auto border border-emerald-500/25 rounded-2xl bg-[#030A07]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-emerald-500/25 text-xs font-mono text-slate-400">
                    <th className="py-3.5 px-4">Account #</th>
                    <th className="py-3.5 px-4">Trader / Email</th>
                    <th className="py-3.5 px-4">Program &amp; Capital</th>
                    <th className="py-3.5 px-4 text-center">Terminal User ID</th>
                    <th className="py-3.5 px-4 text-center">Terminal Password</th>
                    <th className="py-3.5 px-4 text-right">Generate / Email / Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/15 text-xs">
                  {allAccounts.map((acc) => {
                    const owner = allUsers.find((u) => u.uid === acc.userId);
                    const currentUserId =
                      acc.terminalUserId || `APEX-ID-${acc.accountNumber.replace(/[^0-9]/g, '').slice(-4) || '1001'}`;
                    const currentPass =
                      acc.terminalPassword || `APEX-${acc.accountNumber.slice(-4)}`;
                    return (
                      <tr key={acc.id} className="hover:bg-emerald-500/5">
                        <td className="py-3.5 px-4 font-mono font-extrabold text-[#00FFA3]">
                          #{acc.accountNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{owner?.fullName || 'Trader'}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {owner?.email || acc.userId}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-200">{acc.challengeTitle}</div>
                          <div className="text-[11px] font-mono text-[#00FFA3]">
                            ${acc.startingBalance.toLocaleString()} USD · {acc.status.toUpperCase()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-center">
                          <input
                            type="text"
                            key={`${acc.id}-id-${currentUserId}`}
                            defaultValue={currentUserId}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== acc.terminalUserId) {
                                adminUpdateAccountTerminalPassword(acc.id, currentPass, val);
                              }
                            }}
                            className="w-36 px-3 py-1.5 rounded-xl bg-[#06140E] border border-[#00FFA3]/50 text-xs font-mono font-extrabold text-[#00FFA3] text-center focus:outline-none focus:border-[#00FFA3]"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-mono text-center">
                          <input
                            type="text"
                            key={`${acc.id}-pass-${currentPass}`}
                            defaultValue={currentPass}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== acc.terminalPassword) {
                                adminUpdateAccountTerminalPassword(acc.id, val, currentUserId);
                              }
                            }}
                            className="w-36 px-3 py-1.5 rounded-xl bg-[#06140E] border border-[#00FFA3]/50 text-xs font-mono font-extrabold text-[#00FFA3] text-center focus:outline-none focus:border-[#00FFA3]"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newId = `APEX-ID-${Math.floor(1000 + Math.random() * 9000)}`;
                                const newCode = `APEX-${Math.floor(1000 + Math.random() * 9000)}`;
                                adminUpdateAccountTerminalPassword(acc.id, newCode, newId);
                                setPasscodeSavedNotice(
                                  `Generated ID (${newId}) & Password (${newCode}) for #${acc.accountNumber} and emailed ${owner?.email || 'trader'}!`
                                );
                                setTimeout(() => setPasscodeSavedNotice(null), 4000);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-[#00FFA3] font-mono font-bold text-xs cursor-pointer"
                            >
                              ↻ Generate ID &amp; Pass + Email
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const credText = `FUNDED APEX (fundedapex.com) TERMINAL ACCESS\nTrader: ${owner?.fullName || 'Trader'} (${owner?.email || ''})\nAccount: #${acc.accountNumber} ($${acc.startingBalance.toLocaleString()})\nTerminal User ID: ${currentUserId}\nTerminal Password: ${currentPass}\nSupport: fundedapexsupport@gmail.com`;
                                navigator.clipboard?.writeText(credText);
                                setCopiedKey(`pass-${acc.id}`);
                                setTimeout(() => setCopiedKey(null), 2500);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#06140E] hover:bg-emerald-500/20 border border-emerald-500/35 text-white font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              {copiedKey === `pass-${acc.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[#00FFA3]" />
                                  <span className="text-[#00FFA3]">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[#00FFA3]" />
                                  <span>Copy Both</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Automated Firebase Cloud Functions Email Outbox Log */}
            <div className="p-5 rounded-2xl bg-[#030A07] border border-emerald-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
                <div>
                  <h3 className="font-display text-sm font-extrabold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00FFA3]" />
                    <span>Firebase Cloud Functions — Automated Terminal Credential Email Outbox</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Every time Admin generates or updates a Challenge / Account Terminal User ID or Password, an automated email is dispatched from <strong className="text-[#00FFA3] font-mono">fundedapexsupport@gmail.com</strong> (<strong className="text-white">fundedapex.com</strong>).
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-[11px] font-mono font-bold text-[#00FFA3]">
                  {emailNotifications.length} Dispatched Emails
                </span>
              </div>

              {emailNotifications.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center font-mono">
                  Click &quot;Generate ID &amp; Pass + Email&quot; above to trigger an automated Cloud Function email to the trader.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {emailNotifications.slice(0, 12).map((mail, i) => (
                    <div
                      key={`${mail.accountId}-${mail.createdAt}-${i}`}
                      className="p-3 rounded-xl bg-[#06140E] border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white">
                          To: <span className="text-[#00FFA3] font-mono">{mail.to}</span> ({mail.recipientName}) · From: <span className="font-mono text-slate-300">fundedapexsupport@gmail.com</span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {mail.subject} — <span className="text-slate-400">{mail.challengeTitle}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                        <span className="px-2 py-1 rounded bg-[#030A07] border border-emerald-500/30 text-[#00FFA3] font-bold">
                          ID: {mail.terminalUserId}
                        </span>
                        <span className="px-2 py-1 rounded bg-[#030A07] border border-emerald-500/30 text-[#00FFA3] font-bold">
                          Pass: {mail.terminalPassword}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 1: ORDER CONFIRMATIONS & MANUAL ACCOUNT ALLOCATION */}
      {tab === 'confirmations' && isFullAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 apex-fade-up">
          {/* Manual Account Allocation Form */}
          <form
            onSubmit={handleManualAllocate}
            className="bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl p-6 space-y-4 h-fit shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#00FFA3]" />
                <h2 className="font-display text-base font-extrabold text-white">
                  Manually Add Account to User
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-[#00FFA3] font-bold">
                Instant Activation
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Directly allocate and activate any evaluation or funded trading account for a
              registered trader without waiting for checkout.
            </p>

            {allocFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold border ${
                  allocFeedback.type === 'ok'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-[#00FFA3]'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                {allocFeedback.msg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Select Registered Trader
              </label>
              <select
                value={allocUserId || allUsers[0]?.uid || ''}
                onChange={(e) => setAllocUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white outline-none focus:border-[#00FFA3]"
              >
                {allUsers.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Select Evaluation / Funded Program
              </label>
              <select
                value={allocChallengeId}
                onChange={(e) => setAllocChallengeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white outline-none focus:border-[#00FFA3]"
              >
                {challenges.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.title} (${ch.accountSize.toLocaleString()} · {ch.typeLabel})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              data-testid="admin-manual-allocate-btn"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] hover:from-[#10B981] hover:to-[#00FFA3] text-[#02120A] font-display font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-[0_10px_25px_rgba(0,255,163,0.28)]"
            >
              + Manually Add &amp; Activate Account
            </button>
          </form>

          {/* Incoming Purchase Confirmation Requests List */}
          <div className="lg:col-span-2 bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-white">
                  Client Account Purchase Confirmations (UPI / Bank / Crypto)
                </h2>
                <p className="text-xs text-slate-400">
                  Verify the client&apos;s UTR / Bank Reference / Crypto TxHash and click Approve to
                  activate their trading account.
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#00FFA3] font-bold">
                {purchaseRequests.length} Total Orders
              </span>
            </div>

            {purchaseRequests.length === 0 ? (
              <div className="py-14 text-center space-y-2 border border-dashed border-emerald-500/25 rounded-2xl bg-[#030A07]/60">
                <CreditCard className="w-8 h-8 text-emerald-400/60 mx-auto" />
                <div className="text-sm font-display font-bold text-white">
                  No Purchase Requests Submitted Yet
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When a trader selects a challenge and submits payment via UPI, Bank Transfer, or
                  Crypto, their confirmation request will appear here for your approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {purchaseRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      req.status === 'pending'
                        ? 'bg-amber-500/10 border-amber-400/40'
                        : req.status === 'approved'
                        ? 'bg-emerald-500/10 border-emerald-500/35'
                        : 'bg-rose-500/10 border-rose-500/30 opacity-80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-[#00FFA3]">
                          #{req.orderNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#030A07] border border-emerald-500/30 text-[10px] font-mono font-bold text-white uppercase">
                          {req.paymentMethod.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            req.status === 'pending'
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                              : req.status === 'approved'
                              ? 'bg-emerald-500/20 text-[#00FFA3] border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      <div className="font-display text-sm font-extrabold text-white">
                        {req.challengeTitle} —{' '}
                        <span className="text-[#00FFA3] font-mono">
                          ${req.finalAmountUsd.toFixed(2)} USD
                        </span>
                        {req.couponCode && (
                          <span className="ml-2 text-[11px] font-mono text-emerald-300">
                            (Coupon: {req.couponCode} · -{req.discountPct}% OFF)
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          Trader: <strong className="text-white">{req.userFullName}</strong> (
                          {req.userEmail})
                        </span>
                        <span>
                          UTR / Ref / Hash:{' '}
                          <strong className="font-mono text-amber-300 bg-[#030A07] px-2 py-0.5 rounded">
                            {req.transactionRef}
                          </strong>
                        </span>
                      </div>

                      {req.paymentScreenshotUrl && (
                        <div className="pt-2 flex items-center gap-3">
                          <img
                            src={req.paymentScreenshotUrl}
                            alt="Uploaded Crypto Payment Proof"
                            className="w-16 h-16 rounded-xl object-cover border border-[#00FFA3]/50"
                          />
                          <span className="text-[11px] font-mono text-[#00FFA3] font-bold">
                            ✓ Direct Payment Screenshot Image Uploaded by Trader
                          </span>
                        </div>
                      )}
                    </div>

                    {req.status === 'pending' ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => adminApprovePurchaseRequest(req.id)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve &amp; Activate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => adminRejectPurchaseRequest(req.id)}
                          className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 font-display font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-right font-mono text-xs text-slate-400">
                        {req.status === 'approved' ? 'Account Activated' : 'Order Rejected'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CRYPTO GATEWAY (DIRECT QR IMAGE UPLOAD) & TERMINAL SECURITY */}
      {tab === 'payments' && isFullAdmin && (
        <form
          onSubmit={handleSavePaymentConfig}
          className="bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl apex-fade-up"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
            <div>
              <h2 className="font-display text-xl font-extrabold text-white">
                Crypto Gateway (Direct QR Image Upload) &amp; Terminal Security
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Configure wallet addresses, upload QR code images directly from your device (no URL links needed), and set master Terminal credentials.
              </p>
            </div>
            <button
              type="submit"
              data-testid="save-payment-settings-btn"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-[0_10px_25px_rgba(0,255,163,0.3)]"
            >
              Save Crypto &amp; Terminal Settings
            </button>
          </div>

          {paySavedMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-xs font-bold text-[#00FFA3] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{paySavedMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. USDT (BEP20) Crypto Wallet & Direct QR Image File Upload */}
            <div className="p-5 rounded-2xl bg-[#030A07]/90 border border-emerald-500/25 space-y-4">
              <div className="flex items-center justify-between gap-2.5 text-[#00FFA3] border-b border-emerald-500/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <Coins className="w-5 h-5" />
                  <h3 className="font-display text-base font-extrabold text-white">
                    1. Official USDT (BEP20 · BNB Smart Chain) Deposit Wallet &amp; QR Code
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#00FFA3]/15 border border-[#00FFA3]/40 text-[10px] font-mono font-extrabold text-[#00FFA3] uppercase">
                  BEP20 Only
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  USDT (BEP-20 BNB Smart Chain) Deposit Wallet Address
                </label>
                <input
                  type="text"
                  required
                  value={payForm.cryptoUsdtBep20}
                  onChange={(e) =>
                    setPayForm({
                      ...payForm,
                      cryptoUsdtBep20: e.target.value,
                      cryptoUsdtTrc20: e.target.value,
                    })
                  }
                  placeholder="0x..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs font-mono font-bold text-[#00FFA3] focus:border-[#00FFA3] outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#06140E] border border-emerald-500/35 space-y-3">
                <label className="block text-xs font-bold text-[#00FFA3]">
                  USDT (BEP-20) QR Code Image — Direct File Upload
                </label>
                <div className="flex items-center gap-3.5">
                  {payForm.cryptoUsdtBep20Qr && (
                    <img
                      src={payForm.cryptoUsdtBep20Qr}
                      alt="USDT BEP20 QR Preview"
                      className="w-16 h-16 rounded-xl bg-white p-1.5 object-contain border border-[#00FFA3]/50 shrink-0 shadow-[0_0_15px_rgba(0,255,163,0.25)]"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleQrFileUpload('cryptoUsdtBep20Qr', e.target.files?.[0])}
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-[#00FFA3] file:text-[#030A07] file:cursor-pointer cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  USDT (BEP-20) Transfer Checkout Note
                </label>
                <input
                  type="text"
                  value={payForm.cryptoNetworkNote}
                  onChange={(e) => setPayForm({ ...payForm, cryptoNetworkNote: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#06140E] border border-emerald-500/35 text-xs text-white"
                />
              </div>
            </div>

            {/* 2. Master Terminal User ID & Passcode Settings */}
            <div className="p-5 rounded-2xl bg-[#030A07]/90 border border-emerald-500/25 space-y-4">
              <div className="flex items-center gap-2.5 text-[#00FFA3] border-b border-emerald-500/15 pb-3">
                <Lock className="w-5 h-5 text-[#00FFA3]" />
                <h3 className="font-display text-base font-extrabold text-white">
                  2. Master Trading Terminal User ID &amp; Password
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Configure the fallback Master Terminal User ID and Password for live Trading Terminal (`/terminal`) access. Individual trader account User IDs and Passwords can be generated in the <strong className="text-[#00FFA3]">Terminal Passwords</strong> tab.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Master Terminal User ID
                </label>
                <input
                  type="text"
                  required
                  value={payForm.terminalUserId || 'APEX-MASTER'}
                  onChange={(e) => setPayForm({ ...payForm, terminalUserId: e.target.value })}
                  placeholder="APEX-MASTER"
                  className="w-full px-4 py-3 rounded-xl bg-[#06140E] border border-emerald-500/40 text-sm font-mono font-bold text-[#00FFA3] focus:border-[#00FFA3] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Master Terminal Password
                </label>
                <input
                  type="text"
                  required
                  value={payForm.terminalPassword || 'APEX2026'}
                  onChange={(e) => setPayForm({ ...payForm, terminalPassword: e.target.value })}
                  placeholder="APEX2026"
                  className="w-full px-4 py-3 rounded-xl bg-[#06140E] border border-emerald-500/40 text-sm font-mono font-bold text-[#00FFA3] focus:border-[#00FFA3] outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-300 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00FFA3]" />
                  <span>Automated Email Notification Active</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Official Support &amp; Cloud Function Sender: <strong className="text-[#00FFA3] font-mono">fundedapexsupport@gmail.com</strong> (<strong className="text-white">fundedapex.com</strong>).
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: ACCOUNT COUPON CODE CREATOR & MANAGER */}
      {tab === 'coupons' && isFullAdmin && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-7 apex-fade-up">
          <form
            onSubmit={handleCreateCoupon}
            className="bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl p-6 space-y-4 h-fit shadow-xl"
          >
            <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-3">
              <TicketPercent className="w-5 h-5 text-[#00FFA3]" />
              <h2 className="font-display text-base font-extrabold text-white">
                Create Account Discount Coupon
              </h2>
            </div>

            {couponFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold border ${
                  couponFeedback.type === 'ok'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-[#00FFA3]'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                {couponFeedback.msg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Coupon Code (e.g., APEX30, VIP50, FREE100)
              </label>
              <input
                type="text"
                required
                placeholder="APEX30"
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono font-bold text-[#00FFA3] uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Discount Percentage (1% to 100%)
              </label>
              <input
                type="number"
                required
                min={1}
                max={100}
                value={couponDiscountInput}
                onChange={(e) => setCouponDiscountInput(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono font-bold text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Description / Campaign Label
              </label>
              <input
                type="text"
                placeholder="30% Off All Two-Step Evaluations"
                value={couponDescInput}
                onChange={(e) => setCouponDescInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              data-testid="admin-create-coupon-btn"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg"
            >
              + Create Coupon Code
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="font-display text-lg font-extrabold text-white border-b border-emerald-500/20 pb-3">
              Active &amp; Configured Checkout Coupon Codes
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {adminCoupons.map((cp) => (
                <div
                  key={cp.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                    cp.active
                      ? 'bg-[#030A07] border-emerald-500/35'
                      : 'bg-[#030A07]/50 border-white/10 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-[#00FFA3] bg-emerald-500/15 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                        {cp.code}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-white">
                        {cp.discountPct}% OFF
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{cp.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adminToggleCoupon(cp.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border ${
                        cp.active
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-[#00FFA3]'
                          : 'bg-white/5 border-white/15 text-slate-300'
                      }`}
                    >
                      {cp.active ? 'Active' : 'Paused'}
                    </button>
                    <button
                      type="button"
                      onClick={() => adminDeleteCoupon(cp.id)}
                      className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 cursor-pointer"
                      title="Delete Coupon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: USERS & DIRECT ADMIN ACCESS TOGGLE (YES / NO) */}
      {tab === 'users' && isFullAdmin && (
        <div className="space-y-8 apex-fade-up">
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-7">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setUserCreationError(null);
                setUserCreationSuccess(null);
                const roleToAssign: UserRole = newUserIsAdmin ? 'admin' : 'user';
                const res = adminCreateUserAndAccount({
                  fullName: newUserName,
                  email: newUserEmail,
                  password: newUserPassword,
                  role: roleToAssign,
                  country: newUserCountry,
                  createAccount: newUserCreateAcc,
                  accountSize: newUserAccountSize,
                  challengeType: newUserProgram,
                  leverage: newUserLeverage,
                });
                if (!res.ok) {
                  setUserCreationError(res.error || 'Failed to create user credentials.');
                } else {
                  setUserCreationSuccess(`Successfully created credentials for ${res.user?.email}!`);
                  setCreatedCredentials({
                    name: res.user?.fullName || newUserName,
                    email: res.user?.email || newUserEmail,
                    password: res.plainPassword || newUserPassword,
                    accountNumber: res.account?.accountNumber,
                    accountSize: res.account?.startingBalance,
                    challengeTitle: res.account?.challengeTitle,
                    terminalPassword: res.account?.terminalPassword,
                  });
                  setNewUserName('');
                  setNewUserEmail('');
                  setNewUserPassword('');
                }
              }}
              className="bg-[#06140E]/95 border border-emerald-500/35 rounded-3xl p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#00FFA3]" />
                  <h2 className="font-display text-base font-extrabold text-white">
                    Create User Login &amp; Password
                  </h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#030A07] border border-emerald-500/30 text-[#00FFA3]">
                  Manual Provision
                </span>
              </div>

              {userCreationError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs font-bold text-rose-300">
                  {userCreationError}
                </div>
              )}
              {userCreationSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-bold text-[#00FFA3]">
                  {userCreationSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Trader Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Login Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="trader@fundedapex.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">Login Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = generateRandomPassword();
                      setNewUserPassword(gen);
                      setShowPassword(true);
                    }}
                    className="text-[11px] font-bold text-[#00FFA3] hover:text-white underline cursor-pointer"
                  >
                    Generate Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter or generate password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Direct Make Admin YES / NO Selector */}
              <div className="p-3.5 rounded-2xl bg-[#030A07] border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-display font-bold text-white">
                    Make User Administrator?
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Grant full Admin Panel access to this user
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-[#06140E] p-1 rounded-xl border border-emerald-500/25">
                  <button
                    type="button"
                    onClick={() => setNewUserIsAdmin(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-extrabold cursor-pointer transition-all ${
                      newUserIsAdmin
                        ? 'bg-[#00FFA3] text-[#02120A]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserIsAdmin(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-extrabold cursor-pointer transition-all ${
                      !newUserIsAdmin
                        ? 'bg-emerald-500/25 text-[#00FFA3] border border-emerald-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Country</label>
                <select
                  value={newUserCountry}
                  onChange={(e) => setNewUserCountry(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-emerald-500/20 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserCreateAcc}
                    onChange={(e) => setNewUserCreateAcc(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00FFA3] bg-[#030A07] border-emerald-500/40"
                  />
                  <span className="text-xs font-bold text-white">
                    Allocate Initial Trading Account Immediately
                  </span>
                </label>

                {newUserCreateAcc && (
                  <div className="grid grid-cols-2 gap-2 pl-6 border-l-2 border-emerald-500/30">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Account Size</label>
                      <select
                        value={newUserAccountSize}
                        onChange={(e) => setNewUserAccountSize(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
                      >
                        <option value={3000}>$3,000 (Micro)</option>
                        {ACCOUNT_SIZES.map((s) => (
                          <option key={s} value={s}>
                            ${s.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Program</label>
                      <select
                        value={newUserProgram}
                        onChange={(e) => setNewUserProgram(e.target.value as ChallengeType)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#030A07] border border-emerald-500/35 text-xs text-white"
                      >
                        <option value="two_step">Two Step Challenge</option>
                        <option value="one_step">One Step Challenge</option>
                        <option value="instant">Instant Funding</option>
                        <option value="three_step">Three Step Challenge</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg"
              >
                Create User &amp; Issue Credentials
              </button>
            </form>

            {/* Credentials Handover Panel */}
            <div className="lg:col-span-2 bg-[#06140E]/95 border border-emerald-500/35 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl">
              {createdCredentials ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2 text-[#00FFA3]">
                      <Key className="w-5 h-5" />
                      <h3 className="font-display text-base font-extrabold text-white">
                        Trader Credentials Generated &amp; Active
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-[#00FFA3] bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                      Ready for Client Login
                    </span>
                  </div>

                  <div className="bg-[#030A07] border border-emerald-500/35 rounded-2xl p-4 font-mono text-xs space-y-2">
                    <div className="flex justify-between items-center py-1 border-b border-emerald-500/15">
                      <span className="text-slate-400">Trader Name:</span>
                      <span className="font-bold text-white">{createdCredentials.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-emerald-500/15">
                      <span className="text-slate-400">Login Email:</span>
                      <span className="font-bold text-[#00FFA3]">{createdCredentials.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-emerald-500/15">
                      <span className="text-slate-400">Login Password:</span>
                      <span className="font-bold text-[#00FFA3] bg-emerald-500/15 px-2 py-0.5 rounded">
                        {createdCredentials.password}
                      </span>
                    </div>
                    {createdCredentials.accountNumber && (
                      <div className="flex justify-between items-center py-1 border-b border-emerald-500/15">
                        <span className="text-slate-400">Allocated Account:</span>
                        <span className="font-bold text-white">
                          #{createdCredentials.accountNumber} ($
                          {createdCredentials.accountSize?.toLocaleString()} ·{' '}
                          {createdCredentials.challengeTitle})
                        </span>
                      </div>
                    )}
                    {createdCredentials.terminalPassword && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400">Terminal Passcode:</span>
                        <span className="font-bold text-[#00FFA3] bg-emerald-500/15 px-2 py-0.5 rounded">
                          {createdCredentials.terminalPassword}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const txt = `FUNDED APEX LOGIN CREDENTIALS\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nAccount: #${createdCredentials.accountNumber || 'Active'}\nTerminal Passcode: ${createdCredentials.terminalPassword || 'APEX-2026'}`;
                      navigator.clipboard.writeText(txt);
                      setCopiedKey('credentials');
                      setTimeout(() => setCopiedKey(null), 3000);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === 'credentials' ? (
                      <>
                        <Check className="w-4 h-4 text-[#00FFA3]" />
                        <span className="text-[#00FFA3]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#00FFA3]" />
                        <span>Copy Login Credentials</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#00FFA3]">
                    <Users className="w-5 h-5" />
                    <h3 className="font-display text-lg font-extrabold text-white">
                      User &amp; Admin Role Governance
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Below you can view every registered trader, toggle whether they have{' '}
                    <strong className="text-[#00FFA3]">Admin Access (YES / NO)</strong> with a
                    single click, reset their password, or manually allocate trading accounts.
                  </p>
                </div>
              )}

              {/* Registered Users Table with Direct ADMIN: YES / NO Toggle */}
              <div className="overflow-x-auto border border-emerald-500/25 rounded-2xl bg-[#030A07]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-500/20 text-[11px] font-mono uppercase text-slate-400">
                      <th className="py-3 px-4">User / Email</th>
                      <th className="py-3 px-4">Password</th>
                      <th className="py-3 px-4 text-center">Admin Access (YES / NO)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/15 text-xs">
                    {allUsers.map((u) => {
                      const isUserAdmin = u.role === 'admin' || u.role === 'super_admin';
                      return (
                        <tr key={u.uid} className="hover:bg-emerald-500/5">
                          <td className="py-3 px-4">
                            <div className="font-display font-bold text-white">{u.fullName}</div>
                            <div className="font-mono text-[11px] text-[#00FFA3]">{u.email}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-300">
                            {u.passwordHash ? 'Verified Hash' : '••••••••'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-[#06140E] p-1 rounded-xl border border-emerald-500/30">
                              <button
                                type="button"
                                data-testid={`make-admin-yes-${u.uid}`}
                                onClick={() => adminUpdateUserRole(u.uid, 'admin')}
                                className={`px-3 py-1 rounded-lg font-mono text-[11px] font-extrabold transition-all cursor-pointer ${
                                  isUserAdmin
                                    ? 'bg-[#00FFA3] text-[#02120A] shadow-[0_0_12px_rgba(0,255,163,0.4)]'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                Admin: YES
                              </button>
                              <button
                                type="button"
                                data-testid={`make-admin-no-${u.uid}`}
                                onClick={() => adminUpdateUserRole(u.uid, 'user')}
                                className={`px-3 py-1 rounded-lg font-mono text-[11px] font-extrabold transition-all cursor-pointer ${
                                  !isUserAdmin
                                    ? 'bg-emerald-500/20 text-white border border-emerald-500/40'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                NO (Trader)
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setResetTargetUser(u);
                                  setResetPasswordInput('');
                                  setResetPasswordError(null);
                                  setResetPasswordSuccess(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#06140E] border border-emerald-500/30 text-[#00FFA3] text-[11px] font-bold cursor-pointer"
                              >
                                Password
                              </button>
                              {u.uid !== user.uid && (
                                <button
                                  type="button"
                                  onClick={() => adminDeleteUser(u.uid)}
                                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* PASSWORD RESET MODAL */}
          {resetTargetUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#06140E] border border-emerald-500/45 rounded-3xl p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <h3 className="font-display text-base font-extrabold text-white">
                    Update Password for {resetTargetUser.fullName}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setResetTargetUser(null)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {resetPasswordError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 font-bold">
                    {resetPasswordError}
                  </div>
                )}
                {resetPasswordSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-[#00FFA3] font-bold">
                    {resetPasswordSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    New Login Password
                  </label>
                  <input
                    type="text"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/40 text-xs font-mono text-white"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const res = adminResetUserPassword(resetTargetUser.uid, resetPasswordInput);
                      if (!res.ok) {
                        setResetPasswordError(res.error || 'Failed to reset password.');
                      } else {
                        setResetPasswordSuccess('Password updated!');
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs cursor-pointer"
                  >
                    Save Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ALL TRADING ACCOUNTS STATUS MANAGEMENT */}
      {tab === 'accounts' && (
        <section className="bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl p-6 space-y-4 shadow-xl apex-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
            <div>
              <h2 className="font-display text-lg font-extrabold text-white">
                All Trader Accounts &amp; Evaluation Status
              </h2>
              <p className="text-xs text-slate-400">
                Inspect real-time balances, equity, and promote or breach accounts.
              </p>
            </div>
            <span className="text-xs font-mono text-[#00FFA3] font-bold">
              {allAccounts.length} Total Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-emerald-500/25 text-xs font-mono text-slate-400">
                  <th className="py-3.5 px-4">Account #</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Program</th>
                  <th className="py-3.5 px-4 font-mono text-center">Terminal Passcode</th>
                  <th className="py-3.5 px-4 text-right">Starting</th>
                  <th className="py-3.5 px-4 text-right">Balance / Equity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Change Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/15 text-xs">
                {allAccounts.map((acc) => {
                  const owner = allUsers.find((u) => u.uid === acc.userId);
                  const currentPass = acc.terminalPassword || `APEX-${acc.accountNumber.slice(-4)}`;
                  return (
                    <tr key={acc.id} className="hover:bg-emerald-500/5">
                      <td className="py-3 px-4 font-mono font-bold text-[#00FFA3]">
                        #{acc.accountNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{owner?.fullName || 'Trader'}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {owner?.email || acc.userId}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-200">{acc.challengeTitle}</td>
                      <td className="py-3 px-4 font-mono text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="text"
                            defaultValue={currentPass}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== acc.terminalPassword) {
                                adminUpdateAccountTerminalPassword(acc.id, val);
                              }
                            }}
                            className="w-28 px-2 py-1 rounded-lg bg-[#030A07] border border-emerald-500/40 text-xs font-mono font-bold text-[#00FFA3] text-center focus:outline-none focus:border-[#00FFA3]"
                          />
                          <button
                            type="button"
                            title="Generate new passcode"
                            onClick={() => {
                              const gen = `APEX-${Math.floor(1000 + Math.random() * 9000)}`;
                              adminUpdateAccountTerminalPassword(acc.id, gen);
                            }}
                            className="p-1 rounded-lg bg-emerald-500/20 text-[#00FFA3] hover:bg-emerald-500/40 text-[11px] font-bold cursor-pointer"
                          >
                            ↻
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-slate-300">
                        ${acc.startingBalance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-right font-bold text-white">
                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} / $
                        {acc.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-[#00FFA3] border border-emerald-500/30">
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          aria-label={`Account Status ${acc.accountNumber}`}
                          value={acc.status}
                          onChange={(e) =>
                            adminUpdateAccountStatus(acc.id, e.target.value as AccountStatus)
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
                        >
                          <option value="active">ACTIVE</option>
                          <option value="passed">PASSED (FUNDED)</option>
                          <option value="failed">FAILED (BREACHED)</option>
                          <option value="disabled">DISABLED</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 6: CHALLENGE CONFIGURATION */}
      {tab === 'challenges' && isFullAdmin && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-7 apex-fade-up">
          <form
            onSubmit={handleCreateChallenge}
            className="bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl p-6 space-y-4 h-fit"
          >
            <h2 className="font-display text-base font-extrabold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00FFA3]" />
              <span>Configure Trading Program</span>
            </h2>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Program Title</label>
              <input
                type="text"
                required
                value={chTitle}
                onChange={(e) => setChTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Program Type</label>
                <select
                  value={chType}
                  onChange={(e) => setChType(e.target.value as ChallengeType)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white"
                >
                  <option value="instant">Instant Funding</option>
                  <option value="one_step">One Step Challenge</option>
                  <option value="two_step">Two Step Challenge</option>
                  <option value="three_step">Three Step Challenge</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Account Size ($)</label>
                <select
                  value={chSize}
                  onChange={(e) => setChSize(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
                >
                  {ACCOUNT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      ${s.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Challenge Price ($)</label>
                <input
                  type="number"
                  min={1}
                  value={chPrice}
                  onChange={(e) => setChPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Profit Split %</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={chSplit}
                  onChange={(e) => setChSplit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Profit %</label>
                <input
                  type="number"
                  value={chTarget}
                  onChange={(e) => setChTarget(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Daily DD %</label>
                <input
                  type="number"
                  value={chDailyDd}
                  onChange={(e) => setChDailyDd(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Max DD %</label>
                <input
                  type="number"
                  value={chMaxDd}
                  onChange={(e) => setChMaxDd(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Terminal User ID</label>
                <input
                  type="text"
                  placeholder="e.g. APEX-ID-5000"
                  value={chTerminalUserId}
                  onChange={(e) => setChTerminalUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-[#00FFA3] font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Terminal Password</label>
                <input
                  type="text"
                  placeholder="e.g. APEX-5000"
                  value={chTerminalPassword}
                  onChange={(e) => setChTerminalPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-[#00FFA3] font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs cursor-pointer"
            >
              Save Program &amp; Email Credentials
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl overflow-x-auto p-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-emerald-500/25 text-xs text-slate-400">
                  <th className="py-3 px-4">Program Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Size</th>
                  <th className="py-3 px-4 text-right">Fee</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/15 text-xs">
                {challenges.map((c) => (
                  <tr key={c.id} className="hover:bg-emerald-500/5">
                    <td className="py-3 px-4 font-bold text-white">{c.title}</td>
                    <td className="py-3 px-4 text-slate-300">{c.typeLabel}</td>
                    <td className="py-3 px-4 font-mono text-right text-[#00FFA3]">
                      ${c.accountSize.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-right text-white">
                      ${c.priceUsd}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[#00FFA3] font-bold uppercase">{c.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => adminToggleArchiveChallenge(c.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#030A07] border border-emerald-500/35 text-white cursor-pointer"
                      >
                        {c.status === 'available' ? 'Archive' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 7: VERIFIED PAYOUTS MANAGEMENT */}
      {tab === 'payouts' && isFullAdmin && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-7 apex-fade-up">
          <form
            onSubmit={handleAddVerifiedPayout}
            className="bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl p-6 space-y-4 h-fit"
          >
            <h2 className="font-display text-base font-extrabold text-white">
              Verify &amp; Publish Trader Payout
            </h2>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Trader Full Name</label>
              <input
                type="text"
                required
                value={poTrader}
                onChange={(e) => setPoTrader(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Trader Username</label>
              <input
                type="text"
                value={poUser}
                onChange={(e) => setPoUser(e.target.value)}
                placeholder="@alex_fx"
                className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Payout Amount ($)</label>
                <input
                  type="number"
                  min={50}
                  value={poAmount}
                  onChange={(e) => setPoAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Currency</label>
                <select
                  value={poCurrency}
                  onChange={(e) => setPoCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white"
                >
                  <option value="USD (USDC)">USD (USDC)</option>
                  <option value="USD (USDT)">USD (USDT)</option>
                  <option value="USD (Wire)">USD (Wire)</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs cursor-pointer"
            >
              Verify &amp; Publish Payout
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl overflow-x-auto p-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-emerald-500/25 text-xs text-slate-400">
                  <th className="py-3 px-4">Trader</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/15 text-xs">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-emerald-500/5">
                    <td className="py-3 px-4 font-bold text-white">{p.traderName}</td>
                    <td className="py-3 px-4 font-mono text-[#00FFA3]">{p.username}</td>
                    <td className="py-3 px-4 font-mono font-extrabold text-right text-white">
                      ${p.amountUsd.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{p.currency}</td>
                    <td className="py-3 px-4 font-bold text-[#00FFA3]">{p.status}</td>
                    <td className="py-3 px-4 font-mono text-right text-slate-400">
                      {p.paymentDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 8: AUDIT LOGS */}
      {tab === 'logs' && isFullAdmin && (
        <section className="bg-[#06140E]/95 border border-emerald-500/30 rounded-3xl p-6 space-y-4 shadow-xl apex-fade-up">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <h2 className="font-display text-lg font-extrabold text-white">
              Immutable Administrative Audit Trail
            </h2>
            <UserCheck className="w-5 h-5 text-[#00FFA3]" />
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {adminLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-[#030A07] border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-[#00FFA3] mr-2">[{log.action}]</span>
                  <span className="text-white">{log.details}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-400 shrink-0">
                  {log.adminEmail} · {new Date(log.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};
