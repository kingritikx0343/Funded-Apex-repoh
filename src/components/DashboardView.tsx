import React, { useState, useMemo } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  evaluateAccountRiskMetrics,
  evaluateAccountPayoutEligibility,
} from '../engine/tradingEngine';
import { COUNTRIES } from '../data/platformData';
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  FileCheck,
  Grid,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Send,
  Settings,
  Share2,
  Shield,
  Target,
  Terminal,
  TrendingUp,
  Trophy,
  Upload,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { TradePerformanceVisualizer } from './TradePerformanceVisualizer';

export type DashboardTabType =
  | 'overview'
  | 'dashboard'
  | 'challenges'
  | 'kyc'
  | 'certificates'
  | 'payouts'
  | 'settings'
  | 'affiliate';

export const DashboardView: React.FC = () => {
  const {
    user,
    navigate,
    accounts,
    activeAccount,
    setActiveAccountId,
    orders,
    challenges,
    notifications,
    userPurchaseRequests,
    emailNotifications,
    payouts,
    verifiedPayouts,
    paymentSettings,
    logout,
    openStripeCheckout,
    updateUserProfile,
    changeUserPassword,
    resendVerificationEmail,
    requestAccountPayout,
    pushNotification,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<DashboardTabType>('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [selectedNewChallengeId, setSelectedNewChallengeId] = useState<string>('two-step-5000');

  // Profile form state
  const [profileName, setProfileName] = useState(user?.fullName || '');
  const [profileCountry, setProfileCountry] = useState(user?.country || 'United States');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');

  // KYC form state
  const [kycDocType, setKycDocType] = useState('Passport');
  const [kycDocNumber, setKycDocNumber] = useState('');
  const [kycFrontImage, setKycFrontImage] = useState<string | null>(null);
  const [kycBackImage, setKycBackImage] = useState<string | null>(null);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycSubmittedSuccess, setKycSubmittedSuccess] = useState(false);

  // Payout Request form state attached to Challenge & P&L
  const [selectedPayoutAccountId, setSelectedPayoutAccountId] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState<number>(100);
  const [payoutMethod, setPayoutMethod] = useState<'USDT_BEP20' | 'USDT_TRC20' | 'WIRE' | 'USDC'>('USDT_BEP20');
  const [payoutWalletAddress, setPayoutWalletAddress] = useState('');
  const [payoutSubmittedMsg, setPayoutSubmittedMsg] = useState<string | null>(null);
  const [payoutErrorMsg, setPayoutErrorMsg] = useState<string | null>(null);

  // Certificates modal
  const [selectedCertificateModal, setSelectedCertificateModal] = useState<{
    title: string;
    accountSize: number;
    issueDate: string;
    traderName: string;
  } | null>(null);

  const userOrders = useMemo(
    () => (user ? orders.filter((o) => o.userId === user.uid) : []),
    [orders, user]
  );

  const activeAccOrders = useMemo(
    () =>
      activeAccount
        ? userOrders.filter((o) => o.accountId === activeAccount.id && o.status === 'OPEN')
        : [],
    [userOrders, activeAccount]
  );

  const closedOrders = useMemo(
    () => userOrders.filter((o) => o.status === 'CLOSED'),
    [userOrders]
  );

  const totalProfit = useMemo(
    () =>
      Math.round(
        closedOrders.filter((o) => o.netPnl > 0).reduce((s, o) => s + o.netPnl, 0) * 100
      ) / 100,
    [closedOrders]
  );

  const totalLoss = useMemo(
    () =>
      Math.round(
        Math.abs(closedOrders.filter((o) => o.netPnl < 0).reduce((s, o) => s + o.netPnl, 0)) * 100
      ) / 100,
    [closedOrders]
  );

  const winRatePct = useMemo(() => {
    if (closedOrders.length === 0) return 68.5;
    const wins = closedOrders.filter((o) => o.netPnl > 0).length;
    return Math.round((wins / closedOrders.length) * 1000) / 10;
  }, [closedOrders]);

  const riskMetrics = useMemo(() => {
    if (!activeAccount) return null;
    return evaluateAccountRiskMetrics(activeAccount, activeAccOrders);
  }, [activeAccount, activeAccOrders]);

  const activeAccountsCount = accounts.filter((a) => a.status === 'active').length;
  const completedChallengesCount = accounts.filter(
    (a) => a.status === 'passed' || a.status === 'completed'
  ).length;

  // Build equity curve points from closed orders or baseline
  const equityPoints = useMemo(() => {
    const start = activeAccount ? activeAccount.startingBalance : 0;
    const pts = [start];
    let running = start;
    const accClosed = activeAccount
      ? closedOrders.filter((o) => o.accountId === activeAccount.id).slice().reverse()
      : [];
    accClosed.forEach((o) => {
      running = Math.round((running + o.netPnl) * 100) / 100;
      pts.push(running);
    });
    if (activeAccount && pts[pts.length - 1] !== activeAccount.equity) {
      pts.push(activeAccount.equity);
    }
    if (pts.length < 6) {
      return [
        start,
        start,
        start,
        start,
        activeAccount ? activeAccount.balance : start,
        activeAccount ? activeAccount.equity : start,
      ];
    }
    return pts;
  }, [activeAccount, closedOrders]);

  const selectedPayoutAccount = useMemo(() => {
    return (
      accounts.find((a) => a.id === selectedPayoutAccountId) ||
      activeAccount ||
      accounts[0] ||
      null
    );
  }, [accounts, selectedPayoutAccountId, activeAccount]);

  const payoutEligibility = useMemo(() => {
    if (!selectedPayoutAccount) return null;
    const openForAcc = userOrders.filter(
      (o) => o.accountId === selectedPayoutAccount.id && o.status === 'OPEN'
    );
    const closedForAcc = userOrders.filter(
      (o) => o.accountId === selectedPayoutAccount.id && o.status === 'CLOSED'
    );
    return evaluateAccountPayoutEligibility(selectedPayoutAccount, openForAcc, closedForAcc);
  }, [selectedPayoutAccount, userOrders]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateUserProfile({ avatarUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycDocNumber.trim()) {
      pushNotification('KYC Validation', 'Please enter your Document Serial Number.', 'error');
      return;
    }
    setKycSubmitting(true);
    setTimeout(() => {
      setKycSubmitting(false);
      setKycSubmittedSuccess(true);
      updateUserProfile({ kycStatus: 'pending', kycDocType });
      pushNotification('KYC Documents Submitted ✓', 'Your identity verification is under review by Compliance.', 'success');
    }, 600);
  };

  if (!user) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-20 text-center space-y-4">
        <div className="apex-glass-card rounded-3xl p-8 space-y-4 max-w-md mx-auto">
          <h1 className="text-2xl font-display font-extrabold text-white">Authentication Required</h1>
          <p className="text-sm font-medium text-[#94B8AA]">
            Please sign in to access your FUNDED APEX Trader Dashboard.
          </p>
          <button
            type="button"
            onClick={() => navigate('login')}
            className="px-6 py-3 rounded-xl apex-glow-btn text-xs cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutErrorMsg(null);
    setPayoutSubmittedMsg(null);
    if (!selectedPayoutAccount) {
      setPayoutErrorMsg('No trading account found. Purchase a challenge account first.');
      return;
    }
    const res = requestAccountPayout({
      accountId: selectedPayoutAccount.id,
      amountUsd: payoutAmount,
      method:
        payoutMethod === 'USDT_BEP20'
          ? 'USD (USDT BEP-20)'
          : payoutMethod === 'USDT_TRC20'
          ? 'USD (USDT TRC-20)'
          : payoutMethod === 'USDC'
          ? 'USD (USDC)'
          : 'USD (Wire)',
      destination: payoutWalletAddress,
    });
    if (!res.ok) {
      setPayoutErrorMsg(res.error || 'Account is not eligible for payout.');
      pushNotification('Payout Locked', res.error || 'Payout conditions not met.', 'error');
      return;
    }
    setPayoutSubmittedMsg(
      `Approved & Disbursed $${payoutAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
      })} USD from Account #${selectedPayoutAccount.accountNumber} (${selectedPayoutAccount.challengeTitle}) via ${payoutMethod.replace('_', ' ')}!`
    );
    setPayoutWalletAddress('');
  };

  const handleCopyReferral = () => {
    const link = `https://fundedapex.com/?ref=${user.referralCode}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    pushNotification('Copied Link', `Partner referral link copied: ${link}`, 'info');
  };

  const menuItems: { id: DashboardTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Grid className="w-4 h-4 text-[#00FFA3]" /> },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4 text-[#00FFA3]" /> },
    { id: 'challenges', label: 'Challenges', icon: <Trophy className="w-4 h-4 text-[#00FFA3]" /> },
    { id: 'kyc', label: 'KYC', icon: <UserCheck className="w-4 h-4 text-[#00FFA3]" /> },
    { id: 'certificates', label: 'Certificates', icon: <Award className="w-4 h-4 text-[#00FFA3]" /> },
    { id: 'payouts', label: 'Payouts', icon: <Wallet className="w-4 h-4 text-[#00FFA3]" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 text-[#00FFA3]" /> },
    { id: 'affiliate', label: 'Affiliate', icon: <Users className="w-4 h-4 text-[#00FFA3]" /> },
  ];

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* SIDE DRAWER OVERLAY */}
      {isDrawerOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-[#020806]/80 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* SLIDE-OUT 3-LINES SIDE DRAWER MENU */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#04100B]/95 border-r border-[#00FFA3]/30 backdrop-blur-2xl p-6 shadow-2xl transition-transform duration-300 ease-out flex flex-col justify-between ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/IMG_20261108_140853_727c5a1e.png"
                alt="FUNDED APEX"
                className="w-8 h-8 object-contain rounded-full shadow-[0_0_12px_rgba(0,255,163,0.5)]"
              />
              <span className="font-display font-extrabold text-white text-base tracking-tight">
                FUNDED <span className="text-[#00FFA3]">APEX</span>
              </span>
            </div>
            <button
              type="button"
              aria-label="Close menu drawer"
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 rounded-xl bg-[#081C14] text-[#94B8AA] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1.5" aria-label="Dashboard drawer menu">
            {(user.role === 'admin' ||
              user.role === 'super_admin' ||
              user.email.toLowerCase() === 'kingritikx0343@gmail.com') && (
              <button
                type="button"
                data-testid="drawer-admin-access-btn"
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('admin');
                }}
                className="w-full px-4 py-3 rounded-2xl text-xs font-display font-extrabold flex items-center justify-between gap-3 bg-gradient-to-r from-[#00FFA3]/25 via-emerald-500/20 to-teal-500/20 border border-[#00FFA3] text-[#00FFA3] hover:bg-[#00FFA3] hover:text-[#030A07] transition-all cursor-pointer shadow-[0_0_20px_rgba(0,255,163,0.3)] mb-2"
              >
                <span className="flex items-center gap-3">
                  <Shield className="w-4 h-4 stroke-[2.5]" />
                  <span>Admin Access</span>
                </span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-display font-bold flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-[#00FFA3]/15 border border-[#00FFA3]/50 text-white shadow-[0_0_20px_rgba(0,255,163,0.25)]'
                    : 'text-[#94B8AA] hover:bg-[#081C14] hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* BOTTOM TELEGRAM BUTTON INSIDE DRAWER */}
        <div className="pt-4 border-t border-emerald-500/20 space-y-3">
          <a
            href="https://t.me/fundedapex"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-[#00FFA3]/20 to-teal-500/20 border border-[#00FFA3]/40 text-xs font-display font-extrabold text-[#00FFA3] hover:text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_18px_rgba(0,255,163,0.25)]"
          >
            <Send className="w-4 h-4 text-[#00FFA3]" />
            <span>Join Telegram Community</span>
          </a>
          <div className="text-[10px] text-center font-mono text-[#94B8AA]">
            Official Support &amp; Announcements
          </div>

          <button
            type="button"
            onClick={() => {
              setIsDrawerOpen(false);
              logout();
              navigate('login');
            }}
            className="w-full py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-[#FF88A5] hover:text-white text-xs font-display font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_16px_rgba(244,63,94,0.2)]"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* TOP HEADER ROW: SLEEK BORDERLESS HEADER WITH LOGO & PROFILE DIRECTLY OPPOSITE IN SAME LINE */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-emerald-500/20">
        {/* TOP-LEFT: 3-LINES MENU BUTTON + BRAND LOGO BADGE */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            aria-label="Open side menu drawer"
            onClick={() => setIsDrawerOpen(true)}
            className="p-2.5 rounded-xl bg-[#04100B] border border-[#00FFA3]/50 text-[#00FFA3] hover:bg-[#00FFA3]/15 transition-all cursor-pointer shadow-[0_0_16px_rgba(0,255,163,0.3)] flex items-center gap-2 font-display font-extrabold text-xs"
          >
            <Menu className="w-5 h-5 stroke-[2.8]" />
            <span className="hidden sm:inline">MENU</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#04100B]/80 border border-emerald-500/30">
            <img
              src="/assets/aistudio/IMG_20261108_140853_727c5a1e.png"
              alt="FUNDED APEX"
              className="w-7 h-7 object-contain rounded-full shadow-[0_0_8px_rgba(0,255,163,0.5)]"
            />
            <span className="font-display font-bold text-white text-sm tracking-tight whitespace-nowrap">
              FUNDED <span className="text-[#00FFA3]">APEX</span>
            </span>
          </div>
        </div>

        {/* TOP-RIGHT: ACCOUNT SELECTOR & CLICKABLE PROFILE CORNER DROPDOWN DIRECTLY OPPOSITE LOGO */}
        <div className="flex items-center gap-2.5 ml-auto relative shrink-0">
          {/* Account Selector */}
          {accounts.length > 0 && (
            <select
              aria-label="Select active evaluation account"
              value={activeAccount?.id || ''}
              onChange={(e) => setActiveAccountId(e.target.value)}
              className="hidden md:block px-3 py-2 rounded-xl bg-[#04100B] border border-emerald-500/40 text-xs font-mono font-extrabold text-white max-w-[190px] truncate focus:outline-none focus:border-[#00FFA3]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  #{acc.accountNumber} · ${acc.startingBalance.toLocaleString()}
                </option>
              ))}
            </select>
          )}

          {/* Clickable Profile Badge in the Corner */}
          <div className="relative">
            <button
              type="button"
              data-testid="dashboard-profile-corner-btn"
              aria-expanded={isProfileMenuOpen}
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-2xl bg-[#04100B]/95 hover:bg-[#071C13] border border-[#00FFA3]/45 transition-all cursor-pointer shadow-[0_0_18px_rgba(0,255,163,0.2)]"
            >
              {/* Avatar Badge */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl p-[1.5px] bg-gradient-to-br from-[#00FFA3] via-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(0,255,163,0.35)]">
                  <div className="w-full h-full rounded-[10px] bg-[#04100B] flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-display font-black text-[#00FFA3]">
                        {user.fullName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  title="Verified Prop Trader"
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00FFA3] text-[#030A07] flex items-center justify-center border border-[#030A07]"
                >
                  <Shield className="w-2 h-2 stroke-[3]" />
                </div>
              </div>

              {/* Trader Name & Role */}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-display font-extrabold text-white flex items-center gap-1.5 leading-tight">
                  <span className="max-w-[130px] truncate">{user.fullName}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-[#00FFA3]/40 text-[#00FFA3] text-[9px] font-mono">
                    {user.role.toUpperCase()}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[#94B8AA] mt-0.5">
                  ID: <strong className="text-[#00FFA3]">{user.referralCode}</strong>
                </div>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-[#00FFA3] transition-transform duration-200 ${
                  isProfileMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Profile Corner Dropdown Menu (Shows Logout & Profile Options on Click) */}
            {isProfileMenuOpen && (
              <>
                <div
                  aria-hidden="true"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="fixed inset-0 z-40"
                />
                <div
                  data-testid="dashboard-profile-dropdown"
                  className="absolute right-0 mt-2.5 w-72 rounded-2xl bg-[#04110C]/98 border border-[#00FFA3]/45 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-4 space-y-3.5 z-50 apex-scale-in"
                >
                  {/* User Identity Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-emerald-500/20">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-[#00FFA3]/45 flex items-center justify-center font-display font-black text-base text-[#00FFA3] shrink-0">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-display font-extrabold text-white truncate">
                        {user.fullName}
                      </div>
                      <div className="text-[11px] font-mono text-[#00FFA3] truncate">
                        {user.email}
                      </div>
                      <div className="text-[10px] font-mono text-[#94B8AA] mt-0.5">
                        ID: {user.referralCode} · {user.country}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Account Switcher inside Profile Dropdown */}
                  {accounts.length > 0 && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-[#94B8AA]">
                        Active Trading Account
                      </label>
                      <select
                        value={activeAccount?.id || ''}
                        onChange={(e) => setActiveAccountId(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#030A07] border border-emerald-500/35 text-xs font-mono font-bold text-white"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            #{acc.accountNumber} · ${acc.startingBalance.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Quick Profile Navigation Links */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('settings');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-emerald-500/15 text-left text-xs font-display font-bold text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-[#00FFA3]" />
                      <span>Profile &amp; Security Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('challenges');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-emerald-500/15 text-left text-xs font-display font-bold text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Trophy className="w-4 h-4 text-[#00FFA3]" />
                      <span>My Trading Accounts &amp; Passcodes</span>
                    </button>
                  </div>

                  {/* Logout Button inside Profile Click Menu */}
                  <div className="pt-2 border-t border-emerald-500/20">
                    <button
                      type="button"
                      data-testid="profile-dropdown-logout-btn"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                        navigate('login');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/45 text-[#FF88A5] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-display font-extrabold shadow-[0_0_16px_rgba(244,63,94,0.25)]"
                    >
                      <LogOut className="w-4 h-4 stroke-[2.5]" />
                      <span>Logout Account</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* OVERVIEW TAB (Matching Video Layout) */}
      {activeTab === 'overview' && (
        <div className="space-y-8 apex-fade-up">
          {/* 4 STATUS METRIC GRID TILES (Matching Video) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="apex-glass-card rounded-3xl p-6 space-y-2">
              <div className="text-xs font-display font-extrabold uppercase tracking-wider text-[#94B8AA]">
                Delivered Accounts
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">
                {accounts.length} / {accounts.length}
              </div>
              <div className="text-[11px] text-[#00FFA3] font-bold">Total accounts provisioned</div>
            </div>

            <div className="apex-glass-card rounded-3xl p-6 space-y-2">
              <div className="text-xs font-display font-extrabold uppercase tracking-wider text-[#94B8AA]">
                Active Accounts
              </div>
              <div className="text-3xl font-extrabold text-[#00FFA3] font-mono">
                {activeAccountsCount} / {accounts.length}
              </div>
              <div className="text-[11px] text-emerald-300 font-bold">Currently active evaluations</div>
            </div>

            <div className="apex-glass-card rounded-3xl p-6 space-y-2">
              <div className="text-xs font-display font-extrabold uppercase tracking-wider text-[#94B8AA]">
                KYC Status
              </div>
              <div className="text-xl font-extrabold text-white font-display">
                {user.kycStatus === 'verified'
                  ? 'Verified ✓'
                  : user.kycStatus === 'pending'
                  ? 'Pending Review'
                  : 'Not Submitted'}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('kyc')}
                className="text-[11px] text-[#00FFA3] hover:underline font-bold cursor-pointer"
              >
                Complete identity verification →
              </button>
            </div>

            <div className="apex-glass-card rounded-3xl p-6 space-y-2">
              <div className="text-xs font-display font-extrabold uppercase tracking-wider text-[#94B8AA]">
                Payout Status
              </div>
              <div className="text-xl font-extrabold text-white font-display">
                {verifiedPayouts.length > 0 ? 'Verified Trader' : 'No payout requested'}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('payouts')}
                className="text-[11px] text-[#00FFA3] hover:underline font-bold cursor-pointer"
              >
                Request performance settlement →
              </button>
            </div>
          </section>

          {/* SELECT ACCOUNT DROPDOWN & EMPTY STATE BANNER */}
          {accounts.length === 0 ? (
            <div className="apex-glass-card rounded-3xl p-8 space-y-6 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-[#00FFA3]/40 flex items-center justify-center mx-auto text-[#00FFA3]">
                <Trophy className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-extrabold text-white">No account yet...</h2>
                <p className="text-sm text-[#94B8AA] max-w-md mx-auto leading-relaxed">
                  Start your prop evaluation challenge from $5,000 ($10 with code 5K30OFF) to $200,000 and trade live with institutional capital.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('challenges')}
                  className="px-8 py-3.5 rounded-2xl apex-glow-btn text-xs font-display font-extrabold cursor-pointer shadow-[0_0_24px_rgba(0,255,163,0.35)]"
                >
                  Open Challenges ($5,000 to $200,000) →
                </button>
              </div>
            </div>
          ) : (
            <div className="apex-glass-card rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1.5 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-display font-extrabold text-[#00FFA3] uppercase tracking-wider">
                    Active Purchased Account
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase ${
                      activeAccount?.status === 'failed'
                        ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
                        : activeAccount?.status === 'passed'
                        ? 'bg-emerald-500/25 border border-[#00FFA3] text-[#00FFA3]'
                        : 'bg-emerald-500/15 border border-[#00FFA3]/40 text-[#00FFA3]'
                    }`}
                  >
                    {activeAccount?.status === 'failed'
                      ? 'BREACHED (DRAWDOWN VIOLATION)'
                      : activeAccount?.status === 'passed'
                      ? 'PASSED • FUNDED'
                      : activeAccount?.challengeType === 'instant'
                      ? 'INSTANT FUNDED'
                      : `ACTIVE • PHASE ${activeAccount?.currentStep || 1} OF ${
                          activeAccount?.totalSteps || 2
                        }`}
                  </span>
                </div>
                <h2 className="text-xl font-display font-extrabold text-white">
                  #{activeAccount?.accountNumber} — {activeAccount?.challengeTitle}
                </h2>
                {activeAccount?.status === 'failed' && activeAccount?.breachReason && (
                  <div className="text-xs font-bold text-rose-400">
                    ⚠ {activeAccount.breachReason}
                  </div>
                )}
                <div className="text-xs font-mono text-[#94B8AA] flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span>Terminal User ID:</span>
                    <strong className="text-[#00FFA3] font-mono px-2 py-0.5 rounded-md bg-[#030A07] border border-[#00FFA3]/40">
                      {activeAccount?.terminalUserId || 'APEX-MASTER'}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Terminal Password:</span>
                    {activeAccount?.status === 'failed' || !activeAccount?.terminalPassword ? (
                      <strong className="text-rose-400 font-mono px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/50">
                        REMOVED (BREACHED)
                      </strong>
                    ) : (
                      <strong className="text-[#00FFA3] font-mono px-2 py-0.5 rounded-md bg-[#030A07] border border-[#00FFA3]/40">
                        {activeAccount.terminalPassword}
                      </strong>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (activeAccount) setActiveAccountId(activeAccount.id);
                    navigate('terminal');
                  }}
                  className="px-6 py-3 rounded-2xl apex-glow-btn text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-[0_0_24px_rgba(0,255,163,0.35)]"
                >
                  <Terminal className="w-4 h-4 stroke-[2.5]" />
                  <span>Launch Live Terminal →</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeAccount) setSelectedPayoutAccountId(activeAccount.id);
                    setActiveTab('payouts');
                  }}
                  className="px-4 py-3 rounded-2xl bg-[#081C14] hover:bg-emerald-500/20 border border-[#00FFA3]/40 text-xs font-bold text-[#00FFA3] cursor-pointer"
                >
                  P&amp;L Payouts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="px-4 py-3 rounded-2xl bg-[#081C14] hover:bg-emerald-500/20 border border-[#00FFA3]/40 text-xs font-bold text-[#00FFA3] cursor-pointer"
                >
                  View P&amp;L Analytics
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DASHBOARD TAB (P&L, Balance Curve & Days Profit Chart) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 apex-fade-up">
          {/* TELEMETRY CARDS GRID */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="apex-metric-tile p-5 rounded-3xl">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6EE7B7]">
                Starting Capital
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1.5">
                ${(activeAccount?.startingBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </div>
            </div>
            <div className="apex-metric-tile p-5 rounded-3xl">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6EE7B7]">
                Total Balance
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1.5">
                ${(activeAccount?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="apex-metric-tile p-5 rounded-3xl">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6EE7B7]">
                Current Equity
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#00FFA3] font-mono mt-1.5">
                ${(riskMetrics?.equity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="apex-metric-tile p-5 rounded-3xl">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6EE7B7]">
                Realized Profit
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#00FFA3] font-mono mt-1.5">
                +${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="apex-metric-tile p-5 rounded-3xl">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6EE7B7]">
                Realized Loss
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-rose-400 font-mono mt-1.5">
                -${totalLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="apex-metric-tile p-5 rounded-3xl">
              <div className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6EE7B7]">
                Win Rate
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1.5">
                {winRatePct}%
              </div>
            </div>
          </section>

          {/* TRADE PERFORMANCE VISUALIZER & DAYS PROFIT CHART */}
          <TradePerformanceVisualizer
            activeAccount={activeAccount}
            orders={
              activeAccount
                ? userOrders.filter((o) => o.accountId === activeAccount.id)
                : userOrders
            }
            onOpenTerminal={() => navigate('terminal')}
          />

          {/* BALANCE & EQUITY CURVE */}
          <section className="apex-glass-card rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-display font-extrabold text-white">
                  Balance & Equity Curve
                </h2>
                <p className="text-xs font-semibold text-[#94B8AA] mt-0.5">
                  {activeAccount
                    ? `Account #${activeAccount.accountNumber} · Real-Time Performance`
                    : 'No Active Evaluation Selected'}
                </p>
              </div>
              <span className="text-xs font-mono font-extrabold text-[#00FFA3]">
                Start: ${(activeAccount?.startingBalance ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="h-56 w-full apex-glass-panel rounded-2xl p-4 flex flex-col justify-between">
              <svg className="w-full h-40 overflow-visible" viewBox="0 0 600 140">
                <defs>
                  <linearGradient id="eqGradDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00FFA3" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const minVal = Math.min(...equityPoints) * 0.998;
                  const maxVal = Math.max(...equityPoints) * 1.002;
                  const span = Math.max(1, maxVal - minVal);
                  const coords = equityPoints.map((val, idx) => {
                    const x = (idx / Math.max(1, equityPoints.length - 1)) * 580 + 10;
                    const y = 130 - ((val - minVal) / span) * 110;
                    return `${x},${y}`;
                  });
                  const polylinePoints = coords.join(' ');
                  const areaPoints = `10,130 ${polylinePoints} 590,130`;
                  return (
                    <>
                      <polygon points={areaPoints} fill="url(#eqGradDash)" />
                      <polyline
                        fill="none"
                        stroke="#00FFA3"
                        strokeWidth="3"
                        points={polylinePoints}
                      />
                    </>
                  );
                })()}
              </svg>
            </div>
          </section>
        </div>
      )}

      {/* CHALLENGES TAB */}
      {activeTab === 'challenges' && (
        <section className="space-y-8 apex-fade-up">
          {/* 1. YOUR PURCHASED ACCOUNTS SECTION WITH LAUNCH TERMINAL BUTTON & PASSCODE */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-display font-extrabold text-white">
                  Your Active Evaluation Accounts ({accounts.length})
                </h2>
                <p className="text-xs text-[#94B8AA] mt-0.5">
                  Launch the live trading terminal directly from your challenge section below.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('terminal')}
                  className="px-5 py-2.5 rounded-2xl bg-[#04120C] border border-[#00FFA3] text-[#00FFA3] hover:bg-[#00FFA3] hover:text-[#030A07] text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_18px_rgba(0,255,163,0.25)]"
                >
                  <Terminal className="w-4 h-4 stroke-[2.5]" />
                  <span>Open Challenge Terminal →</span>
                </button>
                <button
                  type="button"
                  onClick={() => openStripeCheckout('two-step-5000', '5K30OFF')}
                  className="px-5 py-2.5 rounded-2xl apex-glow-btn text-xs font-extrabold cursor-pointer"
                >
                  + Buy New Evaluation
                </button>
              </div>
            </div>

            {accounts.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#04100B] border border-emerald-500/20 text-center space-y-4">
                <Trophy className="w-10 h-10 text-[#00FFA3] mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-display font-extrabold text-white">No active evaluation accounts yet</h3>
                  <p className="text-xs text-[#94B8AA] max-w-md mx-auto">
                    Select an evaluation model from the challenge catalog below or open the Challenge Terminal with your Terminal User ID &amp; Password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('terminal')}
                  className="px-6 py-3 rounded-2xl apex-glow-btn text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,255,163,0.3)]"
                >
                  <Terminal className="w-4 h-4 stroke-[2.5]" />
                  <span>Launch Challenge Trading Terminal →</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`apex-glass-card rounded-3xl p-6 space-y-4 transition-all ${
                      acc.id === activeAccount?.id ? 'ring-2 ring-[#00FFA3] shadow-[0_0_24px_rgba(0,255,163,0.25)]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                      <span className="font-mono text-xs font-extrabold text-[#00FFA3]">
                        #{acc.accountNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          acc.status === 'failed'
                            ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
                            : acc.status === 'passed'
                            ? 'bg-emerald-500/25 border border-[#00FFA3] text-[#00FFA3]'
                            : 'bg-emerald-500/15 border border-[#00FFA3]/40 text-[#00FFA3]'
                        }`}
                      >
                        {acc.status === 'failed'
                          ? 'BREACHED'
                          : acc.status === 'passed'
                          ? 'PASSED • FUNDED'
                          : acc.challengeType === 'instant'
                          ? 'INSTANT FUNDED'
                          : `PHASE ${acc.currentStep || 1}/${acc.totalSteps || 2}`}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-lg font-display font-extrabold text-white">
                        {acc.challengeTitle}
                      </h3>
                      {acc.status === 'failed' && acc.breachReason && (
                        <div className="text-[11px] font-bold text-rose-400">
                          ⚠ {acc.breachReason}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                        <div className="p-2 rounded-xl bg-[#030A07] border border-[#00FFA3]/30">
                          <span className="text-[#94B8AA] block text-[9px] uppercase">Terminal User ID</span>
                          <strong className="text-[#00FFA3]">{acc.terminalUserId || 'APEX-MASTER'}</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-[#030A07] border border-[#00FFA3]/30">
                          <span className="text-[#94B8AA] block text-[9px] uppercase">Terminal Password</span>
                          {acc.status === 'failed' || !acc.terminalPassword ? (
                            <strong className="text-rose-400">REMOVED (BREACHED)</strong>
                          ) : (
                            <strong className="text-[#00FFA3]">{acc.terminalPassword}</strong>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs border-t border-emerald-500/20 pt-3">
                      <div className="flex justify-between">
                        <span className="text-[#94B8AA] font-semibold">Balance</span>
                        <span className="font-mono font-extrabold text-white">
                          ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#94B8AA] font-semibold">Equity</span>
                        <span className="font-mono font-extrabold text-[#00FFA3]">
                          ${acc.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#94B8AA] font-semibold">Realized P&amp;L</span>
                        <span
                          className={`font-mono font-extrabold ${
                            acc.balance - acc.startingBalance >= 0 ? 'text-[#00FFA3]' : 'text-rose-400'
                          }`}
                        >
                          {acc.balance - acc.startingBalance >= 0 ? '+' : ''}$
                          {(acc.balance - acc.startingBalance).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAccountId(acc.id);
                          navigate('terminal');
                        }}
                        className="py-3 px-3 rounded-2xl apex-glow-btn text-xs font-display font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(0,255,163,0.3)]"
                      >
                        <Terminal className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Terminal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayoutAccountId(acc.id);
                          setActiveTab('payouts');
                        }}
                        className="py-3 px-3 rounded-2xl bg-[#081C14] hover:bg-emerald-500/20 border border-[#00FFA3]/40 text-xs font-display font-extrabold text-[#00FFA3] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Payout P&amp;L</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. CATALOG OF ALL AVAILABLE CHALLENGE PACKAGES ($5K TO $200K) */}
          <div className="space-y-4 pt-6 border-t border-emerald-500/20">
            <div>
              <h2 className="text-2xl font-display font-extrabold text-white">
                All Challenge Programs Catalog
              </h2>
              <p className="text-xs text-[#94B8AA] mt-0.5">
                Select any evaluation program tier from $5,000 to $200,000 to buy and activate instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {challenges.map((ch) => (
                <div
                  key={ch.id}
                  className="apex-glass-card rounded-3xl p-6 space-y-4 border border-emerald-500/30 hover:border-[#00FFA3]/60 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-[#00FFA3]/40 text-[10px] font-mono font-bold text-[#00FFA3] uppercase">
                        {ch.typeLabel}
                      </span>
                      <span className="font-mono text-lg font-extrabold text-[#00FFA3]">
                        ${ch.priceUsd}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-display font-extrabold text-white">
                        ${ch.accountSize.toLocaleString()} USD
                      </h3>
                      <div className="text-xs text-[#94B8AA] mt-0.5">{ch.title}</div>
                    </div>

                    <div className="space-y-2 text-xs bg-[#04100B] p-3.5 rounded-2xl border border-emerald-500/20">
                      <div className="flex justify-between">
                        <span className="text-[#94B8AA]">Profit Target</span>
                        <span className="font-mono font-bold text-white">{ch.profitTargetPct}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#94B8AA]">Max Daily Drawdown</span>
                        <span className="font-mono font-bold text-white">{ch.dailyDrawdownPct}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#94B8AA]">Max Overall Drawdown</span>
                        <span className="font-mono font-bold text-white">{ch.maxDrawdownPct}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#94B8AA]">Profit Split</span>
                        <span className="font-mono font-bold text-[#00FFA3]">Up to {ch.profitSplitPct}%</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openStripeCheckout(ch.id)}
                    className="w-full py-3.5 rounded-2xl apex-glow-btn text-xs font-display font-extrabold uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(0,255,163,0.3)] mt-2"
                  >
                    Buy Challenge — ${ch.priceUsd}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* KYC TAB */}
      {activeTab === 'kyc' && (
        <section className="max-w-3xl mx-auto apex-fade-up">
          <div className="apex-glass-card rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
              <div>
                <h2 className="text-2xl font-display font-extrabold text-white flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-[#00FFA3]" />
                  <span>Trader Identity Verification (KYC)</span>
                </h2>
                <p className="text-xs text-[#94B8AA] mt-1">
                  Upload official government ID to verify your trader profile and unlock direct payout settlements.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-[#00FFA3]/40 text-xs font-extrabold text-[#00FFA3]">
                Status: {user.kycStatus?.toUpperCase() || 'NOT SUBMITTED'}
              </span>
            </div>

            {kycSubmittedSuccess ? (
              <div className="p-6 rounded-2xl bg-[#04100B] border border-[#00FFA3]/40 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#00FFA3] mx-auto" />
                <h3 className="text-xl font-display font-extrabold text-white">KYC Submitted Successfully!</h3>
                <p className="text-xs text-[#94B8AA] max-w-md mx-auto">
                  Our compliance desk is processing your identity documents. Verification typically completes within 12–24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleKycSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-[#040E0A] border border-emerald-500/35 text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">
                      Document Type
                    </label>
                    <select
                      value={kycDocType}
                      onChange={(e) => setKycDocType(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-[#040E0A] border border-emerald-500/35 text-xs text-white font-bold"
                    >
                      <option value="Passport">International Passport</option>
                      <option value="National ID">National ID Card / Aadhaar</option>
                      <option value="Driver License">Driver's License</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">
                    Document Number / Serial
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter document number"
                    value={kycDocNumber}
                    onChange={(e) => setKycDocNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#040E0A] border border-emerald-500/35 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">
                      Front Side Photo Upload
                    </label>
                    <label className="h-32 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-[#040E0A] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#00FFA3]/50 transition-all">
                      <Upload className="w-6 h-6 text-[#00FFA3]" />
                      <span className="text-[11px] font-bold text-white">Click to Upload Front ID</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setKycFrontImage(URL.createObjectURL(f));
                        }}
                        className="hidden"
                      />
                    </label>
                    {kycFrontImage && (
                      <div className="mt-2 text-[11px] font-bold text-[#00FFA3]">Front ID Selected ✓</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">
                      Back Side Photo Upload
                    </label>
                    <label className="h-32 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-[#040E0A] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#00FFA3]/50 transition-all">
                      <Upload className="w-6 h-6 text-[#00FFA3]" />
                      <span className="text-[11px] font-bold text-white">Click to Upload Back ID</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setKycBackImage(URL.createObjectURL(f));
                        }}
                        className="hidden"
                      />
                    </label>
                    {kycBackImage && (
                      <div className="mt-2 text-[11px] font-bold text-[#00FFA3]">Back ID Selected ✓</div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={kycSubmitting}
                  className="w-full py-4 rounded-2xl apex-glow-btn text-xs font-display font-extrabold cursor-pointer"
                >
                  {kycSubmitting ? 'Submitting Documents...' : 'Submit Identity Documents for Verification'}
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* CERTIFICATES TAB */}
      {activeTab === 'certificates' && (
        <section className="space-y-8 apex-fade-up">
          <div className="apex-glass-card rounded-3xl p-7 space-y-2">
            <h2 className="text-2xl font-display font-extrabold text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-[#00FFA3]" />
              <span>Trader Certificates & Achievements</span>
            </h2>
            <p className="text-xs text-[#94B8AA]">
              View and download your official FUNDED APEX Prop Trader Certificates for passed evaluation accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Funded Evaluation Certificate', size: 1000, date: 'Nov 2026' },
              { title: 'Prop Trader Master Certificate', size: 50000, date: 'Oct 2026' },
              { title: 'Apex Elite Trader Award', size: 100000, date: 'Sep 2026' },
            ].map((cert) => (
              <div key={cert.title} className="apex-glass-card rounded-3xl p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00FFA3]/15 border border-[#00FFA3]/40 flex items-center justify-center text-[#00FFA3]">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-extrabold text-white">{cert.title}</h3>
                  <div className="text-xs text-[#00FFA3] font-mono font-bold mt-1">
                    Simulated Capital: ${cert.size.toLocaleString()} USD
                  </div>
                  <div className="text-[11px] text-[#94B8AA] mt-0.5">Issued: {cert.date}</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCertificateModal({
                      title: cert.title,
                      accountSize: cert.size,
                      issueDate: cert.date,
                      traderName: user.fullName,
                    })
                  }
                  className="w-full py-3 rounded-2xl bg-[#081C14] hover:bg-emerald-500/20 border border-[#00FFA3]/40 text-xs font-extrabold text-[#00FFA3] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>View Certificate PDF</span>
                </button>
              </div>
            ))}
          </div>

          {/* CERTIFICATE PREVIEW MODAL */}
          {selectedCertificateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020806]/85 backdrop-blur-md">
              <div className="w-full max-w-2xl bg-[#04100B] border-2 border-[#00FFA3]/50 rounded-3xl p-8 space-y-6 text-center shadow-[0_0_80px_rgba(0,255,163,0.3)]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <img src="/assets/aistudio/IMG_20261108_140853_727c5a1e.png" alt="FUNDED APEX" className="w-8 h-8 rounded-full" />
                    <span className="font-display font-black text-white text-lg">FUNDED APEX</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCertificateModal(null)}
                    className="p-2 rounded-xl bg-[#081C14] text-[#94B8AA] hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="border-4 border-double border-[#00FFA3]/40 p-8 rounded-2xl space-y-4 bg-gradient-to-b from-[#071911] to-[#04100B]">
                  <Award className="w-16 h-16 text-[#00FFA3] mx-auto" />
                  <h3 className="text-3xl font-display font-black text-white uppercase tracking-wider">
                    Certificate of Excellence
                  </h3>
                  <p className="text-xs text-[#94B8AA]">This is to certify that</p>
                  <h4 className="text-2xl font-display font-black text-[#00FFA3]">
                    {selectedCertificateModal.traderName}
                  </h4>
                  <p className="text-xs text-[#94B8AA] max-w-md mx-auto">
                    has successfully passed the official FUNDED APEX Prop Trading Evaluation for simulated capital allocation of ${selectedCertificateModal.accountSize.toLocaleString()} USD.
                  </p>
                  <div className="text-xs font-mono font-bold text-white pt-4">
                    Issue Date: {selectedCertificateModal.issueDate} · Verification ID: APEX-CERT-{Math.floor(100000 + Math.random() * 900000)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    pushNotification('Certificate Downloaded', 'Saved PDF certificate copy to downloads.', 'success');
                    setSelectedCertificateModal(null);
                  }}
                  className="px-8 py-3.5 rounded-2xl apex-glow-btn text-xs font-bold cursor-pointer"
                >
                  Download Official PDF →
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* PAYOUTS TAB — DIRECTLY ATTACHED TO CHALLENGE STEP COMPLETION & ACCOUNT P&L */}
      {activeTab === 'payouts' && (
        <section className="space-y-8 apex-fade-up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="apex-glass-card rounded-3xl p-7 space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-display font-extrabold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#00FFA3]" />
                  <span>Challenge P&amp;L Performance Payout</span>
                </h2>
                <p className="text-xs text-[#94B8AA] leading-relaxed">
                  Payouts are directly linked to your Trading Account P&amp;L and Challenge Rules:
                  <strong className="text-white"> Instant Funding</strong> accounts can withdraw profit immediately when P&amp;L &gt; $0; <strong className="text-white">1-Step, 2-Step, and 3-Step</strong> challenges unlock payouts once all evaluation steps are passed and P&amp;L &gt; $0.
                </p>
              </div>

              {accounts.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#04100B] border border-emerald-500/25 text-center space-y-3">
                  <p className="text-xs text-[#94B8AA]">
                    You do not have any trading accounts yet. Purchase an Instant or Multi-Step Challenge and generate positive P&amp;L to unlock payouts.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('challenges')}
                    className="px-5 py-2.5 rounded-xl apex-glow-btn text-xs font-extrabold cursor-pointer"
                  >
                    Browse Challenges →
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Challenge Account Selector */}
                  <div>
                    <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">
                      1. Select Challenge Trading Account
                    </label>
                    <select
                      value={selectedPayoutAccount?.id || ''}
                      onChange={(e) => {
                        setSelectedPayoutAccountId(e.target.value);
                        setPayoutErrorMsg(null);
                        setPayoutSubmittedMsg(null);
                      }}
                      className="w-full px-4 py-3 rounded-2xl bg-[#040E0A] border border-emerald-500/40 text-xs font-mono font-bold text-white"
                    >
                      {accounts.map((acc) => {
                        const pnl = Math.round((acc.balance - acc.startingBalance) * 100) / 100;
                        return (
                          <option key={acc.id} value={acc.id}>
                            #{acc.accountNumber} · {acc.challengeTitle} · P&amp;L: {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({acc.status.toUpperCase()})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 2. Live Challenge Step & P&L Eligibility Card */}
                  {payoutEligibility && (
                    <div
                      className={`p-4 rounded-2xl border space-y-3 ${
                        payoutEligibility.eligible
                          ? 'bg-emerald-500/10 border-[#00FFA3]/50'
                          : payoutEligibility.isBreached
                          ? 'bg-rose-950/40 border-rose-500/50'
                          : 'bg-amber-500/10 border-amber-400/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-display font-extrabold text-white">
                          {payoutEligibility.challengeTitle} (#{payoutEligibility.accountNumber})
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase ${
                            payoutEligibility.eligible
                              ? 'bg-[#00FFA3]/20 text-[#00FFA3] border border-[#00FFA3]/50'
                              : payoutEligibility.isBreached
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          }`}
                        >
                          {payoutEligibility.eligible
                            ? 'PAYOUT UNLOCKED ✓'
                            : payoutEligibility.isBreached
                            ? 'ACCOUNT BREACHED'
                            : 'STEP / P&L REQUIRED'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div className="p-2.5 rounded-xl bg-[#030A07] border border-white/10">
                          <span className="text-[10px] text-[#94B8AA] block">Starting Capital</span>
                          <strong className="text-white">${payoutEligibility.startingBalance.toLocaleString()}</strong>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#030A07] border border-white/10">
                          <span className="text-[10px] text-[#94B8AA] block">Current Balance</span>
                          <strong className="text-white">${payoutEligibility.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#030A07] border border-white/10">
                          <span className="text-[10px] text-[#94B8AA] block">Realized P&amp;L</span>
                          <strong
                            className={
                              payoutEligibility.realizedProfitUsd > 0
                                ? 'text-[#00FFA3]'
                                : payoutEligibility.realizedProfitUsd < 0
                                ? 'text-rose-400'
                                : 'text-slate-300'
                            }
                          >
                            {payoutEligibility.realizedProfitUsd >= 0 ? '+' : ''}$
                            {payoutEligibility.realizedProfitUsd.toFixed(2)}
                          </strong>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#030A07] border border-[#00FFA3]/30">
                          <span className="text-[10px] text-[#94B8AA] block">
                            Withdrawable ({payoutEligibility.profitSplitPct}%)
                          </span>
                          <strong className="text-[#00FFA3]">
                            ${payoutEligibility.maxWithdrawableUsd.toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      {payoutEligibility.challengeType === 'instant' && (
                        <div className="p-3 rounded-xl bg-[#030A07] border border-emerald-500/30 space-y-1.5 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#00FFA3] uppercase">
                              Instant Account 15% Consistency Rule (Hidden Rule)
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                payoutEligibility.isConsistencyViolated
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-[#00FFA3]/20 text-[#00FFA3] border border-[#00FFA3]/40'
                              }`}
                            >
                              {payoutEligibility.isConsistencyViolated ? 'EXCEEDS 15% LIMIT' : 'CONSISTENCY OK (≤15%)'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#94B8AA]">
                            <span>
                              Highest Single Trade:{' '}
                              <strong className="text-white">
                                +${payoutEligibility.maxSingleTradeProfitUsd.toFixed(2)}
                              </strong>
                            </span>
                            <span>
                              Single Trade Share:{' '}
                              <strong
                                className={
                                  payoutEligibility.isConsistencyViolated ? 'text-rose-400' : 'text-[#00FFA3]'
                                }
                              >
                                {payoutEligibility.highestTradeSharePct.toFixed(1)}% / 15% Max
                              </strong>
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="text-xs font-bold leading-relaxed text-slate-200">
                        {payoutEligibility.reason}
                      </div>
                    </div>
                  )}

                  {payoutErrorMsg && (
                    <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-xs font-bold text-rose-300">
                      {payoutErrorMsg}
                    </div>
                  )}

                  {payoutSubmittedMsg && (
                    <div className="p-4 rounded-2xl bg-emerald-500/15 border border-[#00FFA3]/40 text-xs font-bold text-[#00FFA3]">
                      {payoutSubmittedMsg}
                    </div>
                  )}

                  <form onSubmit={handlePayoutSubmit} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-[#94B8AA]">
                          2. Payout Withdrawal Amount (USD)
                        </label>
                        {payoutEligibility && payoutEligibility.maxWithdrawableUsd > 0 && (
                          <button
                            type="button"
                            onClick={() => setPayoutAmount(payoutEligibility.maxWithdrawableUsd)}
                            className="text-[11px] font-mono font-extrabold text-[#00FFA3] hover:underline cursor-pointer"
                          >
                            Max: ${payoutEligibility.maxWithdrawableUsd.toFixed(2)}
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="20"
                        max={payoutEligibility?.maxWithdrawableUsd || 100000}
                        disabled={!payoutEligibility?.eligible}
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-2xl bg-[#040E0A] border border-emerald-500/35 text-sm font-mono font-bold text-white disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">
                        3. Settlement Method
                      </label>
                      <select
                        disabled={!payoutEligibility?.eligible}
                        value={payoutMethod}
                        onChange={(e) => setPayoutMethod(e.target.value as any)}
                        className="w-full px-4 py-3 rounded-2xl bg-[#040E0A] border border-emerald-500/35 text-xs text-white font-bold disabled:opacity-50"
                      >
                        <option value="USDT_BEP20">USDT Crypto (BEP-20 BNB Smart Chain)</option>
                        <option value="USDT_TRC20">USDT Crypto (TRC-20)</option>
                        <option value="USDC">USDC Crypto (ERC-20)</option>
                        <option value="WIRE">Bank Wire Transfer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">
                        4. Destination Wallet Address (BEP-20) / Details
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!payoutEligibility?.eligible}
                        placeholder="Enter 0x... USDT (BEP-20) wallet address"
                        value={payoutWalletAddress}
                        onChange={(e) => setPayoutWalletAddress(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-[#040E0A] border border-emerald-500/35 text-xs text-white font-mono font-bold disabled:opacity-50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!payoutEligibility?.eligible}
                      className="w-full py-4 rounded-2xl apex-glow-btn text-xs font-display font-extrabold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {payoutEligibility?.eligible
                        ? `Withdraw $${payoutAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })} USD Profit →`
                        : 'Payout Locked — Complete Challenge Step & Profit Target'}
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="apex-glass-card rounded-3xl p-7 space-y-5">
              <h2 className="text-xl font-display font-extrabold text-white">
                Public Verified Payout Registry
              </h2>
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {verifiedPayouts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-[#040E0A] border border-emerald-500/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-display font-bold text-white">{p.traderName}</div>
                      <div className="text-[11px] text-[#94B8AA] font-mono">{p.currency} · {p.paymentDate}</div>
                    </div>
                    <div className="font-mono text-[#00FFA3] font-extrabold text-sm">
                      +${p.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 apex-fade-up">
          <div className="apex-glass-card rounded-3xl p-7 space-y-5">
            <h2 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#00FFA3]" />
              <span>Profile Settings</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">
                  Profile Picture Upload
                </label>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl apex-glass-panel text-xs font-bold text-white cursor-pointer hover:border-[#00FFA3]/50">
                  <Upload className="w-4 h-4 text-[#00FFA3]" />
                  <span>Upload Image</span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#040E0A] border border-emerald-500/35 text-sm font-semibold text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">Country</label>
                <select
                  value={profileCountry}
                  onChange={(e) => setProfileCountry(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#040E0A] border border-emerald-500/35 text-sm font-semibold text-white"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => updateUserProfile({ fullName: profileName, country: profileCountry })}
                className="px-6 py-3 rounded-2xl apex-glow-btn text-xs font-extrabold cursor-pointer"
              >
                Save Profile Changes
              </button>
            </div>
          </div>

          <div className="apex-glass-card rounded-3xl p-7 space-y-5">
            <h2 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#00FFA3]" />
              <span>Security & Credentials</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#94B8AA] mb-1.5">Change Password</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min. 8 chars)"
                    className="flex-1 px-4 py-3 rounded-2xl bg-[#040E0A] border border-emerald-500/35 text-xs font-semibold text-white"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await changeUserPassword(newPassword);
                        setNewPassword('');
                        setPasswordStatus('Password updated.');
                      } catch (err: any) {
                        setPasswordStatus(err.message);
                      }
                    }}
                    className="px-5 py-3 rounded-2xl apex-glow-btn text-xs font-extrabold cursor-pointer"
                  >
                    Update
                  </button>
                </div>
                {passwordStatus && <p className="text-xs text-[#00FFA3] mt-1 font-bold">{passwordStatus}</p>}
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl apex-glass-panel">
                <div>
                  <div className="text-sm font-display font-extrabold text-white">
                    Multi-Factor Authentication (MFA)
                  </div>
                  <div className="text-xs text-[#94B8AA]">
                    Status: {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateUserProfile({ mfaEnabled: !user.mfaEnabled })}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-[#00FFA3]/40 text-xs text-[#00FFA3] font-extrabold cursor-pointer"
                >
                  {user.mfaEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40">
                <div>
                  <div className="text-sm font-display font-extrabold text-white flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Active Session Sign Out</span>
                  </div>
                  <div className="text-xs text-[#94B8AA] mt-0.5">
                    Log out of your Funded Apex trader account session safely.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('login');
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/50 text-rose-300 font-extrabold text-xs cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* AFFILIATE TAB */}
      {activeTab === 'affiliate' && (
        <section className="space-y-8 apex-fade-up">
          <div className="apex-glass-card rounded-3xl p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-emerald-500/20 pb-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FFA3]/15 border border-[#00FFA3]/40 text-xs font-mono font-bold text-[#00FFA3]">
                  <Users className="w-4 h-4" />
                  <span>FUNDED APEX PARTNER PROGRAM</span>
                </div>
                <h2 className="text-2xl font-display font-extrabold text-white">
                  Earn Up to 15% Commission on Referrals
                </h2>
                <p className="text-xs text-[#94B8AA] max-w-xl">
                  Share your unique referral link with fellow traders and earn instant payout commissions whenever they purchase an evaluation account.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyReferral}
                className="px-6 py-3.5 rounded-2xl apex-glow-btn text-xs font-bold flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,255,163,0.3)]"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Referral Link</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-[#040E0A] border border-emerald-500/30 space-y-1">
                <div className="text-xs text-[#94B8AA] font-bold">Partner ID</div>
                <div className="text-xl font-mono font-extrabold text-[#00FFA3]">{user.referralCode}</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#040E0A] border border-emerald-500/30 space-y-1">
                <div className="text-xs text-[#94B8AA] font-bold">Tier 1 Commission Rate</div>
                <div className="text-xl font-mono font-extrabold text-white">15% Lifetime</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#040E0A] border border-emerald-500/30 space-y-1">
                <div className="text-xs text-[#94B8AA] font-bold">Tier 2 Commission Rate</div>
                <div className="text-xl font-mono font-extrabold text-white">5% Secondary</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(`https://fundedapex.com/?ref=${user.referralCode}`)}&text=${encodeURIComponent('Join FUNDED APEX Prop Firm and get funded up to $600,000!')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-[#081C14] hover:bg-emerald-500/20 border border-[#00FFA3]/40 text-xs font-bold text-[#00FFA3] flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Share on Telegram</span>
              </a>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join FUNDED APEX Prop Firm and get funded! https://fundedapex.com/?ref=${user.referralCode}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-[#081C14] hover:bg-emerald-500/20 border border-[#00FFA3]/40 text-xs font-bold text-emerald-300 flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share on WhatsApp</span>
              </a>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};
