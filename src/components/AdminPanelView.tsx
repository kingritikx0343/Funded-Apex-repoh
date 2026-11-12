import React, { useState, useMemo } from 'react';
import { usePlatform, UserRole, PaymentGatewaySettings } from '../context/PlatformContext';
import { AccountStatus, ChallengeType } from '../engine/tradingEngine';
import { ACCOUNT_SIZES, ChallengeTemplate, COUNTRIES } from '../data/platformData';
import { buildCustomManualEmailPayload } from '../engine/cloudFunctionsEmail';
import { FundedApexLogo } from './FundedApexLogo';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck,
  Globe,
  HelpCircle,
  Key,
  LayoutDashboard,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Settings,
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
  | 'emails'
  | 'media'
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
    adminBroadcastPromotionalEmail,
    adminSendEmailNotification,
    adminSendManualEmail,
    refreshVaultData,
  } = usePlatform();

  const [tab, setTab] = useState<AdminTab>('confirmations');
  const [isRefreshingOrders, setIsRefreshingOrders] = useState<boolean>(false);

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

  // Admin Email & Promo Broadcast State
  const [emailTypeInput, setEmailTypeInput] = useState<
    'promotional_offer' | 'registration_welcome' | 'password_reset' | 'challenge_status_update' | 'terminal_credentials'
  >('promotional_offer');
  const [emailRecipientInput, setEmailRecipientInput] = useState<string>('all@fundedapex.com');
  const [emailRecipientNameInput, setEmailRecipientNameInput] = useState<string>('FUNDED APEX Traders');
  const [emailChallengeStatusInput, setEmailChallengeStatusInput] = useState<'passed' | 'failed' | 'suspended' | 'active'>('passed');
  const [emailPromoCodeInput, setEmailPromoCodeInput] = useState<string>('5K30OFF');
  const [emailDiscountInput, setEmailDiscountInput] = useState<number>(30);
  const [emailStatusReasonInput, setEmailStatusReasonInput] = useState<string>('');
  const [emailPreviewId, setEmailPreviewId] = useState<string>('');
  const [emailDispatchFeedback, setEmailDispatchFeedback] = useState<string | null>(null);

  // Dedicated Manual Professional Email Composer State
  const [emailSubTab, setEmailSubTab] = useState<'manual' | 'presets'>('manual');
  const [manualRecipientType, setManualRecipientType] = useState<'select_user' | 'broadcast_all' | 'custom'>('select_user');
  const [manualSelectedUid, setManualSelectedUid] = useState<string>('');
  const [manualRecipientEmail, setManualRecipientEmail] = useState<string>('');
  const [manualRecipientName, setManualRecipientName] = useState<string>('');
  const [manualSubject, setManualSubject] = useState<string>(
    '[FUNDED APEX] Priority Notice: Your Trading Account Status Update'
  );
  const [manualHeadline, setManualHeadline] = useState<string>(
    'Official Notice Regarding Your Trading Account'
  );
  const [manualSubheadline, setManualSubheadline] = useState<string>(
    'Official Institutional Dispatch from the FUNDED APEX Operations & Risk Desk'
  );
  const [manualBadgeText, setManualBadgeText] = useState<string>('OFFICIAL NOTICE');
  const [manualBadgeColor, setManualBadgeColor] = useState<string>('#00FFA3');
  const [manualBody, setManualBody] = useState<string>(
    `We are writing to provide you with an important update regarding your FUNDED APEX evaluation account and trading activity.\n\nOur risk management desk has reviewed your telemetry and verified that your performance aligns with our institutional standards. Please review the details below and ensure all parameters remain within our drawdown thresholds.\n\nIf you have any questions or require dedicated assistance, please reply directly to this notification.`
  );
  const [manualCtaLabel, setManualCtaLabel] = useState<string>('Launch Trading Terminal →');
  const [manualCtaUrl, setManualCtaUrl] = useState<string>('https://fundedapex.com/?page=terminal');
  const [manualCtaColor, setManualCtaColor] = useState<string>('#00FFA3');
  const [manualHighlight1Label, setManualHighlight1Label] = useState<string>('ACCOUNT NUMBER');
  const [manualHighlight1Value, setManualHighlight1Value] = useState<string>('FA-882410');
  const [manualHighlight2Label, setManualHighlight2Label] = useState<string>('EVALUATION STATUS');
  const [manualHighlight2Value, setManualHighlight2Value] = useState<string>('ACTIVE / VERIFIED');
  const [manualHighlight3Label, setManualHighlight3Label] = useState<string>('MAX DRAWDOWN LIMIT');
  const [manualHighlight3Value, setManualHighlight3Value] = useState<string>('10% ($5,000.00)');
  const [includeHighlights, setIncludeHighlights] = useState<boolean>(true);
  const [manualSending, setManualSending] = useState<boolean>(false);
  const [manualFeedback, setManualFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Dynamically compute institutional live preview payload as admin edits
  const livePreviewPayload = useMemo(() => {
    return buildCustomManualEmailPayload({
      recipientEmail: manualRecipientEmail || 'trader@fundedapex.com',
      recipientName: manualRecipientName || 'Valued Trader',
      subject: manualSubject,
      headline: manualHeadline,
      subheadline: manualSubheadline,
      badgeText: manualBadgeText,
      badgeColorHex: manualBadgeColor,
      bodyTextOrHtml: manualBody,
      ctaLabel: manualCtaLabel,
      ctaUrl: manualCtaUrl,
      ctaColorHex: manualCtaColor,
      highlightItems: includeHighlights
        ? [
            { label: manualHighlight1Label, value: manualHighlight1Value },
            { label: manualHighlight2Label, value: manualHighlight2Value },
            { label: manualHighlight3Label, value: manualHighlight3Value },
          ].filter((h) => h.label.trim() && h.value.trim())
        : [],
    });
  }, [
    manualRecipientEmail,
    manualRecipientName,
    manualSubject,
    manualHeadline,
    manualSubheadline,
    manualBadgeText,
    manualBadgeColor,
    manualBody,
    manualCtaLabel,
    manualCtaUrl,
    manualCtaColor,
    includeHighlights,
    manualHighlight1Label,
    manualHighlight1Value,
    manualHighlight2Label,
    manualHighlight2Value,
    manualHighlight3Label,
    manualHighlight3Value,
  ]);

  // Payment Gateway & Media Settings Form State
  const [payForm, setPayForm] = useState<PaymentGatewaySettings>(paymentSettings);
  const [paySavedMsg, setPaySavedMsg] = useState<string | null>(null);
  const [selectedAdminPayCoin, setSelectedAdminPayCoin] = useState<string>('all');
  const [mediaUploadTitle, setMediaUploadTitle] = useState<string>('Promo Banner');
  const [mediaUploadCategory, setMediaUploadCategory] = useState<'QR_CODE' | 'PROMO_BANNER' | 'CERTIFICATE_SEAL' | 'GENERAL'>('PROMO_BANNER');
  const [manualEmailUploadedImg, setManualEmailUploadedImg] = useState<string>('');

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

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
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
    field: keyof PaymentGatewaySettings,
    file?: File
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const nextSettings: PaymentGatewaySettings = {
          ...payForm,
          [field]: reader.result,
        };
        setPayForm(nextSettings);
        adminSavePaymentSettings(nextSettings);
        setPaySavedMsg(`Uploaded image (${file.name}) and saved live across the platform!`);
        setTimeout(() => setPaySavedMsg(null), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryImageUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newItem = {
          id: `media-${Date.now()}`,
          title: mediaUploadTitle.trim() || file.name,
          category: mediaUploadCategory,
          url: reader.result,
          uploadedAt: new Date().toISOString(),
        };
        const currentGallery = Array.isArray(payForm.adminGalleryImages)
          ? payForm.adminGalleryImages
          : [];
        const nextSettings: PaymentGatewaySettings = {
          ...payForm,
          adminGalleryImages: [newItem, ...currentGallery],
          ...(mediaUploadCategory === 'CERTIFICATE_SEAL' ? { certificateSealImg: reader.result } : {}),
          ...(mediaUploadCategory === 'PROMO_BANNER' ? { promoBannerImg: reader.result } : {}),
          ...(mediaUploadCategory === 'QR_CODE'
            ? { cryptoUsdtBep20Qr: reader.result, cryptoUsdtTrc20Qr: reader.result }
            : {}),
        };
        setPayForm(nextSettings);
        adminSavePaymentSettings(nextSettings);
        setPaySavedMsg(`Uploaded "${newItem.title}" (${file.name}) to Admin Media Library!`);
        setTimeout(() => setPaySavedMsg(null), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePaymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    adminSavePaymentSettings(payForm);
    setPaySavedMsg('All Payment Gateway addresses, QR codes & Master Terminal credentials saved live!');
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
    <main className="min-h-screen bg-transparent text-[#FFFFFF]">
      {/* Institutional Top Navigation & Executive Telemetry Header */}
      <header className="bg-[#030504]/85 backdrop-blur-xl border-b border-[#00E676]/15 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-[1440px] mx-auto space-y-5">
          {/* Top Rounded Capsule Bar with Logo, Role badge, and navigation links */}
          <div className="rounded-[24px] sm:rounded-full bg-[#051015]/92 border border-[#00E5B0]/25 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_14px_38px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(56,248,210,0.14)]">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('home')}
                className="text-left cursor-pointer focus:outline-none"
              >
                <FundedApexLogo variant="main" size="md" />
              </button>
              <span className="px-3 py-1 rounded-full bg-[#090D0A] border border-[#00E676]/35 text-xs font-mono font-bold text-[#00E676] uppercase">
                {user.role.replace('_', ' ')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('dashboard')}
                className="px-4 py-1.5 rounded-full bg-[#090D0A] hover:bg-[#131B15] border border-white/10 text-xs font-medium text-[#A7B1AA] hover:text-white transition-all cursor-pointer"
              >
                Trader Dashboard →
              </button>
              <button
                type="button"
                onClick={() => navigate('terminal')}
                className="px-4 py-1.5 rounded-full bg-[#090D0A] hover:bg-[#131B15] border border-[#00E676]/30 text-xs font-medium text-[#00E676] transition-all cursor-pointer"
              >
                Live Terminal →
              </button>
              <button
                type="button"
                onClick={() => navigate('home')}
                className="px-4 py-1.5 rounded-full bg-[#090D0A] hover:bg-[#131B15] border border-white/10 text-xs font-medium text-[#A7B1AA] hover:text-white transition-all cursor-pointer"
              >
                Public Site
              </button>
            </div>
          </div>

          {/* Title and 4 KPI metric cards */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-white/5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#00E676]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>FUNDED APEX ENTERPRISE GOVERNANCE</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Institutional Administrator Control Center
              </h1>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="px-4 py-3 rounded-[10px] bg-[#090D0A] border border-[#00E676]/18">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#77837B]">Pending Orders</div>
                <div className="font-mono text-xl font-extrabold text-amber-300 mt-0.5">{pendingOrdersCount}</div>
              </div>
              <div className="px-4 py-3 rounded-[10px] bg-[#090D0A] border border-[#00E676]/18">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#77837B]">Active Coupons</div>
                <div className="font-mono text-xl font-extrabold text-[#00E676] mt-0.5">{adminCoupons.filter((c) => c.active).length}</div>
              </div>
              <div className="px-4 py-3 rounded-[10px] bg-[#090D0A] border border-[#00E676]/18">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#77837B]">Total Accounts</div>
                <div className="font-mono text-xl font-extrabold text-white mt-0.5">{allAccounts.length}</div>
              </div>
              <div className="px-4 py-3 rounded-[10px] bg-[#090D0A] border border-[#00E676]/18">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#77837B]">Registered Users</div>
                <div className="font-mono text-xl font-extrabold text-[#00E676] mt-0.5">{allUsers.length}</div>
              </div>
            </div>
          </div>

          {/* Full-width Horizontal Tab Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 custom-scrollbar">
            {isFullAdmin && (
              <button
                type="button"
                data-testid="admin-tab-confirmations"
                onClick={() => setTab('confirmations')}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  tab === 'confirmations'
                    ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                    : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Orders &amp; Approvals</span>
                {pendingOrdersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-[5px] bg-amber-400 text-[#000000] font-mono text-[10px] font-black">
                    {pendingOrdersCount}
                  </span>
                )}
              </button>
            )}

            {isFullAdmin && (
              <button
                type="button"
                data-testid="admin-tab-users"
                onClick={() => setTab('users')}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  tab === 'users'
                    ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                    : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users &amp; KYC</span>
                <span className="font-mono text-[11px] opacity-75">({allUsers.length})</span>
              </button>
            )}

            {isFullAdmin && (
              <button
                type="button"
                onClick={() => setTab('challenges')}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  tab === 'challenges'
                    ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                    : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Challenges</span>
                <span className="font-mono text-[11px] opacity-75">({challenges.length})</span>
              </button>
            )}

            <button
              type="button"
              data-testid="admin-tab-accounts"
              onClick={() => setTab('accounts')}
              className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                tab === 'accounts'
                  ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                  : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Accounts &amp; Trading</span>
              <span className="font-mono text-[11px] opacity-75">({allAccounts.length})</span>
            </button>

            {isFullAdmin && (
              <button
                type="button"
                data-testid="admin-tab-terminal-passwords"
                onClick={() => setTab('terminal_passwords')}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  tab === 'terminal_passwords'
                    ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                    : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Terminal Passwords</span>
                <span className="font-mono text-[11px] opacity-75">({allAccounts.length})</span>
              </button>
            )}

            {isFullAdmin && (
              <button
                type="button"
                onClick={() => setTab('payouts')}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  tab === 'payouts'
                    ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                    : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payouts</span>
                <span className="font-mono text-[11px] opacity-75">({payouts.length})</span>
              </button>
            )}

            {isFullAdmin && (
              <button
                type="button"
                data-testid="admin-tab-coupons"
                onClick={() => setTab('coupons')}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  tab === 'coupons'
                    ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                    : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
                }`}
              >
                <TicketPercent className="w-3.5 h-3.5" />
                <span>Coupons</span>
                <span className="font-mono text-[11px] opacity-75">({adminCoupons.length})</span>
              </button>
            )}

            {isFullAdmin && (
              <button
                type="button"
                data-testid="admin-tab-emails"
                onClick={() => setTab('emails')}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  tab === 'emails'
                    ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                    : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Emails &amp; Notifications</span>
                <span className="font-mono text-[11px] opacity-75">({emailNotifications.length})</span>
              </button>
            )}

            {isFullAdmin && (
              <button
                type="button"
                data-testid="admin-tab-media"
                onClick={() => setTab('media')}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  tab === 'media'
                    ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                    : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Media Assets</span>
              </button>
            )}

            {isFullAdmin && (
              <button
                type="button"
                data-testid="admin-tab-payments"
                onClick={() => setTab('payments')}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  tab === 'payments'
                    ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                    : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Crypto &amp; Gateways</span>
              </button>
            )}

            {isFullAdmin && (
              <button
                type="button"
                onClick={() => setTab('logs')}
                className={`px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  tab === 'logs'
                    ? 'bg-[#00E676] text-[#000000] font-bold shadow-[0_0_20px_rgba(0,230,118,0.25)]'
                    : 'bg-[#090D0A] text-[#A7B1AA] hover:text-white hover:bg-[#0D130F] border border-white/5'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Audit Logs</span>
                <span className="font-mono text-[11px] opacity-75">({adminLogs.length})</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container - Full Width Spacious */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
                    <th className="py-3.5 px-4 text-right">Generate / Copy Passcode</th>
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
                                  `Generated ID (${newId}) & Password (${newCode}) for #${acc.accountNumber}!`
                                );
                                setTimeout(() => setPasscodeSavedNotice(null), 4000);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-[#00FFA3] font-mono font-bold text-xs cursor-pointer"
                            >
                              ↻ Generate ID &amp; Pass
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const credText = `FUNDED APEX (fundedapex.com) TERMINAL ACCESS\nTrader: ${owner?.fullName || 'Trader'} (${owner?.email || ''})\nAccount: #${acc.accountNumber} ($${acc.startingBalance.toLocaleString()})\nTerminal User ID: ${currentUserId}\nTerminal Password: ${currentPass}\nContact: fundedapexsupport@gmail.com`;
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
                    Every time Admin generates or updates a Challenge / Account Terminal User ID or Password, an automated email is dispatched from <strong className="text-[#00FFA3] font-mono">fundedapexofficial@gmail.com</strong> (<strong className="text-white">fundedapex.com</strong>).
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
                          To: <span className="text-[#00FFA3] font-mono">{mail.to}</span> ({mail.recipientName}) · From: <span className="font-mono text-slate-300">fundedapexofficial@gmail.com</span>
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
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono font-bold text-[#00FFA3]">
                  <span className="w-2 h-2 rounded-full bg-[#00FFA3] animate-pulse" />
                  <span>Live Sync</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshingOrders(true);
                    await refreshVaultData();
                    setTimeout(() => setIsRefreshingOrders(false), 500);
                  }}
                  disabled={isRefreshingOrders}
                  className="px-3 py-1 rounded-full bg-[#030A07] hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-mono font-bold text-white hover:text-[#00FFA3] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOrders ? 'animate-spin text-[#00FFA3]' : ''}`} />
                  <span>{isRefreshingOrders ? 'Syncing...' : 'Sync Now'}</span>
                </button>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#00FFA3] font-bold">
                  {purchaseRequests.length} Total Orders
                </span>
              </div>
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

      {/* TAB 2: MULTI-COIN PAYMENT GATEWAY (ADDRESSES & DIRECT QR UPLOADS FOR ALL COINS) */}
      {tab === 'payments' && isFullAdmin && (
        <form
          onSubmit={handleSavePaymentConfig}
          className="bg-[#06140E]/92 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl apex-fade-up"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
            <div>
              <h2 className="font-display text-xl font-extrabold text-white">
                Payment Gateways (All Coins, Wallet Addresses &amp; QR Codes) &amp; Master Terminal Passwords
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                View and edit deposit wallet addresses, upload QR code images directly from your device, or enter QR image URLs for every coin in the checkout gateway (USDT BEP-20, USDT TRC-20, USDT ERC-20, BNB, BTC, ETH, SOL, Arbitrum, Aptos, UPI, and Bank Wire).
              </p>
            </div>
            <button
              type="submit"
              data-testid="save-payment-settings-btn"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-[0_10px_25px_rgba(0,255,163,0.3)] transition-all hover:brightness-110 shrink-0"
            >
              Save All Payment Settings
            </button>
          </div>

          {paySavedMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-xs font-bold text-[#00FFA3] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{paySavedMsg}</span>
            </div>
          )}

          {/* Quick Coin Filter / Switcher Bar (Defaults to 'All Coins' so every coin is visible at once) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/5">
            {[
              { id: 'all', label: 'All Coins & Gateways (11)' },
              { id: 'usdt_bep20', label: 'USDT (BEP-20)' },
              { id: 'usdt_trc20', label: 'USDT (TRC-20)' },
              { id: 'usdt_erc20', label: 'USDT (ERC-20)' },
              { id: 'bnb_bep20', label: 'BNB (BSC)' },
              { id: 'btc', label: 'Bitcoin (BTC)' },
              { id: 'eth', label: 'Ethereum (ETH)' },
              { id: 'sol', label: 'Solana (SOL)' },
              { id: 'arbitrum', label: 'Arbitrum USDT' },
              { id: 'aptos', label: 'Aptos USDT' },
              { id: 'upi', label: 'UPI (India)' },
              { id: 'bank', label: 'Bank Transfer' },
            ].map((coin) => (
              <button
                key={coin.id}
                type="button"
                onClick={() => setSelectedAdminPayCoin(coin.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedAdminPayCoin === coin.id
                    ? 'bg-[#00FFA3] text-black font-extrabold shadow-[0_0_12px_rgba(0,255,163,0.35)]'
                    : 'bg-[#030A07] text-[#A7B1AA] hover:text-white border border-white/10'
                }`}
              >
                {coin.label}
              </button>
            ))}
          </div>

          {/* Complete Grid of All Crypto Coins (Address + QR Image Upload + QR URL Input) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {(
              [
                {
                  id: 'usdt_bep20',
                  title: 'USDT (BEP-20 · BNB Smart Chain)',
                  badge: 'RECOMMENDED',
                  addrField: 'cryptoUsdtBep20' as keyof PaymentGatewaySettings,
                  qrField: 'cryptoUsdtBep20Qr' as keyof PaymentGatewaySettings,
                  placeholder: '0x...',
                },
                {
                  id: 'usdt_trc20',
                  title: 'USDT (TRC-20 · TRON Network)',
                  badge: 'TRON',
                  addrField: 'cryptoUsdtTrc20' as keyof PaymentGatewaySettings,
                  qrField: 'cryptoUsdtTrc20Qr' as keyof PaymentGatewaySettings,
                  placeholder: 'TX9k...',
                },
                {
                  id: 'usdt_erc20',
                  title: 'USDT (ERC-20 · Ethereum Mainnet)',
                  badge: 'ERC20',
                  addrField: 'cryptoUsdtErc20' as keyof PaymentGatewaySettings,
                  qrField: 'cryptoUsdtErc20Qr' as keyof PaymentGatewaySettings,
                  placeholder: '0x...',
                },
                {
                  id: 'bnb_bep20',
                  title: 'BNB (BNB Chain · BEP-20)',
                  badge: 'BNB',
                  addrField: 'cryptoBnbBep20' as keyof PaymentGatewaySettings,
                  qrField: 'cryptoBnbBep20Qr' as keyof PaymentGatewaySettings,
                  placeholder: '0x...',
                },
                {
                  id: 'btc',
                  title: 'Bitcoin (BTC Network)',
                  badge: 'BTC',
                  addrField: 'cryptoBtcAddress' as keyof PaymentGatewaySettings,
                  qrField: 'cryptoBtcQr' as keyof PaymentGatewaySettings,
                  placeholder: 'bc1q...',
                },
                {
                  id: 'eth',
                  title: 'Ethereum (ETH Mainnet)',
                  badge: 'ETH',
                  addrField: 'cryptoEthAddress' as keyof PaymentGatewaySettings,
                  qrField: 'cryptoEthQr' as keyof PaymentGatewaySettings,
                  placeholder: '0x...',
                },
                {
                  id: 'sol',
                  title: 'Solana (SOL SPL Network)',
                  badge: 'SOL',
                  addrField: 'cryptoSolAddress' as keyof PaymentGatewaySettings,
                  qrField: 'cryptoSolQr' as keyof PaymentGatewaySettings,
                  placeholder: 'APEX...',
                },
                {
                  id: 'arbitrum',
                  title: 'USDT (Arbitrum One)',
                  badge: 'ARBITRUM',
                  addrField: 'cryptoArbitrumAddress' as keyof PaymentGatewaySettings,
                  qrField: 'cryptoArbitrumQr' as keyof PaymentGatewaySettings,
                  placeholder: '0x...',
                },
                {
                  id: 'aptos',
                  title: 'USDT (Aptos Network)',
                  badge: 'APTOS',
                  addrField: 'cryptoAptosAddress' as keyof PaymentGatewaySettings,
                  qrField: 'cryptoAptosQr' as keyof PaymentGatewaySettings,
                  placeholder: '0x...',
                },
              ] as const
            )
              .filter((c) => selectedAdminPayCoin === 'all' || selectedAdminPayCoin === c.id)
              .map((coinCfg) => {
                const currentAddr = String(payForm[coinCfg.addrField] || '');
                const currentQr = String(payForm[coinCfg.qrField] || '');
                return (
                  <div
                    key={coinCfg.id}
                    className="p-5 rounded-2xl bg-[#030A07]/95 border border-emerald-500/25 space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[#00FFA3] border-b border-emerald-500/15 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 shrink-0" />
                          <h3 className="font-display text-sm font-extrabold text-white">
                            {coinCfg.title}
                          </h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#00FFA3]/15 text-[9.5px] font-mono text-[#00FFA3] uppercase">
                          {coinCfg.badge}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-200 mb-1">
                          Deposit Wallet Address
                        </label>
                        <input
                          type="text"
                          value={currentAddr}
                          onChange={(e) =>
                            setPayForm({ ...payForm, [coinCfg.addrField]: e.target.value })
                          }
                          placeholder={coinCfg.placeholder}
                          className="w-full px-3 py-2 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs font-mono font-bold text-[#00FFA3] focus:border-[#00FFA3] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          QR Image URL (or upload file below)
                        </label>
                        <input
                          type="text"
                          value={currentQr}
                          onChange={(e) =>
                            setPayForm({ ...payForm, [coinCfg.qrField]: e.target.value })
                          }
                          placeholder="/images/usdt-bep20-qr.png or data:image/..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#06140E] border border-emerald-500/25 text-[11px] font-mono text-slate-200 focus:border-[#00FFA3] outline-none"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#06140E] border border-emerald-500/35 space-y-2">
                      <label className="block text-[11px] font-bold text-[#00FFA3]">
                        Direct QR Code Image Upload
                      </label>
                      <div className="flex items-center gap-3">
                        {currentQr ? (
                          <img
                            src={currentQr}
                            alt={`${coinCfg.title} QR`}
                            className="w-14 h-14 rounded-lg bg-[#030F0C] object-contain border border-[#00FFA3]/50 shrink-0 p-0.5"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-[#030F0C] border border-white/10 flex items-center justify-center text-[9px] font-mono text-slate-400 shrink-0 text-center">
                            Auto QR
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleQrFileUpload(coinCfg.qrField, e.target.files?.[0])
                          }
                          className="w-full text-[11px] text-slate-300 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#00FFA3] file:text-black file:cursor-pointer cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* UPI Gateway Card */}
            {(selectedAdminPayCoin === 'all' || selectedAdminPayCoin === 'upi') && (
              <div className="p-5 rounded-2xl bg-[#030A07]/95 border border-emerald-500/25 space-y-3.5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[#00FFA3] border-b border-emerald-500/15 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <h3 className="font-display text-sm font-extrabold text-white">
                        UPI Gateway (India Instant Transfer)
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#00FFA3]/15 text-[9.5px] font-mono text-[#00FFA3] uppercase">
                      UPI
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-200 mb-1">
                      Virtual Payment Address (VPA / UPI ID)
                    </label>
                    <input
                      type="text"
                      value={payForm.upiId || ''}
                      onChange={(e) => setPayForm({ ...payForm, upiId: e.target.value })}
                      placeholder="fundedapex@icici"
                      className="w-full px-3 py-2 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs font-mono font-bold text-[#00FFA3] focus:border-[#00FFA3] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      UPI QR Image URL
                    </label>
                    <input
                      type="text"
                      value={payForm.upiQr || ''}
                      onChange={(e) => setPayForm({ ...payForm, upiQr: e.target.value })}
                      placeholder="https://... or upload below"
                      className="w-full px-3 py-1.5 rounded-xl bg-[#06140E] border border-emerald-500/25 text-[11px] font-mono text-slate-200 focus:border-[#00FFA3] outline-none"
                    />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#06140E] border border-emerald-500/35 space-y-2">
                  <label className="block text-[11px] font-bold text-[#00FFA3]">
                    UPI QR Code Image Upload
                  </label>
                  <div className="flex items-center gap-3">
                    {payForm.upiQr && (
                      <img
                        src={payForm.upiQr}
                        alt="UPI QR"
                        className="w-14 h-14 rounded-lg bg-[#030F0C] object-contain border border-[#00FFA3]/50 shrink-0 p-0.5"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQrFileUpload('upiQr', e.target.files?.[0])}
                      className="w-full text-[11px] text-slate-300 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#00FFA3] file:text-black file:cursor-pointer cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* International Bank Wire Card */}
            {(selectedAdminPayCoin === 'all' || selectedAdminPayCoin === 'bank') && (
              <div className="p-5 rounded-2xl bg-[#030A07]/95 border border-emerald-500/25 space-y-3">
                <div className="flex items-center justify-between text-[#00FFA3] border-b border-emerald-500/15 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <h3 className="font-display text-sm font-extrabold text-white">
                      International Bank Wire Transfer
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#00FFA3]/15 text-[9.5px] font-mono text-[#00FFA3] uppercase">
                    SWIFT / WIRE
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-200 mb-1">
                      Bank Beneficiary Name
                    </label>
                    <input
                      type="text"
                      value={payForm.bankAccountName || ''}
                      onChange={(e) => setPayForm({ ...payForm, bankAccountName: e.target.value })}
                      placeholder="FUNDED APEX PROPRIETARY CORP"
                      className="w-full px-3 py-2 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-200 mb-1">
                      Bank Account Number / IBAN
                    </label>
                    <input
                      type="text"
                      value={payForm.bankAccountNumber || ''}
                      onChange={(e) => setPayForm({ ...payForm, bankAccountNumber: e.target.value })}
                      placeholder="9840284019284"
                      className="w-full px-3 py-2 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs font-mono text-[#00FFA3]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-200 mb-1">
                        SWIFT / BIC Code
                      </label>
                      <input
                        type="text"
                        value={payForm.bankIbanSwift || ''}
                        onChange={(e) => setPayForm({ ...payForm, bankIbanSwift: e.target.value })}
                        placeholder="APEXUS33XXX"
                        className="w-full px-3 py-2 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs font-mono text-[#00FFA3]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-200 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={payForm.bankName || ''}
                        onChange={(e) => setPayForm({ ...payForm, bankName: e.target.value })}
                        placeholder="JPMorgan Chase"
                        className="w-full px-3 py-2 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Master Terminal Credentials Card */}
            <div className="p-5 rounded-2xl bg-[#030A07]/95 border border-emerald-500/25 space-y-3.5">
              <div className="flex items-center gap-2 text-[#00FFA3] border-b border-emerald-500/15 pb-2.5">
                <Lock className="w-4 h-4 text-[#00FFA3]" />
                <h3 className="font-display text-sm font-extrabold text-white">
                  Master Trading Terminal User ID &amp; Password
                </h3>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Master Terminal User ID
                </label>
                <input
                  type="text"
                  required
                  value={payForm.terminalUserId || 'APEX-MASTER'}
                  onChange={(e) => setPayForm({ ...payForm, terminalUserId: e.target.value })}
                  placeholder="APEX-MASTER"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs font-mono font-bold text-[#00FFA3] focus:border-[#00FFA3] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Master Terminal Password
                </label>
                <input
                  type="text"
                  required
                  value={payForm.terminalPassword || 'APEX2026'}
                  onChange={(e) => setPayForm({ ...payForm, terminalPassword: e.target.value })}
                  placeholder="APEX2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06140E] border border-emerald-500/40 text-xs font-mono font-bold text-[#00FFA3] focus:border-[#00FFA3] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Global Checkout Instruction Note
                </label>
                <input
                  type="text"
                  value={payForm.cryptoNetworkNote}
                  onChange={(e) => setPayForm({ ...payForm, cryptoNetworkNote: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#06140E] border border-emerald-500/35 text-xs text-white"
                />
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
                          <option value="suspended">SUSPENDED</option>
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

      {/* TAB: BRANDED EMAIL NOTIFICATION & PROMOTIONAL BROADCAST CENTER */}
      {tab === 'emails' && isFullAdmin && (
        <section className="space-y-6 apex-fade-up">
          {/* Email Center Top Header & Sub-Tab Switcher */}
          <div className="bg-[#06140E]/95 border border-emerald-500/35 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono font-bold text-[#00FFA3] uppercase flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                <span>FUNDED APEX OFFICIAL COMMUNICATION DESK</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white mt-1">
                Institutional Email &amp; Notification Center
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Compose and dispatch executive emails manually with custom subjects, badges, and CTA buttons, or use automated event presets.
              </p>
            </div>

            {/* Sub-tab pills */}
            <div className="inline-flex p-1 rounded-2xl bg-[#030A07] border border-emerald-500/30 shrink-0">
              <button
                type="button"
                onClick={() => setEmailSubTab('manual')}
                className={`px-4 py-2 rounded-xl text-xs font-display font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  emailSubTab === 'manual'
                    ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] shadow-[0_0_15px_rgba(0,255,163,0.3)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Manual Professional Composer</span>
              </button>
              <button
                type="button"
                onClick={() => setEmailSubTab('presets')}
                className={`px-4 py-2 rounded-xl text-xs font-display font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  emailSubTab === 'presets'
                    ? 'bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] shadow-[0_0_15px_rgba(0,255,163,0.3)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <TicketPercent className="w-3.5 h-3.5" />
                <span>Quick Event Presets</span>
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: DEDICATED MANUAL PROFESSIONAL EMAIL COMPOSER */}
          {emailSubTab === 'manual' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Rich Manual Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setManualFeedback(null);
                  setManualSending(true);

                  const targetEmail =
                    manualRecipientType === 'broadcast_all'
                      ? 'all@fundedapex.com'
                      : manualRecipientType === 'select_user'
                      ? manualSelectedUid
                        ? allUsers.find((u) => u.uid === manualSelectedUid)?.email || allUsers[0]?.email || ''
                        : allUsers[0]?.email || ''
                      : manualRecipientEmail.trim();

                  const targetName =
                    manualRecipientType === 'broadcast_all'
                      ? 'FUNDED APEX Traders'
                      : manualRecipientType === 'select_user'
                      ? manualSelectedUid
                        ? allUsers.find((u) => u.uid === manualSelectedUid)?.fullName || 'Trader'
                        : allUsers[0]?.fullName || 'Trader'
                      : manualRecipientName.trim() || 'Trader';

                  if (!targetEmail) {
                    setManualFeedback({ type: 'err', msg: 'Please provide a valid recipient email.' });
                    setManualSending(false);
                    return;
                  }

                  const res = adminSendManualEmail({
                    recipientEmail: targetEmail,
                    recipientName: targetName,
                    subject: manualSubject,
                    headline: manualHeadline,
                    subheadline: manualSubheadline,
                    badgeText: manualBadgeText,
                    badgeColorHex: manualBadgeColor,
                    bodyTextOrHtml: manualBody,
                    ctaLabel: manualCtaLabel,
                    ctaUrl: manualCtaUrl,
                    ctaColorHex: manualCtaColor,
                    highlightItems: includeHighlights
                      ? [
                          { label: manualHighlight1Label, value: manualHighlight1Value, isMono: true, isHighlight: true },
                          { label: manualHighlight2Label, value: manualHighlight2Value },
                          { label: manualHighlight3Label, value: manualHighlight3Value, isMono: true },
                        ]
                      : undefined,
                  });

                  setManualSending(false);
                  if (res.ok && res.email) {
                    setManualFeedback({
                      type: 'ok',
                      msg: `Delivered "${res.email.subject}" to ${res.email.to} (${new Date().toLocaleTimeString()})!`,
                    });
                    setEmailPreviewId(res.email.id);
                  } else {
                    setManualFeedback({
                      type: 'err',
                      msg: res.error || 'Failed to dispatch email.',
                    });
                  }
                }}
                className="lg:col-span-6 bg-[#06140E]/95 border border-emerald-500/35 rounded-3xl p-6 space-y-4 shadow-xl h-fit"
              >
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div>
                    <h3 className="font-display text-base font-extrabold text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-[#00FFA3]" />
                      <span>Compose Manual Executive Email</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Dispatched from <strong className="text-[#00FFA3] font-mono">fundedapexsupport@gmail.com</strong>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-[#00FFA3]">
                    Professional HTML Template
                  </span>
                </div>

                {manualFeedback && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
                      manualFeedback.type === 'ok'
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-[#00FFA3]'
                        : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                    }`}
                  >
                    {manualFeedback.type === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00FFA3]" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 text-rose-300" />
                    )}
                    <span>{manualFeedback.msg}</span>
                  </div>
                )}

                {/* Recipient Mode Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">
                    Recipient Target Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setManualRecipientType('select_user');
                        const defaultUser = allUsers[0];
                        if (defaultUser) {
                          setManualSelectedUid(defaultUser.uid);
                          setManualRecipientEmail(defaultUser.email);
                          setManualRecipientName(defaultUser.fullName);
                        }
                      }}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        manualRecipientType === 'select_user'
                          ? 'bg-[#00FFA3]/20 border-[#00FFA3] text-[#00FFA3]'
                          : 'bg-[#030A07] border-emerald-500/25 text-slate-400 hover:text-white'
                      }`}
                    >
                      Registered Trader
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualRecipientType('broadcast_all');
                        setManualRecipientEmail('all@fundedapex.com');
                        setManualRecipientName('FUNDED APEX Traders');
                      }}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        manualRecipientType === 'broadcast_all'
                          ? 'bg-[#00FFA3]/20 border-[#00FFA3] text-[#00FFA3]'
                          : 'bg-[#030A07] border-emerald-500/25 text-slate-400 hover:text-white'
                      }`}
                    >
                      All Traders (Broadcast)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualRecipientType('custom')}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        manualRecipientType === 'custom'
                          ? 'bg-[#00FFA3]/20 border-[#00FFA3] text-[#00FFA3]'
                          : 'bg-[#030A07] border-emerald-500/25 text-slate-400 hover:text-white'
                      }`}
                    >
                      Custom Email Address
                    </button>
                  </div>
                </div>

                {manualRecipientType === 'select_user' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Choose Registered User ({allUsers.length} Users)
                    </label>
                    <select
                      value={manualSelectedUid || allUsers[0]?.uid || ''}
                      onChange={(e) => {
                        const uid = e.target.value;
                        setManualSelectedUid(uid);
                        const found = allUsers.find((u) => u.uid === uid);
                        if (found) {
                          setManualRecipientEmail(found.email);
                          setManualRecipientName(found.fullName);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white outline-none focus:border-[#00FFA3]"
                    >
                      {allUsers.map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.fullName} ({u.email}) — Role: {u.role.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      required
                      value={
                        manualRecipientType === 'broadcast_all'
                          ? 'all@fundedapex.com'
                          : manualRecipientEmail || (manualRecipientType === 'select_user' ? allUsers[0]?.email || '' : '')
                      }
                      onChange={(e) => setManualRecipientEmail(e.target.value)}
                      readOnly={manualRecipientType === 'broadcast_all'}
                      placeholder="trader@example.com"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white outline-none focus:border-[#00FFA3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      required
                      value={
                        manualRecipientType === 'broadcast_all'
                          ? 'FUNDED APEX Traders'
                          : manualRecipientName || (manualRecipientType === 'select_user' ? allUsers[0]?.fullName || '' : '')
                      }
                      onChange={(e) => setManualRecipientName(e.target.value)}
                      placeholder="Trader Name"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white outline-none focus:border-[#00FFA3]"
                    />
                  </div>
                </div>

                {/* Professional Subject Presets */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300">
                      Subject Line Presets (Click to Auto-Fill)
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        title: 'Account Update',
                        subj: '[FUNDED APEX] Priority Notice: Your Trading Account Status Update',
                        headline: 'Official Notice Regarding Your Trading Account',
                        badge: 'ACCOUNT NOTICE',
                        color: '#00FFA3',
                      },
                      {
                        title: 'Payout Approved',
                        subj: '[FUNDED APEX] Profit Payout Approved & Remittance Confirmation',
                        headline: 'Profit Payout Successfully Approved & Remitted',
                        badge: 'PAYOUT APPROVED',
                        color: '#38BDF8',
                      },
                      {
                        title: 'Challenge Passed',
                        subj: '[FUNDED APEX] Congratulations! Evaluation Objectives Passed — Funded Trader Activated',
                        headline: 'Congratulations — You Have Officially Passed Your Evaluation',
                        badge: 'CHALLENGE PASSED',
                        color: '#00FFA3',
                      },
                      {
                        title: 'Rule Breach Warning',
                        subj: '[FUNDED APEX] Compliance Notice: Account Drawdown / Rule Breach Advisory',
                        headline: 'Important Risk Desk Advisory: Rule Breach Detected',
                        badge: 'RISK COMPLIANCE',
                        color: '#FB7185',
                      },
                      {
                        title: 'Server Maintenance',
                        subj: '[FUNDED APEX] Scheduled Server Maintenance & Institutional Trading Hours Advisory',
                        headline: 'Trading Hours & Scheduled Infrastructure Maintenance',
                        badge: 'SYSTEM ADVISORY',
                        color: '#FBBF24',
                      },
                      {
                        title: 'VIP 30% Promo',
                        subj: '[FUNDED APEX] Exclusive VIP Invitation: 30% Discount Voucher for Funded Traders',
                        headline: 'Exclusive 30% OFF Promotion Voucher for Active Traders',
                        badge: 'VIP INVITATION',
                        color: '#A855F7',
                      },
                    ].map((pre) => (
                      <button
                        key={pre.title}
                        type="button"
                        onClick={() => {
                          setManualSubject(pre.subj);
                          setManualHeadline(pre.headline);
                          setManualBadgeText(pre.badge);
                          setManualBadgeColor(pre.color);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#030A07] hover:bg-emerald-500/15 border border-emerald-500/25 hover:border-emerald-500/50 text-[10.5px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        + {pre.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject Line Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Subject Line
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {manualSubject.length} chars
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                    placeholder="[FUNDED APEX] Official Subject Line..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-bold text-white outline-none focus:border-[#00FFA3]"
                  />
                </div>

                {/* Badge & Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Header Badge Text
                    </label>
                    <input
                      type="text"
                      value={manualBadgeText}
                      onChange={(e) => setManualBadgeText(e.target.value.toUpperCase())}
                      placeholder="OFFICIAL NOTICE"
                      className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono font-bold text-[#00FFA3] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Badge &amp; Accent Color
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      {[
                        { color: '#00FFA3', name: 'Emerald' },
                        { color: '#38BDF8', name: 'Cyan' },
                        { color: '#FBBF24', name: 'Amber' },
                        { color: '#FB7185', name: 'Rose' },
                        { color: '#A855F7', name: 'Violet' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => {
                            setManualBadgeColor(c.color);
                            setManualCtaColor(c.color);
                          }}
                          style={{ backgroundColor: c.color }}
                          className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                            manualBadgeColor === c.color ? 'scale-125 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                          }`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Headline & Subheadline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Email Headline (H1)
                    </label>
                    <input
                      type="text"
                      value={manualHeadline}
                      onChange={(e) => setManualHeadline(e.target.value)}
                      placeholder="Official Notice Headline..."
                      className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white outline-none focus:border-[#00FFA3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Subheadline Context
                    </label>
                    <input
                      type="text"
                      value={manualSubheadline}
                      onChange={(e) => setManualSubheadline(e.target.value)}
                      placeholder="Official Dispatch from the Risk Desk..."
                      className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white outline-none focus:border-[#00FFA3]"
                    />
                  </div>
                </div>

                {/* Message Body with Quick Snippet Inserters */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Email Message Body
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setManualBody(
                            (prev) =>
                              prev +
                              '\n\n• Account Access Credentials: Your Terminal User ID and Passcode are ready on your Trader Dashboard.'
                          )
                        }
                        className="text-[10px] font-mono text-[#00FFA3] hover:underline cursor-pointer"
                      >
                        + Credentials
                      </button>
                      <span className="text-slate-600">·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setManualBody(
                            (prev) =>
                              prev +
                              '\n\n• Payout Remittance Details: Your requested profit split has been approved and remitted via USDT BEP-20.'
                          )
                        }
                        className="text-[10px] font-mono text-[#00FFA3] hover:underline cursor-pointer"
                      >
                        + Payout
                      </button>
                      <span className="text-slate-600">·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setManualBody(
                            (prev) =>
                              prev +
                              '\n\n• Risk Parameter Reminder: Max daily drawdown is 5% and overall maximum drawdown is 10% calculated from high-water mark equity.'
                          )
                        }
                        className="text-[10px] font-mono text-[#00FFA3] hover:underline cursor-pointer"
                      >
                        + Drawdown
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    required
                    value={manualBody}
                    onChange={(e) => setManualBody(e.target.value)}
                    placeholder="Write the message body here. Blank lines become clean paragraphs automatically..."
                    className="w-full p-3.5 rounded-2xl bg-[#030A07] border border-emerald-500/35 text-xs text-slate-200 font-sans leading-relaxed outline-none focus:border-[#00FFA3]"
                  />

                  {/* Direct Image Upload inside Manual Email Composer */}
                  <div className="p-3.5 rounded-2xl bg-[#030A07] border border-emerald-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#00FFA3]">
                        Attach / Embed Image in Email (Direct File Upload)
                      </label>
                      {manualEmailUploadedImg && (
                        <button
                          type="button"
                          onClick={() => setManualEmailUploadedImg('')}
                          className="text-[10px] font-mono text-rose-300 hover:underline cursor-pointer"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {manualEmailUploadedImg && (
                        <img
                          src={manualEmailUploadedImg}
                          alt="Email Attachment Preview"
                          className="w-14 h-14 rounded-xl object-cover border border-[#00FFA3]/50 shrink-0"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              const dataUrl = reader.result;
                              setManualEmailUploadedImg(dataUrl);
                              setManualBody(
                                (prev) =>
                                  `${prev}\n\n<div style="margin:16px 0;text-align:center;"><img src="${dataUrl}" alt="${file.name}" style="max-width:100%;max-height:320px;border-radius:14px;border:1px solid rgba(0,255,163,0.4);" /></div>`
                              );
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-[#00FFA3] file:text-[#030A07] file:cursor-pointer cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Highlight Cards */}
                <div className="p-3.5 rounded-2xl bg-[#030A07] border border-emerald-500/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeHighlights}
                        onChange={(e) => setIncludeHighlights(e.target.checked)}
                        className="accent-[#00FFA3] rounded cursor-pointer"
                      />
                      <span>Include Key-Value Telemetry Box</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      Appears in email highlight box
                    </span>
                  </div>

                  {includeHighlights && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div>
                        <input
                          type="text"
                          value={manualHighlight1Label}
                          onChange={(e) => setManualHighlight1Label(e.target.value)}
                          placeholder="LABEL 1"
                          className="w-full px-2 py-1 rounded-lg bg-[#06140E] border border-emerald-500/25 text-[10px] font-mono uppercase text-slate-400 mb-1"
                        />
                        <input
                          type="text"
                          value={manualHighlight1Value}
                          onChange={(e) => setManualHighlight1Value(e.target.value)}
                          placeholder="VALUE 1"
                          className="w-full px-2 py-1.5 rounded-lg bg-[#06140E] border border-emerald-500/35 text-xs font-mono font-bold text-[#00FFA3]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={manualHighlight2Label}
                          onChange={(e) => setManualHighlight2Label(e.target.value)}
                          placeholder="LABEL 2"
                          className="w-full px-2 py-1 rounded-lg bg-[#06140E] border border-emerald-500/25 text-[10px] font-mono uppercase text-slate-400 mb-1"
                        />
                        <input
                          type="text"
                          value={manualHighlight2Value}
                          onChange={(e) => setManualHighlight2Value(e.target.value)}
                          placeholder="VALUE 2"
                          className="w-full px-2 py-1.5 rounded-lg bg-[#06140E] border border-emerald-500/35 text-xs font-bold text-white"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={manualHighlight3Label}
                          onChange={(e) => setManualHighlight3Label(e.target.value)}
                          placeholder="LABEL 3"
                          className="w-full px-2 py-1 rounded-lg bg-[#06140E] border border-emerald-500/25 text-[10px] font-mono uppercase text-slate-400 mb-1"
                        />
                        <input
                          type="text"
                          value={manualHighlight3Value}
                          onChange={(e) => setManualHighlight3Value(e.target.value)}
                          placeholder="VALUE 3"
                          className="w-full px-2 py-1.5 rounded-lg bg-[#06140E] border border-emerald-500/35 text-xs font-mono text-slate-200"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Call To Action Button Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={manualCtaLabel}
                      onChange={(e) => setManualCtaLabel(e.target.value)}
                      placeholder="Launch Trading Terminal →"
                      className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      CTA Destination URL
                    </label>
                    <input
                      type="text"
                      value={manualCtaUrl}
                      onChange={(e) => setManualCtaUrl(e.target.value)}
                      placeholder="https://fundedapex.com/?page=terminal"
                      className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-slate-300 outline-none"
                    />
                  </div>
                </div>

                {/* Submit Manual Email Button */}
                <button
                  type="submit"
                  disabled={manualSending}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] hover:from-[#10B981] hover:to-[#00FFA3] text-[#02120A] font-display font-extrabold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,255,163,0.35)] transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {manualSending
                      ? 'Dispatching Professional Email...'
                      : '✉ Send Professional Manual Email Now'}
                  </span>
                </button>
              </form>

              {/* Right Column: Live Real-Time HTML Email Preview & Outbox */}
              <div className="lg:col-span-6 space-y-5">
                {/* Live Preview Container */}
                <div className="bg-[#06140E]/95 border border-emerald-500/35 rounded-3xl p-6 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                    <div>
                      <h3 className="font-display text-sm font-extrabold text-white flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[#00FFA3]" />
                        <span>Live Real-Time Email Preview (Client View)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Updates instantly as you type subject, body, badge, or CTA.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-[#00FFA3] font-bold">
                      Responsive 620px
                    </span>
                  </div>

                  {livePreviewPayload && (
                    <div className="rounded-2xl bg-[#020806] border border-[#00FFA3]/30 overflow-hidden shadow-2xl">
                      <div className="px-4 py-2.5 bg-[#05140E] border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="font-bold text-white truncate max-w-xs sm:max-w-md">
                          Subject: {livePreviewPayload.subject}
                        </div>
                        <div className="font-mono text-[10px] text-[#00FFA3]">
                          From: fundedapexsupport@gmail.com
                        </div>
                      </div>
                      <div
                        className="p-4 sm:p-5 max-h-[560px] overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: livePreviewPayload.html }}
                      />
                    </div>
                  )}
                </div>

                {/* Recent Dispatched Emails Outbox Log */}
                <div className="bg-[#06140E]/95 border border-emerald-500/35 rounded-3xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                    <h3 className="font-display text-sm font-extrabold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00FFA3]" />
                      <span>Recently Dispatched Outbox ({emailNotifications.length})</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      Delivered via Relay
                    </span>
                  </div>

                  {emailNotifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-mono">
                      No emails sent yet in this session. Compose and click &quot;Send Professional Manual Email Now&quot; above!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {emailNotifications.slice(0, 8).map((mail) => (
                        <div
                          key={mail.id}
                          className="p-3 rounded-xl bg-[#030A07] border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5 truncate">
                            <div className="font-bold text-white truncate">{mail.subject}</div>
                            <div className="text-[11px] font-mono text-slate-400">
                              To: <span className="text-[#00FFA3]">{mail.to}</span> ({mail.recipientName}) ·{' '}
                              {new Date(mail.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[#00FFA3]/15 border border-[#00FFA3]/30 text-[10px] font-mono text-[#00FFA3] uppercase shrink-0 font-bold">
                            {(mail.eventType || 'manual').replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: QUICK EVENT PRESETS (Welcome, Status, Promo, Terminal) */}
          {emailSubTab === 'presets' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Dispatcher Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = adminSendEmailNotification({
                    eventType: emailTypeInput,
                    recipientEmail: emailRecipientInput,
                    recipientName: emailRecipientNameInput,
                    challengeStatus: emailChallengeStatusInput,
                    promoCode: emailPromoCodeInput,
                    discountPct: emailDiscountInput,
                    breachOrStatusReason: emailStatusReasonInput || undefined,
                  });
                  if (res.ok && res.email) {
                    setEmailPreviewId(res.email.id);
                    setEmailDispatchFeedback(`Dispatched "${res.email.subject}" to ${res.email.to}`);
                  }
                }}
                className="lg:col-span-5 bg-[#06140E]/95 border border-emerald-500/35 rounded-3xl p-6 space-y-4 h-fit shadow-xl"
              >
                <div className="space-y-1 border-b border-emerald-500/20 pb-3">
                  <div className="text-[11px] font-mono font-bold text-[#00FFA3] uppercase flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>AUTOMATED EVENT DISPATCHER</span>
                  </div>
                  <h3 className="font-display text-lg font-extrabold text-white">
                    Send Automated Event Preset Email
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registration Welcome, Password Reset, Challenge Status (Passed/Failed/Suspended), or Promotional Offer emails.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Notification Event Preset
                  </label>
                  <select
                    value={emailTypeInput}
                    onChange={(e) => setEmailTypeInput(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-bold text-white"
                  >
                    <option value="promotional_offer">Promotional Offer (Coupon + CTA)</option>
                    <option value="registration_welcome">Successful Registration Welcome</option>
                    <option value="password_reset">Password Reset &amp; Security Alert</option>
                    <option value="challenge_status_update">Challenge Status Update (Passed / Failed / Suspended)</option>
                    <option value="terminal_credentials">Terminal Credentials Allocation</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Recipient Email</label>
                    <input
                      type="text"
                      required
                      value={emailRecipientInput}
                      onChange={(e) => setEmailRecipientInput(e.target.value)}
                      placeholder="all@fundedapex.com or trader email"
                      className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Recipient Name</label>
                    <input
                      type="text"
                      required
                      value={emailRecipientNameInput}
                      onChange={(e) => setEmailRecipientNameInput(e.target.value)}
                      placeholder="FUNDED APEX Traders"
                      className="w-full px-3 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs text-white"
                    />
                  </div>
                </div>

                {emailTypeInput === 'challenge_status_update' && (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-[#030A07] border border-emerald-500/25">
                    <div>
                      <label className="block text-xs font-bold text-[#00FFA3] mb-1">
                        Challenge Status Event
                      </label>
                      <select
                        value={emailChallengeStatusInput}
                        onChange={(e) => setEmailChallengeStatusInput(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-[#06140E] border border-emerald-500/35 text-xs font-bold text-white"
                      >
                        <option value="passed">PASSED (Funded Trader Status)</option>
                        <option value="failed">FAILED (Rule Breach / Liquidated)</option>
                        <option value="suspended">SUSPENDED (Compliance Review)</option>
                        <option value="active">ACTIVE (Phase Promoted)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Custom Status / Breach Reason (Optional)
                      </label>
                      <input
                        type="text"
                        value={emailStatusReasonInput}
                        onChange={(e) => setEmailStatusReasonInput(e.target.value)}
                        placeholder="e.g. Passed all profit targets or Max drawdown exceeded"
                        className="w-full px-3 py-2 rounded-xl bg-[#06140E] border border-emerald-500/35 text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {emailTypeInput === 'promotional_offer' && (
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#030A07] border border-amber-500/30">
                    <div>
                      <label className="block text-xs font-bold text-amber-300 mb-1">
                        Promo Code
                      </label>
                      <input
                        type="text"
                        value={emailPromoCodeInput}
                        onChange={(e) => setEmailPromoCodeInput(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 rounded-xl bg-[#06140E] border border-amber-500/40 text-xs font-mono font-bold text-amber-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-300 mb-1">
                        Discount %
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={95}
                        value={emailDiscountInput}
                        onChange={(e) => setEmailDiscountInput(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#06140E] border border-amber-500/40 text-xs font-mono font-bold text-white"
                      />
                    </div>
                  </div>
                )}

                {emailDispatchFeedback && (
                  <div className="p-3 rounded-xl bg-[#00FFA3]/15 border border-[#00FFA3]/40 text-xs font-bold text-[#00FFA3]">
                    ✓ {emailDispatchFeedback}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#10B981] text-[#02120A] font-display font-extrabold text-xs cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,163,0.3)]"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Preset Event Email</span>
                </button>
              </form>

              {/* Right Dispatched Emails Registry & Branded HTML Preview */}
              <div className="lg:col-span-7 bg-[#06140E]/95 border border-emerald-500/35 rounded-3xl p-6 space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                  <div>
                    <h3 className="font-display text-base font-extrabold text-white">
                      Dispatched Branded Emails ({emailNotifications.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Click any email below to inspect its rendered FUNDED APEX HTML template.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                  {emailNotifications.map((mail) => {
                    const selected = (emailPreviewId || emailNotifications[0]?.id) === mail.id;
                    return (
                      <button
                        key={mail.id}
                        type="button"
                        onClick={() => setEmailPreviewId(mail.id)}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                          selected
                            ? 'bg-[#082218] border-[#00FFA3] shadow-[0_0_15px_rgba(0,255,163,0.2)]'
                            : 'bg-[#030A07] border-emerald-500/20 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#00FFA3]/15 border border-[#00FFA3]/35 text-[10px] font-mono font-bold text-[#00FFA3] uppercase">
                            {(mail.eventType || 'manual').replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(mail.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs font-extrabold text-white truncate">{mail.subject}</div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          To: <span className="text-[#00FFA3]">{mail.to}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const previewMail =
                    emailNotifications.find((m) => m.id === emailPreviewId) || emailNotifications[0];
                  if (!previewMail) return null;
                  return (
                    <div className="rounded-2xl bg-[#020806] border border-[#00FFA3]/30 overflow-hidden">
                      <div className="px-4 py-3 bg-[#05140E] border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="font-bold text-white truncate">{previewMail.subject}</div>
                        <div className="font-mono text-[11px] text-[#00FFA3]">
                          CTA: {previewMail.ctaLabel || 'Open Terminal'} → {previewMail.ctaUrl || 'https://fundedapex.com'}
                        </div>
                      </div>
                      <div
                        className="p-4 max-h-[400px] overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: previewMail.html }}
                      />
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB: IMAGE & MEDIA UPLOADS CENTER (QR CODES, CERTIFICATE SEAL, PROMO BANNERS & GALLERY) */}
      {tab === 'media' && isFullAdmin && (
        <section className="space-y-6 apex-fade-up">
          <div className="bg-[#06140E]/95 border border-emerald-500/35 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
              <div>
                <div className="text-xs font-mono font-extrabold text-[#00FFA3] uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>ADMIN IMAGE &amp; MEDIA UPLOAD STUDIO</span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white mt-1">
                  Upload &amp; Manage Platform Images, QR Codes &amp; Certificate Seals
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Upload images directly from your computer or phone. All uploaded images are saved persistently and updated across Checkout, Certificates, and Emails.
                </p>
              </div>
            </div>

            {paySavedMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-xs font-bold text-[#00FFA3] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{paySavedMsg}</span>
              </div>
            )}

            {/* All Gateway Coins QR & Address Uploaders + Certificate Seal + Promo Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {(
                [
                  {
                    label: '1. USDT (BEP-20) QR & Address',
                    qrField: 'cryptoUsdtBep20Qr' as keyof PaymentGatewaySettings,
                    addrField: 'cryptoUsdtBep20' as keyof PaymentGatewaySettings,
                  },
                  {
                    label: '2. USDT (TRC-20) QR & Address',
                    qrField: 'cryptoUsdtTrc20Qr' as keyof PaymentGatewaySettings,
                    addrField: 'cryptoUsdtTrc20' as keyof PaymentGatewaySettings,
                  },
                  {
                    label: '3. USDT (ERC-20) QR & Address',
                    qrField: 'cryptoUsdtErc20Qr' as keyof PaymentGatewaySettings,
                    addrField: 'cryptoUsdtErc20' as keyof PaymentGatewaySettings,
                  },
                  {
                    label: '4. BNB (BEP-20) QR & Address',
                    qrField: 'cryptoBnbBep20Qr' as keyof PaymentGatewaySettings,
                    addrField: 'cryptoBnbBep20' as keyof PaymentGatewaySettings,
                  },
                  {
                    label: '5. Bitcoin (BTC) QR & Address',
                    qrField: 'cryptoBtcQr' as keyof PaymentGatewaySettings,
                    addrField: 'cryptoBtcAddress' as keyof PaymentGatewaySettings,
                  },
                  {
                    label: '6. Ethereum (ETH) QR & Address',
                    qrField: 'cryptoEthQr' as keyof PaymentGatewaySettings,
                    addrField: 'cryptoEthAddress' as keyof PaymentGatewaySettings,
                  },
                  {
                    label: '7. Solana (SOL) QR & Address',
                    qrField: 'cryptoSolQr' as keyof PaymentGatewaySettings,
                    addrField: 'cryptoSolAddress' as keyof PaymentGatewaySettings,
                  },
                  {
                    label: '8. Arbitrum USDT QR & Address',
                    qrField: 'cryptoArbitrumQr' as keyof PaymentGatewaySettings,
                    addrField: 'cryptoArbitrumAddress' as keyof PaymentGatewaySettings,
                  },
                  {
                    label: '9. Aptos USDT QR & Address',
                    qrField: 'cryptoAptosQr' as keyof PaymentGatewaySettings,
                    addrField: 'cryptoAptosAddress' as keyof PaymentGatewaySettings,
                  },
                  {
                    label: '10. Official UPI QR & VPA ID',
                    qrField: 'upiQr' as keyof PaymentGatewaySettings,
                    addrField: 'upiId' as keyof PaymentGatewaySettings,
                  },
                ] as const
              ).map((slot) => {
                const qrVal = String(payForm[slot.qrField] || '');
                const addrVal = String(payForm[slot.addrField] || '');
                return (
                  <div
                    key={slot.label}
                    className="p-4 rounded-2xl bg-[#030A07] border border-emerald-500/30 space-y-2.5"
                  >
                    <div className="text-xs font-display font-extrabold text-white">
                      {slot.label}
                    </div>
                    <div className="h-28 rounded-xl bg-[#06140E] border border-emerald-500/25 flex items-center justify-center overflow-hidden p-2">
                      {qrVal ? (
                        <img
                          src={qrVal}
                          alt={slot.label}
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">Auto-Generated QR</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={addrVal}
                      onChange={(e) => {
                        const next = { ...payForm, [slot.addrField]: e.target.value };
                        setPayForm(next);
                        adminSavePaymentSettings(next);
                      }}
                      placeholder="Wallet Address / UPI ID"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#06140E] border border-emerald-500/35 text-[11px] font-mono text-[#00FFA3] outline-none"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQrFileUpload(slot.qrField, e.target.files?.[0])}
                      className="w-full text-[11px] text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-extrabold file:bg-[#00FFA3] file:text-[#030A07] file:cursor-pointer cursor-pointer"
                    />
                  </div>
                );
              })}

              {/* 11. Certificate Seal / Signature Image Upload */}
              <div className="p-4 rounded-2xl bg-[#030A07] border border-emerald-500/30 space-y-3">
                <div className="text-xs font-display font-extrabold text-white">
                  11. Trader Certificate Seal / Stamp
                </div>
                <div className="h-28 rounded-xl bg-[#06140E] border border-emerald-500/25 flex items-center justify-center overflow-hidden p-2">
                  {payForm.certificateSealImg ? (
                    <img
                      src={payForm.certificateSealImg}
                      alt="Certificate Seal"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">Upload Seal / Sign</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleQrFileUpload('certificateSealImg', e.target.files?.[0])}
                  className="w-full text-[11px] text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-extrabold file:bg-[#00FFA3] file:text-[#030A07] file:cursor-pointer cursor-pointer"
                />
              </div>

              {/* 12. Promo / Announcement Banner Image Upload */}
              <div className="p-4 rounded-2xl bg-[#030A07] border border-emerald-500/30 space-y-3">
                <div className="text-xs font-display font-extrabold text-white">
                  12. Promotional Email Banner
                </div>
                <div className="h-28 rounded-xl bg-[#06140E] border border-emerald-500/25 flex items-center justify-center overflow-hidden p-2">
                  {payForm.promoBannerImg ? (
                    <img
                      src={payForm.promoBannerImg}
                      alt="Promo Banner"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">Upload Promo Banner</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleQrFileUpload('promoBannerImg', e.target.files?.[0])}
                  className="w-full text-[11px] text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-extrabold file:bg-[#00FFA3] file:text-[#030A07] file:cursor-pointer cursor-pointer"
                />
              </div>
            </div>

            {/* General Multi-Image Gallery Uploader */}
            <div className="p-5 rounded-2xl bg-[#030A07] border border-emerald-500/30 space-y-4">
              <h3 className="font-display text-base font-extrabold text-white">
                Upload Custom Image to Admin Media Library
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Image Label / Title
                  </label>
                  <input
                    type="text"
                    value={mediaUploadTitle}
                    onChange={(e) => setMediaUploadTitle(e.target.value)}
                    placeholder="e.g. Diwali Promo Poster"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06140E] border border-emerald-500/35 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={mediaUploadCategory}
                    onChange={(e) => setMediaUploadCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06140E] border border-emerald-500/35 text-xs text-white"
                  >
                    <option value="PROMO_BANNER">Promotional Banner</option>
                    <option value="QR_CODE">Payment QR Code</option>
                    <option value="CERTIFICATE_SEAL">Certificate Seal / Stamp</option>
                    <option value="GENERAL">General Platform Image</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#00FFA3] mb-1">
                    Select Image File (PNG / JPG / WEBP)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleGalleryImageUpload(e.target.files?.[0])}
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-[#00FFA3] file:text-[#030A07] file:cursor-pointer cursor-pointer"
                  />
                </div>
              </div>

              {/* Uploaded Gallery Items */}
              {Array.isArray(payForm.adminGalleryImages) && payForm.adminGalleryImages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-emerald-500/20">
                  {payForm.adminGalleryImages.map((imgItem) => (
                    <div
                      key={imgItem.id}
                      className="p-3.5 rounded-2xl bg-[#06140E] border border-emerald-500/30 space-y-2.5"
                    >
                      <div className="h-36 rounded-xl bg-[#030A07] flex items-center justify-center overflow-hidden p-2 border border-white/10">
                        <img
                          src={imgItem.url}
                          alt={imgItem.title}
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate">
                          <div className="text-xs font-bold text-white truncate">{imgItem.title}</div>
                          <div className="text-[10px] font-mono text-[#00FFA3]">{imgItem.category}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setManualEmailUploadedImg(imgItem.url);
                              setManualBody(
                                (prev) =>
                                  `${prev}\n\n<div style="margin:16px 0;text-align:center;"><img src="${imgItem.url}" alt="${imgItem.title}" style="max-width:100%;max-height:320px;border-radius:14px;border:1px solid rgba(0,255,163,0.4);" /></div>`
                              );
                              setTab('emails');
                              setEmailSubTab('manual');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-[10px] font-mono font-bold text-[#00FFA3] cursor-pointer"
                          >
                            Use in Email
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextGallery = (payForm.adminGalleryImages || []).filter(
                                (x) => x.id !== imgItem.id
                              );
                              const nextSettings = { ...payForm, adminGalleryImages: nextGallery };
                              setPayForm(nextSettings);
                              adminSavePaymentSettings(nextSettings);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 cursor-pointer"
                            title="Delete Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      </div>
    </main>
  );
};
