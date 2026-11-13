import React, { useState, useMemo } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  evaluateAccountRiskMetrics,
  evaluateAccountPayoutEligibility,
  resolveChallengeRulesForAccount,
  ChallengeType,
} from '../engine/tradingEngine';
import { COUNTRIES, ACCOUNT_SIZES } from '../data/platformData';
import { FundedApexLogo } from './FundedApexLogo';
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Gift,
  Grid,
  History,
  HelpCircle,
  LogOut,
  Menu,
  Send,
  Settings,
  Share2,
  Shield,
  Terminal,
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
  | 'challenges'
  | 'history'
  | 'dashboard'
  | 'payouts'
  | 'certificates'
  | 'affiliate'
  | 'kyc'
  | 'settings';

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
    payouts,
    verifiedPayouts,
    paymentSettings,
    userCoupons,
    logout,
    openStripeCheckout,
    updateUserProfile,
    changeUserPassword,
    requestAccountPayout,
    pushNotification,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<DashboardTabType>('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);

  // Profile form state
  const [profileName, setProfileName] = useState(user?.fullName || '');
  const [profileCountry, setProfileCountry] = useState(user?.country || 'United States');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');

  // KYC & Support form state
  const [kycDocType, setKycDocType] = useState('Passport');
  const [kycDocNumber, setKycDocNumber] = useState('');
  const [kycFrontImage, setKycFrontImage] = useState<string | null>(null);
  const [kycBackImage, setKycBackImage] = useState<string | null>(null);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycSubmittedSuccess, setKycSubmittedSuccess] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');

  // Payout Request form state
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

  // Challenges tab filter states to display all 24 challenges
  const [dashChTypeFilter, setDashChTypeFilter] = useState<ChallengeType | 'all'>('all');
  const [dashChSizeFilter, setDashChSizeFilter] = useState<number | 'all'>('all');

  const dashboardFilteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const matchType = dashChTypeFilter === 'all' || c.type === dashChTypeFilter;
      const matchSize = dashChSizeFilter === 'all' || c.accountSize === dashChSizeFilter;
      return matchType && matchSize;
    });
  }, [challenges, dashChTypeFilter, dashChSizeFilter]);

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
    () =>
      activeAccount
        ? userOrders.filter((o) => o.accountId === activeAccount.id && o.status === 'CLOSED')
        : userOrders.filter((o) => o.status === 'CLOSED'),
    [userOrders, activeAccount]
  );

  const reconciledActiveAccount = useMemo(() => {
    if (!activeAccount) return null;
    const rules = resolveChallengeRulesForAccount(activeAccount);
    const realizedNet = closedOrders.reduce((s, o) => s + (o.netPnl || 0), 0);
    const withdrawnGross = payouts
      .filter((p) => p.accountId === activeAccount.id)
      .reduce((s, p) => s + p.amountUsd / ((rules.profitSplitPct || 80) / 100), 0);
    const syncedBalance =
      activeAccount.status === 'failed'
        ? Math.round(activeAccount.balance * 100) / 100
        : Math.round((activeAccount.startingBalance + realizedNet - withdrawnGross) * 100) / 100;
    return {
      ...activeAccount,
      balance: syncedBalance,
    };
  }, [activeAccount, closedOrders, payouts]);

  const activeAccountPayoutEligibility = useMemo(() => {
    if (!reconciledActiveAccount) return null;
    return evaluateAccountPayoutEligibility(
      reconciledActiveAccount,
      activeAccOrders,
      closedOrders
    );
  }, [reconciledActiveAccount, activeAccOrders, closedOrders]);

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

  const dailyProfit = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysOrders = closedOrders.filter((o) => (o.closeTime || o.openTime || '').startsWith(todayStr));
    return Math.round(todaysOrders.reduce((s, o) => s + (o.netPnl || 0), 0) * 100) / 100;
  }, [closedOrders]);

  const winRatePct = useMemo(() => {
    if (closedOrders.length === 0) return 0;
    const wins = closedOrders.filter((o) => o.netPnl > 0).length;
    return Math.round((wins / closedOrders.length) * 1000) / 10;
  }, [closedOrders]);

  const riskMetrics = useMemo(() => {
    if (!reconciledActiveAccount) return null;
    return evaluateAccountRiskMetrics(reconciledActiveAccount, activeAccOrders);
  }, [reconciledActiveAccount, activeAccOrders]);

  const activeAccountsCount = accounts.filter((a) => a.status === 'active').length;

  const selectedPayoutAccount = useMemo(() => {
    const rawAcc =
      accounts.find((a) => a.id === selectedPayoutAccountId) ||
      activeAccount ||
      accounts[0] ||
      null;
    if (!rawAcc) return null;
    const accRules = resolveChallengeRulesForAccount(rawAcc);
    const closedForAcc = userOrders.filter(
      (o) => o.accountId === rawAcc.id && o.status === 'CLOSED'
    );
    const realizedNet = closedForAcc.reduce((s, o) => s + (o.netPnl || 0), 0);
    const withdrawnGross = payouts
      .filter((p) => p.accountId === rawAcc.id)
      .reduce((s, p) => s + p.amountUsd / ((accRules.profitSplitPct || 80) / 100), 0);
    const syncedBalance =
      rawAcc.status === 'failed'
        ? Math.round(rawAcc.balance * 100) / 100
        : Math.round((rawAcc.startingBalance + realizedNet - withdrawnGross) * 100) / 100;
    return {
      ...rawAcc,
      balance: syncedBalance,
    };
  }, [accounts, selectedPayoutAccountId, activeAccount, userOrders, payouts]);

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
        <div className="bg-[#090D0A] border border-[#00E676]/20 rounded-[14px] p-8 space-y-4 max-w-md mx-auto">
          <h1 className="text-2xl font-display font-bold text-white">Authentication Required</h1>
          <p className="text-sm text-[#A7B1AA]">
            Please sign in to access your FUNDED APEX Trader Dashboard.
          </p>
          <button
            type="button"
            onClick={() => navigate('login')}
            className="px-6 py-3 rounded-[9px] apex-glow-btn text-xs cursor-pointer"
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

  const isAdmin =
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    user.email.toLowerCase() === 'kingritikx0343@gmail.com';

  // Exact Sidebar Items requested by specification:
  // Overview | My Accounts | Trading History | Performance | Payouts | Certificates | Rewards | Support | Settings
  const menuItems: { id: DashboardTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Grid className="w-4 h-4" /> },
    { id: 'challenges', label: 'My Accounts', icon: <Trophy className="w-4 h-4" /> },
    { id: 'history', label: 'Trading History', icon: <History className="w-4 h-4" /> },
    { id: 'dashboard', label: 'Performance', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'payouts', label: 'Payouts', icon: <Wallet className="w-4 h-4" /> },
    { id: 'certificates', label: 'Certificates', icon: <Award className="w-4 h-4" /> },
    { id: 'affiliate', label: 'Rewards', icon: <Gift className="w-4 h-4" /> },
    { id: 'kyc', label: 'Support & KYC', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const evalNetPnl = reconciledActiveAccount && riskMetrics
    ? Math.round((riskMetrics.equity - reconciledActiveAccount.startingBalance) * 100) / 100
    : totalProfit - totalLoss;

  return (
    <div className="min-h-screen bg-transparent text-[#FFFFFF] flex">
      {/* MOBILE DRAWER OVERLAY */}
      {isDrawerOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* SIDEBAR DRAWER (1-SCREEN COMPACT FIT WITHOUT PROFILE BLOCK) */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-64 h-[100dvh] max-h-[100dvh] shrink-0 bg-gradient-to-b from-[#061318]/98 via-[#040D11]/98 to-[#03090C]/98 backdrop-blur-xl border-r border-[#00E5B0]/25 px-3.5 py-3 flex flex-col justify-between overflow-hidden transition-transform duration-200 ease-out select-none shadow-[16px_0_48px_rgba(0,0,0,0.85)] ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-2.5 min-h-0">
          {/* Logo Header */}
          <div className="flex items-center justify-between border-b border-[#00E5B0]/15 pb-2">
            <button
              type="button"
              onClick={() => navigate('home')}
              className="cursor-pointer text-left focus:outline-none"
            >
              <FundedApexLogo size="sm" variant="dashboard" />
            </button>
            <button
              type="button"
              aria-label="Close menu drawer"
              onClick={() => setIsDrawerOpen(false)}
              className="lg:hidden p-1.5 rounded-full bg-[#09181F] border border-[#00E5B0]/25 text-[#A3BDB8] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-2" aria-label="Dashboard Sidebar Navigation">
            {isAdmin && (
              <button
                type="button"
                data-testid="drawer-admin-access-btn"
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('admin');
                }}
                className="w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-sans font-bold flex items-center justify-between gap-2 bg-[#0B2229] border border-[#00E5B0]/45 text-[#38F8D2] hover:bg-[#00E5B0] hover:text-[#03120F] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>ADMIN PANEL</span>
                </span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}

            {/* SECTION: MAIN */}
            <div className="space-y-0.5">
              <div className="px-2.5 text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-[#6E948D]">
                MAIN
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('overview');
                  setIsDrawerOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-medium flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#0A2027] border border-[#00E5B0]/40 text-[#38F8D2] font-bold shadow-[inset_0_1px_0_rgba(56,248,210,0.15)]'
                    : 'text-[#A3BDB8] hover:bg-[#08181E] hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-[#00E5B0]" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('challenges');
                  setIsDrawerOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-medium flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'challenges'
                    ? 'bg-[#0A2027] border border-[#00E5B0]/40 text-[#38F8D2] font-bold shadow-[inset_0_1px_0_rgba(56,248,210,0.15)]'
                    : 'text-[#A3BDB8] hover:bg-[#08181E] hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-[#00E5B0]" />
                <span>Accounts</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('challenges');
                  setIsDrawerOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-medium flex items-center gap-2.5 text-[#A3BDB8] hover:bg-[#08181E] hover:text-white transition-all cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-[#00E5B0]" />
                <span>New Challenge</span>
              </button>
            </div>

            {/* SECTION: FINANCE */}
            <div className="space-y-0.5">
              <div className="px-2.5 text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-[#6E948D]">
                FINANCE
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('history');
                  setIsDrawerOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-medium flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-[#0A2027] border border-[#00E5B0]/40 text-[#38F8D2] font-bold shadow-[inset_0_1px_0_rgba(56,248,210,0.15)]'
                    : 'text-[#A3BDB8] hover:bg-[#08181E] hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5 text-[#00E5B0]" />
                <span>Transaction History</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('payouts');
                  setIsDrawerOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-medium flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'payouts'
                    ? 'bg-[#0A2027] border border-[#00E5B0]/40 text-[#38F8D2] font-bold shadow-[inset_0_1px_0_rgba(56,248,210,0.15)]'
                    : 'text-[#A3BDB8] hover:bg-[#08181E] hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-[#00E5B0]" />
                <span>Payout</span>
              </button>
            </div>

            {/* SECTION: ACCOUNT (Compact 1-Screen Fit without Profile) */}
            <div className="space-y-0.5">
              <div className="px-2.5 text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-[#6E948D]">
                ACCOUNT
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNotificationsPopover(true);
                  setIsDrawerOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-medium flex items-center justify-between text-[#A3BDB8] hover:bg-[#08181E] hover:text-white transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Bell className="w-3.5 h-3.5 text-[#00E5B0]" />
                  <span>Notifications</span>
                </span>
                {notifications.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#00E5B0] text-[#03120F] text-[9px] font-bold font-mono">
                    {notifications.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('kyc');
                  setIsDrawerOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-medium flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'kyc'
                    ? 'bg-[#0A2027] border border-[#00E5B0]/40 text-[#38F8D2] font-bold shadow-[inset_0_1px_0_rgba(56,248,210,0.15)]'
                    : 'text-[#A3BDB8] hover:bg-[#08181E] hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-[#00E5B0]" />
                <span>KYC &amp; Support</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('certificates');
                  setIsDrawerOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-medium flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'certificates'
                    ? 'bg-[#0A2027] border border-[#00E5B0]/40 text-[#38F8D2] font-bold shadow-[inset_0_1px_0_rgba(56,248,210,0.15)]'
                    : 'text-[#A3BDB8] hover:bg-[#08181E] hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-[#00E5B0]" />
                <span>Certificates</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('trading-rules');
                }}
                className="w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-medium flex items-center gap-2.5 text-[#A3BDB8] hover:bg-[#08181E] hover:text-white transition-all cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-[#00E5B0]" />
                <span>Rules</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Sidebar Bottom Actions (1-SCREEN FIT: LIVE TERMINAL + TELEGRAM VIP + LOGOUT) */}
        <div className="pt-2 border-t border-[#00E5B0]/15 space-y-1.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('terminal')}
            className="w-full py-2 px-3 rounded-[10px] apex-glow-btn text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Launch Live Terminal</span>
          </button>

          <a
            href="https://t.me/fundedapex"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="sidebar-telegram-btn"
            className="w-full py-1.5 px-3 rounded-[10px] bg-[#0088cc]/15 hover:bg-[#0088cc]/25 border border-[#0088cc]/35 text-[#38bdf8] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Join Telegram VIP</span>
          </a>

          <button
            type="button"
            data-testid="sidebar-logout-btn"
            onClick={() => {
              setIsDrawerOpen(false);
              logout();
              navigate('login');
            }}
            className="w-full py-1.5 px-3 rounded-[10px] bg-[#071419] hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 text-[#A3BDB8] hover:text-red-300 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* TOP NAVIGATION BAR (UPGRADED LUXURY CLIENT AREA HEADER WITH SCULPTED 3-LINE BUTTON) */}
        <header className="sticky top-2 z-40 mx-3 sm:mx-6 mt-2 rounded-full bg-gradient-to-r from-[#06151B]/95 via-[#081C24]/95 to-[#06151B]/95 backdrop-blur-xl border border-[#00E5B0]/35 px-4 sm:px-6 h-[64px] flex items-center justify-between gap-3 shadow-[0_18px_44px_rgba(0,0,0,0.84),0_0_28px_rgba(0,229,176,0.12),inset_0_1px_0_rgba(56,248,210,0.2)]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open side menu drawer"
              onClick={() => setIsDrawerOpen(true)}
              className="group h-10 px-3 rounded-full bg-gradient-to-b from-[#0B2229] to-[#061318] border border-[#00E5B0]/40 hover:border-[#38F8D2] flex items-center justify-center cursor-pointer shadow-[0_4px_14px_rgba(0,229,176,0.2)] transition-all"
            >
              <div className="w-4.5 h-3 flex flex-col justify-between items-start">
                <span className="w-4.5 h-[2px] rounded-full bg-gradient-to-r from-[#38F8D2] to-white group-hover:w-3.5 transition-all" />
                <span className="w-3.5 h-[2px] rounded-full bg-[#00E5B0] shadow-[0_0_6px_#00E5B0] group-hover:w-4.5 transition-all" />
                <span className="w-4 h-[2px] rounded-full bg-gradient-to-r from-white to-[#38F8D2] group-hover:w-4.5 transition-all" />
              </div>
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <span className="hidden sm:inline-flex w-2 h-2 rounded-full bg-[#00E5B0]" />
              <h1 className="text-base sm:text-lg font-sans font-bold text-white truncate">
                Client Area
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Account Selector */}
            {accounts.length > 0 && (
              <select
                aria-label="Select active evaluation account"
                value={activeAccount?.id || ''}
                onChange={(e) => setActiveAccountId(e.target.value)}
                className="hidden md:block px-3 py-2 rounded-[9px] bg-[#090D0A] border border-[#00E676]/25 text-xs font-mono font-bold text-white max-w-[220px] truncate focus:outline-none focus:border-[#00E676]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    #{acc.accountNumber} · ${acc.startingBalance.toLocaleString()} ({acc.status.toUpperCase()})
                  </option>
                ))}
              </select>
            )}

            {/* Notifications Bell & Responsive Notification Screen */}
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                data-testid="dashboard-notifications-btn"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setShowNotificationsPopover((prev) => !prev);
                }}
                className="w-10 h-10 rounded-full bg-[#071419] hover:bg-[#0C2129] border border-[#00E5B0]/28 text-[#A3BDB8] hover:text-[#00E5B0] flex items-center justify-center relative cursor-pointer transition-all"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#00E5B0] shadow-[0_0_8px_#00E5B0]" />
                )}
              </button>

              {showNotificationsPopover && (
                <>
                  <div
                    aria-hidden="true"
                    onClick={() => setShowNotificationsPopover(false)}
                    className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent"
                  />
                  <div
                    data-testid="dashboard-notifications-panel"
                    className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[76px] sm:top-full sm:mt-2.5 sm:w-[370px] rounded-[22px] bg-[#061116]/98 backdrop-blur-2xl border border-[#00E5B0]/35 shadow-[0_28px_72px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(56,248,210,0.16)] p-4 z-50 space-y-3 apex-layout-transition"
                  >
                    <div className="flex items-center justify-between border-b border-[#00E5B0]/18 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#00E5B0]" />
                        <span className="text-xs sm:text-sm font-display font-bold text-white">
                          Notification Center
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#091A21] border border-[#00E5B0]/30 text-[10px] font-mono font-bold text-[#00E5B0]">
                          {notifications.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNotificationsPopover(false)}
                        className="p-1 rounded-full text-[#A3BDB8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-[60vh] sm:max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center space-y-1.5">
                          <Bell className="w-6 h-6 text-[#00E5B0]/40 mx-auto" />
                          <div className="text-xs font-semibold text-white">All caught up</div>
                          <div className="text-[11px] text-[#728F8A]">
                            Real-time account, payout, and terminal alerts appear here.
                          </div>
                        </div>
                      ) : (
                        notifications.slice(0, 12).map((n) => (
                          <div
                            key={n.id}
                            className="p-3 rounded-[14px] bg-[#09181F] border border-[#00E5B0]/18 hover:border-[#00E5B0]/40 transition-colors text-xs space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-display font-bold text-[#00E5B0] leading-snug">
                                {n.title}
                              </span>
                              <span className="text-[10px] font-mono text-[#728F8A] shrink-0">
                                {new Date(n.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="text-[#D6EBE7] text-[11px] leading-relaxed">
                              {n.message}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile Corner Dropdown */}
            <div className="relative">
              <button
                type="button"
                data-testid="dashboard-profile-corner-btn"
                aria-expanded={isProfileMenuOpen}
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-[10px] bg-[#090D0A] hover:bg-[#0D130F] border border-[#00E676]/25 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-[8px] bg-[#0D130F] border border-[#00E676]/40 flex items-center justify-center overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-display font-extrabold text-[#00E676]">
                      {user.fullName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="text-left hidden sm:block">
                  <div className="text-xs font-display font-bold text-white leading-tight max-w-[120px] truncate">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] font-mono text-[#00E676]">
                    {user.role.toUpperCase()}
                  </div>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-[#A7B1AA]" />
              </button>

              {isProfileMenuOpen && (
                <>
                  <div
                    aria-hidden="true"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <div
                    data-testid="dashboard-profile-dropdown"
                    className="absolute right-0 mt-2 w-72 rounded-[14px] bg-[#050806] border border-[#00E676]/30 shadow-2xl p-4 space-y-3 z-50 apex-scale-in"
                  >
                    <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                      <div className="w-10 h-10 rounded-[9px] bg-[#090D0A] border border-[#00E676]/40 flex items-center justify-center font-display font-bold text-sm text-[#00E676] shrink-0">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-display font-bold text-white truncate">
                          {user.fullName}
                        </div>
                        <div className="text-[11px] font-mono text-[#00E676] truncate">
                          {user.email}
                        </div>
                        <div className="text-[10px] font-mono text-[#77837B] mt-0.5">
                          ID: {user.referralCode} · {user.country}
                        </div>
                      </div>
                    </div>

                    {accounts.length > 0 && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-[#77837B]">
                          Active Trading Account
                        </label>
                        <select
                          value={activeAccount?.id || ''}
                          onChange={(e) => setActiveAccountId(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-[8px] bg-[#090D0A] border border-white/15 text-xs font-mono font-bold text-white"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              #{acc.accountNumber} · ${acc.startingBalance.toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('settings');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-[8px] hover:bg-[#090D0A] text-left text-xs font-medium text-[#A7B1AA] hover:text-white flex items-center gap-2.5 cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-[#00E676]" />
                        <span>Profile &amp; Security Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('challenges');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-[8px] hover:bg-[#090D0A] text-left text-xs font-medium text-[#A7B1AA] hover:text-white flex items-center gap-2.5 cursor-pointer"
                      >
                        <Trophy className="w-4 h-4 text-[#00E676]" />
                        <span>My Accounts &amp; Credentials</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <button
                        type="button"
                        data-testid="profile-dropdown-logout-btn"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          logout();
                          navigate('login');
                        }}
                        className="w-full py-2.5 px-4 rounded-[8px] bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout Account</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* DASHBOARD BODY */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6">
          {/* =====================================================================
              1. OVERVIEW TAB (Video 2 Layout: Welcome Back, 4 Cards, Quick Actions + 8 KPIs & Terminal Details)
              ===================================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 apex-fade-up">
              {/* WELCOME BACK HEADER (ORIGINAL CONTENT + EXACT SCREENSHOT GEOMETRIC SANS FONT) */}
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-[-0.035em] leading-[1.08]">
                  Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
                </h1>
                <p className="text-sm sm:text-base text-[#A7B1AA] font-normal">
                  Manage your trading challenges, accounts, and payouts.
                </p>
              </div>

              {/* REAL-TIME AUTOMATED BREACH SYSTEM ALERT BANNER */}
              {activeAccount && (activeAccount.status === 'failed' || riskMetrics?.nextStatus === 'failed') && (
                <div
                  data-testid="dashboard-breach-alert-banner"
                  className="rounded-[18px] bg-gradient-to-r from-red-950/85 via-[#1C080B]/95 to-red-950/75 border border-red-500/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_18px_48px_rgba(239,68,68,0.22)]"
                >
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/45 text-[10px] font-mono font-extrabold uppercase tracking-wider text-red-300">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                      <span>AUTOMATED RISK ENGINE • ACCOUNT BREACHED</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-display font-extrabold text-white">
                      Account #{activeAccount.accountNumber} Disqualified — Drawdown Rule Violated
                    </h2>
                    <p className="text-xs sm:text-sm text-red-200/90 leading-relaxed">
                      {activeAccount.breachReason ||
                        riskMetrics?.breachReason ||
                        'Maximum or Daily Drawdown threshold exceeded. All open positions were automatically liquidated and terminal execution credentials revoked.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('challenges')}
                    className="px-4 py-2.5 rounded-[12px] bg-red-500 hover:bg-red-400 text-black font-display font-extrabold text-xs shrink-0 cursor-pointer transition-all"
                  >
                    Start New Challenge →
                  </button>
                </div>
              )}

              {/* 4 CARDS AS SHOWN IN VIDEO 2 (USING EXACT SANS FINTECH NUMBERS) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* 1. Active accounts */}
                <div
                  onClick={() => setActiveTab('challenges')}
                  className="bg-[#090D0A] hover:bg-[#0D130F] border border-[#00E676]/15 hover:border-[#00E676]/35 rounded-[12px] p-4 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between text-[#A7B1AA]">
                    <span className="text-xs font-medium">Active accounts</span>
                    <ArrowUpRight className="w-4 h-4 text-[#77837B] group-hover:text-[#00E676] transition-colors" />
                  </div>
                  <div className="flex items-center gap-2.5 mt-3">
                    <div className="w-8 h-8 rounded-[8px] bg-[#00E676]/10 border border-[#00E676]/25 flex items-center justify-center text-[#00E676] shrink-0">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight tabular-nums">
                      {activeAccountsCount}
                    </div>
                  </div>
                </div>

                {/* 2. Open challenges */}
                <div
                  onClick={() => setActiveTab('challenges')}
                  className="bg-[#090D0A] hover:bg-[#0D130F] border border-[#00E676]/15 hover:border-[#00E676]/35 rounded-[12px] p-4 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between text-[#A7B1AA]">
                    <span className="text-xs font-medium">Open challenges</span>
                    <ArrowUpRight className="w-4 h-4 text-[#77837B] group-hover:text-[#00E676] transition-colors" />
                  </div>
                  <div className="flex items-center gap-2.5 mt-3">
                    <div className="w-8 h-8 rounded-[8px] bg-[#00E676]/10 border border-[#00E676]/25 flex items-center justify-center text-[#00E676] shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight tabular-nums">
                      {accounts.length > 0 ? accounts.length : 1}
                    </div>
                  </div>
                </div>

                {/* 3. Available payout */}
                <div
                  onClick={() => setActiveTab('payouts')}
                  className="bg-[#090D0A] hover:bg-[#0D130F] border border-[#00E676]/15 hover:border-[#00E676]/35 rounded-[12px] p-4 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between text-[#A7B1AA]">
                    <span className="text-xs font-medium">Available payout</span>
                    <ArrowUpRight className="w-4 h-4 text-[#77837B] group-hover:text-[#00E676] transition-colors" />
                  </div>
                  <div className="flex items-center gap-2.5 mt-3">
                    <div className="w-8 h-8 rounded-[8px] bg-[#00E676]/10 border border-[#00E676]/25 flex items-center justify-center text-[#00E676] shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-2xl sm:text-3xl font-display font-extrabold text-[#00E676] tracking-tight tabular-nums">
                        ${(activeAccountPayoutEligibility?.maxWithdrawableUsd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {reconciledActiveAccount && reconciledActiveAccount.status !== 'passed' && reconciledActiveAccount.status !== 'completed' && (
                        <div className="text-[10px] font-mono text-amber-300/90 truncate mt-0.5">
                          Pass {reconciledActiveAccount.totalSteps && reconciledActiveAccount.totalSteps > 1 ? `Step ${reconciledActiveAccount.currentStep || 1}/${reconciledActiveAccount.totalSteps}` : 'Evaluation'} to unlock
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Notifications */}
                <div
                  onClick={() => setShowNotificationsPopover(true)}
                  className="bg-[#090D0A] hover:bg-[#0D130F] border border-[#00E676]/15 hover:border-[#00E676]/35 rounded-[12px] p-4 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between text-[#A7B1AA]">
                    <span className="text-xs font-medium">Notifications</span>
                    <ArrowUpRight className="w-4 h-4 text-[#77837B] group-hover:text-[#00E676] transition-colors" />
                  </div>
                  <div className="flex items-center gap-2.5 mt-3">
                    <div className="w-8 h-8 rounded-[8px] bg-[#00E676]/10 border border-[#00E676]/25 flex items-center justify-center text-[#00E676] shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight tabular-nums">
                      {notifications.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* QUICK ACTIONS CARD AS SHOWN IN VIDEO 2 */}
              <div className="bg-[#090D0A]/90 backdrop-blur-md border border-[#00E676]/15 rounded-[14px] p-5 space-y-3 shadow-lg">
                <div className="text-xs font-display font-bold uppercase tracking-wider text-[#77837B]">
                  Quick actions
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* New Challenge */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('challenges')}
                    className="p-3.5 rounded-[10px] bg-[#030504] hover:bg-[#0D130F] border border-white/5 hover:border-[#00E676]/30 text-left transition-all group cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-display font-bold text-white group-hover:text-[#00E676] transition-colors">
                        New Challenge
                      </div>
                      <div className="text-[11px] text-[#A7B1AA] mt-0.5">
                        Step One · Step Two · Zero Instant
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#77837B] group-hover:text-[#00E676] transition-colors" />
                  </button>

                  {/* Accounts */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('challenges')}
                    className="p-3.5 rounded-[10px] bg-[#030504] hover:bg-[#0D130F] border border-white/5 hover:border-[#00E676]/30 text-left transition-all group cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-display font-bold text-white group-hover:text-[#00E676] transition-colors">
                        Accounts
                      </div>
                      <div className="text-[11px] text-[#A7B1AA] mt-0.5">
                        $5k – $100k+ sizes
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#77837B] group-hover:text-[#00E676] transition-colors" />
                  </button>

                  {/* Payout */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('payouts')}
                    className="p-3.5 rounded-[10px] bg-[#030504] hover:bg-[#0D130F] border border-white/5 hover:border-[#00E676]/30 text-left transition-all group cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-display font-bold text-white group-hover:text-[#00E676] transition-colors">
                        Payout
                      </div>
                      <div className="text-[11px] text-[#A7B1AA] mt-0.5">
                        Request when eligible
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#77837B] group-hover:text-[#00E676] transition-colors" />
                  </button>
                </div>
              </div>

              {/* 8 OVERVIEW KPI METRICS: Balance, Equity, Total Profit, Daily Profit, Active Accounts, Trading Days, Daily Drawdown, Maximum Drawdown */}
              <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="apex-metric-tile p-4 rounded-[12px]">
                  <div className="text-[12px] font-medium text-[#A7B1AA]">Balance</div>
                  <div className="text-xl sm:text-2xl font-display font-extrabold text-white mt-1 tracking-tight tabular-nums">
                    ${(reconciledActiveAccount?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-[#77837B] mt-0.5">
                    Start: ${(reconciledActiveAccount?.startingBalance ?? 0).toLocaleString()}
                  </div>
                </div>

                <div className="apex-metric-tile p-4 rounded-[12px]">
                  <div className="text-[12px] font-medium text-[#A7B1AA]">Equity</div>
                  <div className="text-xl sm:text-2xl font-display font-extrabold text-[#00E676] mt-1 tracking-tight tabular-nums">
                    ${(riskMetrics?.equity ?? reconciledActiveAccount?.equity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-[#77837B] mt-0.5">
                    Real-Time Floating Valuation
                  </div>
                </div>

                <div className="apex-metric-tile p-4 rounded-[12px]">
                  <div className="text-[12px] font-medium text-[#A7B1AA]">Total Profit</div>
                  <div className={`text-xl sm:text-2xl font-display font-extrabold mt-1 tracking-tight tabular-nums ${evalNetPnl >= 0 ? 'text-[#00E676]' : 'text-red-400'}`}>
                    {evalNetPnl >= 0 ? '+' : '-'}${Math.abs(evalNetPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-[#77837B] mt-0.5">
                    Win Rate: {winRatePct}% ({closedOrders.length} trades)
                  </div>
                </div>

                <div className="apex-metric-tile p-4 rounded-[12px]">
                  <div className="text-[12px] font-medium text-[#A7B1AA]">Daily Profit</div>
                  <div className={`text-xl sm:text-2xl font-display font-extrabold mt-1 tracking-tight tabular-nums ${dailyProfit >= 0 ? 'text-[#69F0AE]' : 'text-red-400'}`}>
                    {dailyProfit >= 0 ? '+' : '-'}${Math.abs(dailyProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-[#77837B] mt-0.5">
                    Current Session Realized
                  </div>
                </div>

                <div className="apex-metric-tile p-4 rounded-[12px]">
                  <div className="text-[12px] font-medium text-[#A7B1AA]">Active Accounts</div>
                  <div className="text-xl sm:text-2xl font-display font-extrabold text-white mt-1 tracking-tight tabular-nums">
                    {activeAccountsCount} <span className="text-sm font-normal text-[#77837B]">/ {accounts.length}</span>
                  </div>
                  <div className="text-[11px] text-[#00E676] mt-0.5">
                    {accounts.length > 0 ? `#${activeAccount?.accountNumber}` : 'No active allocation'}
                  </div>
                </div>

                <div className="apex-metric-tile p-4 rounded-[12px]">
                  <div className="text-[12px] font-medium text-[#A7B1AA]">Trading Days</div>
                  <div className="text-xl sm:text-2xl font-display font-extrabold text-white mt-1 tracking-tight tabular-nums">
                    {reconciledActiveAccount?.tradingDaysCount ?? 0}{' '}
                    <span className="text-sm font-normal text-[#77837B]">
                      / {reconciledActiveAccount?.minTradingDays ?? 3} Min
                    </span>
                  </div>
                  <div className="text-[11px] text-[#77837B] mt-0.5">
                    Objective Progress
                  </div>
                </div>

                <div className="apex-metric-tile p-4 rounded-[12px]">
                  <div className="text-[12px] font-medium text-[#A7B1AA]">Daily Drawdown</div>
                  <div className="text-xl sm:text-2xl font-display font-extrabold text-white mt-1 tracking-tight tabular-nums">
                    {(riskMetrics?.dailyDrawdownUsedPct ?? 0).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-[#77837B] mt-0.5">
                    Limit: {riskMetrics?.dailyDrawdownPct ?? 5}% (${(riskMetrics?.dailyLossLimitUsd ?? 0).toFixed(0)})
                  </div>
                </div>

                <div className="apex-metric-tile p-4 rounded-[12px]">
                  <div className="text-[12px] font-medium text-[#A7B1AA]">Maximum Drawdown</div>
                  <div className="text-xl sm:text-2xl font-display font-extrabold text-white mt-1 tracking-tight tabular-nums">
                    {(riskMetrics?.maxDrawdownUsedPct ?? 0).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-[#77837B] mt-0.5">
                    Limit: {riskMetrics?.maxDrawdownPct ?? 10}% (${(riskMetrics?.maxLossLimitUsd ?? 0).toFixed(0)})
                  </div>
                </div>
              </section>

              {/* ACCOUNT DETAILS, CHALLENGE PROGRESS, TRADING OBJECTIVES */}
              {accounts.length === 0 ? (
                <div className="bg-[#090D0A] border border-[#00E676]/20 rounded-[14px] p-8 space-y-5 text-center max-w-2xl mx-auto">
                  <div className="w-14 h-14 rounded-[12px] bg-[#0D130F] border border-[#00E676]/30 flex items-center justify-center mx-auto text-[#00E676]">
                    <Trophy className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-display font-bold text-white">No Active Evaluation Account</h2>
                    <p className="text-sm text-[#A3BDB8] max-w-md mx-auto leading-relaxed">
                      Start your structured evaluation challenge from $5,000 up to $200,000 and trade on the FUNDED APEX Terminal.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('challenges')}
                      className="px-6 py-3 rounded-[14px] apex-glow-btn text-xs cursor-pointer"
                    >
                      Explore Challenges ($5,000 – $200,000) →
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('terminal')}
                      className="px-5 py-3 rounded-[9px] apex-secondary-btn text-xs cursor-pointer"
                    >
                      Preview Trading Terminal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left: Active Account Status & Credentials */}
                  <div className="lg:col-span-7 bg-[#090D0A] border border-[#00E676]/18 rounded-[14px] p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                      <div>
                        <div className="text-[11px] font-display font-semibold text-[#00E676] uppercase tracking-wider">
                          Account Details &amp; Status
                        </div>
                        <h2 className="text-lg sm:text-xl font-display font-bold text-white mt-0.5">
                          #{activeAccount?.accountNumber} — {activeAccount?.challengeTitle}
                        </h2>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-[7px] text-xs font-display font-bold uppercase ${
                          activeAccount?.status === 'failed'
                            ? 'bg-red-500/15 border border-red-500/40 text-red-300'
                            : activeAccount?.status === 'passed'
                            ? 'bg-[#00E676]/20 border border-[#00E676] text-[#00E676]'
                            : 'bg-[#0D130F] border border-[#00E676]/35 text-[#00E676]'
                        }`}
                      >
                        {activeAccount?.status === 'failed'
                          ? 'BREACHED'
                          : activeAccount?.status === 'passed'
                          ? 'PASSED • FUNDED'
                          : activeAccount?.challengeType === 'instant'
                          ? 'INSTANT FUNDED'
                          : `PHASE ${activeAccount?.currentStep || 1} OF ${activeAccount?.totalSteps || 2}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-display">
                      <div className="p-3.5 rounded-[10px] bg-[#030504] border border-white/10">
                        <span className="text-[#77837B] block text-[10px] uppercase">Terminal User ID</span>
                        <strong className="text-[#00E676] text-sm mt-0.5 block">
                          {activeAccount?.terminalUserId || 'APEX-MASTER'}
                        </strong>
                      </div>
                      <div className="p-3.5 rounded-[10px] bg-[#030504] border border-white/10">
                        <span className="text-[#77837B] block text-[10px] uppercase">Terminal Password</span>
                        {activeAccount?.status === 'failed' || !activeAccount?.terminalPassword ? (
                          <strong className="text-red-400 text-sm mt-0.5 block">REMOVED (BREACHED)</strong>
                        ) : (
                          <strong className="text-[#00E676] text-sm mt-0.5 block">
                            {activeAccount.terminalPassword}
                          </strong>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeAccount) setActiveAccountId(activeAccount.id);
                          navigate('terminal');
                        }}
                        className="px-5 py-2.5 rounded-[9px] apex-glow-btn text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <Terminal className="w-4 h-4" />
                        <span>Launch Live Terminal →</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeAccount) setSelectedPayoutAccountId(activeAccount.id);
                          setActiveTab('payouts');
                        }}
                        className="px-4 py-2.5 rounded-[9px] apex-secondary-btn text-xs cursor-pointer"
                      >
                        Request Payout
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className="px-4 py-2.5 rounded-[9px] bg-[#030504] hover:bg-[#0D130F] border border-white/10 text-xs font-medium text-[#A7B1AA] hover:text-white cursor-pointer"
                      >
                        Trading History ({closedOrders.length})
                      </button>
                    </div>
                  </div>

                  {/* Right: Trading Objectives & Challenge Progress */}
                  <div className="lg:col-span-5 bg-[#090D0A]/90 backdrop-blur-md border border-[#00E676]/18 rounded-[14px] p-6 space-y-4">
                    <div className="border-b border-white/10 pb-3">
                      <div className="text-[11px] font-display font-semibold text-[#00E676] uppercase tracking-wider">
                        Trading Objectives
                      </div>
                      <h3 className="text-base font-display font-bold text-white mt-0.5">
                        Challenge Progress &amp; Risk Rules
                      </h3>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      {/* Profit Target Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-display">
                          <span className="text-[#A7B1AA]">
                            Profit Target ({reconciledActiveAccount?.challengeType === 'instant' || (riskMetrics?.profitTargetPct ?? 0) === 0 ? 'None' : `+${riskMetrics?.profitTargetPct}%`})
                          </span>
                          <span className="text-[#00E676] font-extrabold tabular-nums">
                            {reconciledActiveAccount?.challengeType === 'instant' || (riskMetrics?.profitTargetPct ?? 0) === 0
                              ? 'DIRECT FUNDED'
                              : `${(riskMetrics?.profitProgressPct ?? 0).toFixed(1)}%`}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#030504] rounded-full overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-[#00E676] transition-all duration-500"
                            style={{ width: `${Math.min(100, riskMetrics?.profitProgressPct ?? 0)}%` }}
                          />
                        </div>
                      </div>

                      {/* Daily Drawdown Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-display">
                          <span className="text-[#A7B1AA]">Daily Drawdown Limit ({riskMetrics?.dailyDrawdownPct ?? 5}%)</span>
                          <span className="text-white font-extrabold tabular-nums">
                            ${(riskMetrics?.dailyDropUsd ?? 0).toFixed(2)} / ${(riskMetrics?.dailyLossLimitUsd ?? 0).toFixed(0)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#030504] rounded-full overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-red-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, riskMetrics?.dailyDrawdownUsedPct ?? 0)}%` }}
                          />
                        </div>
                      </div>

                      {/* Max Drawdown Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-display">
                          <span className="text-[#A7B1AA]">Max Drawdown Limit ({riskMetrics?.maxDrawdownPct ?? 10}%)</span>
                          <span className="text-white font-extrabold tabular-nums">
                            ${(riskMetrics?.overallDropUsd ?? 0).toFixed(2)} / ${(riskMetrics?.maxLossLimitUsd ?? 0).toFixed(0)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#030504] rounded-full overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-red-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, riskMetrics?.maxDrawdownUsedPct ?? 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EMBEDDED EQUITY CURVE, DAILY PERFORMANCE, TRADING STATISTICS & PROFIT DISTRIBUTION */}
              <TradePerformanceVisualizer
                activeAccount={reconciledActiveAccount}
                orders={
                  reconciledActiveAccount
                    ? userOrders.filter((o) => o.accountId === reconciledActiveAccount.id)
                    : userOrders
                }
                onOpenTerminal={() => navigate('terminal')}
              />
            </div>
          )}

          {/* =====================================================================
              2. PERFORMANCE TAB (Dedicated Charts & Quantitative Analytics)
              ===================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 apex-fade-up">
              <TradePerformanceVisualizer
                activeAccount={reconciledActiveAccount}
                orders={
                  reconciledActiveAccount
                    ? userOrders.filter((o) => o.accountId === reconciledActiveAccount.id)
                    : userOrders
                }
                onOpenTerminal={() => navigate('terminal')}
              />
            </div>
          )}

          {/* =====================================================================
              3. TRADING HISTORY TAB (Complete Order & Account History Blotter)
              ===================================================================== */}
          {activeTab === 'history' && (
            <section className="bg-[#090D0A] border border-[#00E676]/15 rounded-[14px] p-6 space-y-5 apex-fade-up">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="text-[11px] font-mono font-semibold text-[#00E676] uppercase tracking-wider">
                    Execution Blotter
                  </div>
                  <h2 className="text-xl font-display font-bold text-white mt-0.5">
                    Trading History &amp; Order Log ({userOrders.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('terminal')}
                  className="px-4 py-2 rounded-[9px] apex-glow-btn text-xs cursor-pointer"
                >
                  Open Trading Terminal →
                </button>
              </div>

              {userOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#77837B] bg-[#030504] rounded-[12px] border border-white/5">
                  No orders executed yet. Launch the trading terminal to place simulated market, limit, or stop orders.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="text-[#77837B] border-b border-white/10">
                        <th className="py-2.5 pr-4">Ticket</th>
                        <th className="py-2.5 pr-4">Symbol</th>
                        <th className="py-2.5 pr-4">Type &amp; Side</th>
                        <th className="py-2.5 pr-4">Lots</th>
                        <th className="py-2.5 pr-4">Entry</th>
                        <th className="py-2.5 pr-4">Exit / Current</th>
                        <th className="py-2.5 pr-4">Status</th>
                        <th className="py-2.5 text-right">Net P&amp;L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {userOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-[#0D130F]">
                          <td className="py-2.5 pr-4 text-[#00E676] font-bold">{ord.ticketId}</td>
                          <td className="py-2.5 pr-4 text-white font-bold">{ord.symbol}</td>
                          <td className="py-2.5 pr-4">
                            <span className={ord.side === 'BUY' ? 'text-[#00E676] font-bold' : 'text-red-400 font-bold'}>
                              {ord.side}
                            </span>{' '}
                            <span className="text-[#77837B]">{ord.orderType}</span>
                          </td>
                          <td className="py-2.5 pr-4 text-white tabular-nums">{ord.volume.toFixed(2)}</td>
                          <td className="py-2.5 pr-4 text-[#A7B1AA] tabular-nums">{ord.entryPrice}</td>
                          <td className="py-2.5 pr-4 text-[#A7B1AA] tabular-nums">{ord.exitPrice || ord.currentPrice}</td>
                          <td className="py-2.5 pr-4 text-[#A7B1AA]">{ord.status}</td>
                          <td className={`py-2.5 text-right font-bold tabular-nums ${ord.netPnl >= 0 ? 'text-[#00E676]' : 'text-red-400'}`}>
                            {ord.netPnl >= 0 ? '+' : ''}${ord.netPnl.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* =====================================================================
              4. MY ACCOUNTS & CHALLENGES TAB
              ===================================================================== */}
          {activeTab === 'challenges' && (
            <section className="space-y-8 apex-fade-up">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white">
                      My Trading Accounts ({accounts.length})
                    </h2>
                    <p className="text-xs text-[#A7B1AA] mt-0.5">
                      Manage your active evaluation and funded simulation accounts or launch the terminal.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('terminal')}
                      className="px-4 py-2.5 rounded-[9px] apex-secondary-btn text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Terminal className="w-4 h-4 text-[#00E676]" />
                      <span>Open Terminal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openStripeCheckout('two-step-5000', '5K30OFF')}
                      className="px-4 py-2.5 rounded-[9px] apex-glow-btn text-xs cursor-pointer"
                    >
                      + Buy New Challenge
                    </button>
                  </div>
                </div>

                {accounts.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {accounts.map((acc) => {
                      const accRules = resolveChallengeRulesForAccount(acc);
                      const accOpen = userOrders.filter(
                        (o) => o.accountId === acc.id && o.status === 'OPEN'
                      );
                      const accClosed = userOrders.filter(
                        (o) => o.accountId === acc.id && o.status === 'CLOSED'
                      );
                      const accRealizedNet = accClosed.reduce((s, o) => s + (o.netPnl || 0), 0);
                      const accWithdrawnGross = payouts
                        .filter((p) => p.accountId === acc.id)
                        .reduce((s, p) => s + p.amountUsd / ((accRules.profitSplitPct || 80) / 100), 0);
                      const syncedAccBalance =
                        acc.status === 'failed'
                          ? Math.round(acc.balance * 100) / 100
                          : Math.round((acc.startingBalance + accRealizedNet - accWithdrawnGross) * 100) / 100;
                      const accMetrics = evaluateAccountRiskMetrics(
                        { ...acc, balance: syncedAccBalance },
                        accOpen
                      );
                      const evalPnl = Math.round((accMetrics.equity - acc.startingBalance) * 100) / 100;

                      return (
                        <div
                          key={acc.id}
                          className={`bg-[#090D0A] border rounded-[14px] p-6 space-y-4 transition-all ${
                            acc.id === activeAccount?.id
                              ? 'border-[#00E676] shadow-[0_0_24px_rgba(0,230,118,0.14)]'
                              : 'border-[#00E676]/15'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <span className="font-mono text-xs font-bold text-[#00E676]">
                              #{acc.accountNumber}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-[6px] text-[10px] font-mono font-bold uppercase ${
                                acc.status === 'failed'
                                  ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                                  : 'bg-[#0D130F] border border-[#00E676]/35 text-[#00E676]'
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

                          <div className="space-y-2">
                            <h3 className="text-lg font-display font-bold text-white">
                              {acc.challengeTitle}
                            </h3>
                            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                              <div className="p-2 rounded-[8px] bg-[#030504] border border-white/10">
                                <span className="text-[#77837B] block text-[9px] uppercase">Terminal ID</span>
                                <strong className="text-[#00E676]">{acc.terminalUserId || 'APEX-MASTER'}</strong>
                              </div>
                              <div className="p-2 rounded-[8px] bg-[#030504] border border-white/10">
                                <span className="text-[#77837B] block text-[9px] uppercase">Password</span>
                                {acc.status === 'failed' || !acc.terminalPassword ? (
                                  <strong className="text-red-400">REMOVED</strong>
                                ) : (
                                  <strong className="text-[#00E676]">{acc.terminalPassword}</strong>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs border-t border-white/10 pt-3 font-mono">
                            <div className="flex justify-between">
                              <span className="text-[#A7B1AA] font-sans">Balance</span>
                              <span className="font-bold text-white tabular-nums">
                                ${syncedAccBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#A7B1AA] font-sans">Equity</span>
                              <span className="font-bold text-[#00E676] tabular-nums">
                                ${accMetrics.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#A7B1AA] font-sans">Net P&amp;L</span>
                              <span className={`font-bold tabular-nums ${evalPnl >= 0 ? 'text-[#00E676]' : 'text-red-400'}`}>
                                {evalPnl >= 0 ? '+' : '-'}${Math.abs(evalPnl).toFixed(2)}
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
                              className="py-2.5 px-3 rounded-[9px] apex-glow-btn text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Terminal className="w-3.5 h-3.5" />
                              <span>Terminal</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayoutAccountId(acc.id);
                                setActiveTab('payouts');
                              }}
                              className="py-2.5 px-3 rounded-[9px] apex-secondary-btn text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Wallet className="w-3.5 h-3.5 text-[#00E676]" />
                              <span>Payouts</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Complete Catalog of All 24 Challenge Packages */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-[6px] bg-[#090D0A] border border-[#00E676]/30 text-[10px] font-mono font-bold text-[#00E676] uppercase tracking-wider">
                      ALL 24 INSTITUTIONAL PROGRAMS
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white mt-1">
                      Start a New Evaluation Challenge
                    </h2>
                    <p className="text-xs text-[#A3BDB8] mt-0.5">
                      Select your evaluation track and account capital from $5,000 up to $200,000.
                    </p>
                  </div>

                  <span className="font-mono text-xs text-[#728F8A]">
                    Showing {dashboardFilteredChallenges.length} of {challenges.length} Programs
                  </span>
                </div>

                {/* Neatly Shifted & Aligned Challenge Type & Account Size Filter Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-[20px] bg-[#081318]/90 border border-[#00E5B0]/20 shadow-lg">
                  {/* Challenge Type Category Tabs */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'all', label: `All Programs (${challenges.length})` },
                      { id: 'two_step', label: '2-Step Classic (6)' },
                      { id: 'one_step', label: '1-Step Pro (6)' },
                      { id: 'instant', label: 'Instant Funded (6)' },
                      { id: 'three_step', label: '3-Step Institutional (6)' },
                    ].map((tabItem) => (
                      <button
                        key={tabItem.id}
                        type="button"
                        onClick={() => setDashChTypeFilter(tabItem.id as ChallengeType | 'all')}
                        className={`px-3.5 py-2 rounded-full text-xs font-display font-bold whitespace-nowrap transition-all cursor-pointer ${
                          dashChTypeFilter === tabItem.id
                            ? 'bg-[#00E676] text-[#03120F] shadow-[0_6px_20px_rgba(0,229,176,0.32)]'
                            : 'bg-[#050C10] text-[#A3BDB8] hover:text-white hover:bg-[#0D1E26] border border-white/10'
                        }`}
                      >
                        {tabItem.label}
                      </button>
                    ))}
                  </div>

                  {/* Account Size Filter Pills (Clean $5K to $200K without $10 clutter) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDashChSizeFilter('all')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all cursor-pointer ${
                        dashChSizeFilter === 'all'
                          ? 'bg-[#00E5B0]/20 border border-[#00E5B0] text-[#00E5B0] shadow-[0_0_14px_rgba(0,229,176,0.2)]'
                          : 'bg-[#050C10] text-[#728F8A] hover:text-white border border-white/10'
                      }`}
                    >
                      All Sizes
                    </button>
                    {ACCOUNT_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setDashChSizeFilter(size)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-all cursor-pointer tabular-nums ${
                          dashChSizeFilter === size
                            ? 'bg-[#00E5B0]/20 border border-[#00E5B0] text-[#00E5B0] shadow-[0_0_14px_rgba(0,229,176,0.2)]'
                            : 'bg-[#050C10] text-[#A3BDB8] hover:text-white border border-white/10'
                        }`}
                      >
                        ${(size / 1000).toFixed(0)}K
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid of All Filtered Challenges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                  {dashboardFilteredChallenges.map((ch) => (
                    <div
                      key={ch.id}
                      className="bg-[#090D0A] hover:bg-[#0D130F] border border-[#00E676]/15 hover:border-[#00E676]/45 rounded-[14px] p-5 space-y-3.5 transition-all flex flex-col justify-between shadow-lg"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <span className="px-2 py-0.5 rounded-[5px] bg-[#030504] border border-[#00E676]/30 text-[10px] font-display font-bold text-[#00E676] uppercase">
                            {ch.typeLabel}
                          </span>
                          <span className="font-display text-base font-extrabold text-[#00E676] tabular-nums">
                            ${ch.priceUsd} USD
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-display font-bold text-white tabular-nums">
                            ${ch.accountSize.toLocaleString()} USD
                          </h3>
                          <div className="text-[11px] text-[#A3BDB8] mt-0.5">
                            {ch.title}
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs bg-[#030504] p-3 rounded-[9px] border border-white/10">
                          <div className="flex justify-between">
                            <span className="text-[#A7B1AA]">Profit Target</span>
                            <span className="font-display font-bold text-[#00E676]">
                              {ch.type === 'instant' || ch.profitTargetPct === 0
                                ? 'None (Instant Funded)'
                                : `${ch.profitTargetPct}%`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A7B1AA]">Daily Drawdown</span>
                            <span className="font-display font-bold text-white">{ch.dailyDrawdownPct}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A7B1AA]">Max Drawdown</span>
                            <span className="font-display font-bold text-white">{ch.maxDrawdownPct}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A7B1AA]">Profit Split</span>
                            <span className="font-display font-bold text-[#00E676]">Up to {ch.profitSplitPct}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A7B1AA]">Leverage</span>
                            <span className="font-display font-bold text-white">1:{ch.leverage}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openStripeCheckout(ch.id, ch.accountSize === 5000 ? '5K30OFF' : undefined)}
                        className="w-full py-2.5 rounded-[9px] apex-glow-btn text-xs uppercase tracking-wider cursor-pointer mt-1"
                      >
                        Start Challenge — ${ch.priceUsd}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* =====================================================================
              5. SUPPORT & KYC TAB
              ===================================================================== */}
          {activeTab === 'kyc' && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 apex-fade-up">
              {/* KYC Form */}
              <div className="bg-[#090D0A] border border-[#00E676]/15 rounded-[14px] p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-[#00E676]" />
                      <span>Identity Verification (KYC)</span>
                    </h2>
                    <p className="text-xs text-[#A7B1AA] mt-1">
                      Verify your identity to unlock direct performance payouts.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-[7px] bg-[#0D130F] border border-[#00E676]/30 text-xs font-mono font-bold text-[#00E676]">
                    {user.kycStatus?.toUpperCase() || 'NOT SUBMITTED'}
                  </span>
                </div>

                {kycSubmittedSuccess ? (
                  <div className="p-6 rounded-[12px] bg-[#030504] border border-[#00E676]/35 text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-[#00E676] mx-auto" />
                    <h3 className="text-lg font-display font-bold text-white">KYC Submitted Successfully</h3>
                    <p className="text-xs text-[#A7B1AA]">
                      Our compliance desk is reviewing your documents (12–24 hours).
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleKycSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#A7B1AA] mb-1">Full Legal Name</label>
                        <input
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-xs text-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#A7B1AA] mb-1">Document Type</label>
                        <select
                          value={kycDocType}
                          onChange={(e) => setKycDocType(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-xs text-white font-semibold"
                        >
                          <option value="Passport">International Passport</option>
                          <option value="National ID">National ID Card</option>
                          <option value="Driver License">Driver&apos;s License</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#A7B1AA] mb-1">Document Serial Number</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter document number"
                        value={kycDocNumber}
                        onChange={(e) => setKycDocNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="h-24 rounded-[10px] border border-dashed border-[#00E676]/35 bg-[#030504] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#00E676]">
                        <Upload className="w-5 h-5 text-[#00E676]" />
                        <span className="text-[11px] font-medium text-white">
                          {kycFrontImage ? 'Front ID Attached ✓' : 'Upload Front ID'}
                        </span>
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
                      <label className="h-24 rounded-[10px] border border-dashed border-[#00E676]/35 bg-[#030504] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#00E676]">
                        <Upload className="w-5 h-5 text-[#00E676]" />
                        <span className="text-[11px] font-medium text-white">
                          {kycBackImage ? 'Back ID Attached ✓' : 'Upload Back ID'}
                        </span>
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
                    </div>

                    <button
                      type="submit"
                      disabled={kycSubmitting}
                      className="w-full py-3 rounded-[9px] apex-glow-btn text-xs cursor-pointer"
                    >
                      {kycSubmitting ? 'Submitting...' : 'Submit Identity Verification'}
                    </button>
                  </form>
                )}
              </div>

              {/* Support Desk Ticket Form */}
              <div className="bg-[#090D0A] border border-[#00E676]/15 rounded-[14px] p-6 sm:p-7 space-y-5">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#00E676]" />
                    <span>Institutional Trader Support Desk</span>
                  </h2>
                  <p className="text-xs text-[#A7B1AA] mt-1">
                    Submit a direct support ticket regarding your evaluation account, terminal credentials, or payouts.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!supportSubject.trim() || !supportMessage.trim()) return;
                    pushNotification(
                      'Support Ticket Opened',
                      `Ticket "${supportSubject}" dispatched to FUNDED APEX Support Desk.`,
                      'success'
                    );
                    setSupportSubject('');
                    setSupportMessage('');
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-[#A7B1AA] mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      placeholder="e.g. Account #APEX-100K Terminal Credentials"
                      className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#A7B1AA] mb-1">Message</label>
                    <textarea
                      rows={4}
                      required
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Describe how our institutional desk can assist you..."
                      className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-[9px] apex-secondary-btn text-xs cursor-pointer"
                  >
                    Submit Support Ticket →
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* =====================================================================
              6. CERTIFICATES TAB
              ===================================================================== */}
          {activeTab === 'certificates' && (
            <section className="space-y-6 apex-fade-up">
              <div className="bg-[#090D0A] border border-[#00E676]/15 rounded-[14px] p-6 space-y-2">
                <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#00E676]" />
                  <span>Official Trader Certificates</span>
                </h2>
                <p className="text-xs text-[#A7B1AA]">
                  Issued automatically when your evaluation account passes all steps or when an Instant Funded account is active.
                </p>
              </div>

              {(() => {
                const eligibleCertAccounts = accounts.filter(
                  (acc) =>
                    acc.status === 'passed' ||
                    acc.status === 'completed' ||
                    (acc.challengeType === 'instant' &&
                      acc.status !== 'failed' &&
                      acc.status !== 'suspended')
                );

                if (eligibleCertAccounts.length === 0) {
                  return (
                    <div className="bg-[#090D0A] border border-dashed border-[#00E676]/30 rounded-[14px] p-10 text-center space-y-4">
                      <Award className="w-10 h-10 text-[#00E676] mx-auto" />
                      <div className="space-y-1 max-w-md mx-auto">
                        <h3 className="text-lg font-display font-bold text-white">
                          No Passed or Instant Funded Certificates Yet
                        </h3>
                        <p className="text-xs text-[#A7B1AA]">
                          Pass your evaluation target or activate an Instant Funded account to generate your verified certificate.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('terminal')}
                        className="px-6 py-3 rounded-[9px] apex-glow-btn text-xs cursor-pointer"
                      >
                        Open Trading Terminal →
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {eligibleCertAccounts.map((acc) => {
                      const isInstantCert = acc.challengeType === 'instant';
                      const certTitle = isInstantCert
                        ? `Instant Funded Certificate (#${acc.accountNumber})`
                        : `Passed Evaluation Certificate (#${acc.accountNumber})`;
                      const issuedDate = new Date(
                        acc.updatedAt || acc.createdAt || Date.now()
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <div key={acc.id} className="bg-[#090D0A] border border-[#00E676]/20 rounded-[14px] p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <Award className="w-6 h-6 text-[#00E676]" />
                            <span className="px-2.5 py-0.5 rounded-[6px] bg-[#0D130F] border border-[#00E676]/30 text-[10px] font-mono font-bold text-[#00E676]">
                              {isInstantCert ? 'INSTANT FUNDED' : 'PASSED'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-base font-display font-bold text-white">{certTitle}</h3>
                            <div className="text-xs text-[#00E676] font-mono font-bold mt-1">
                              Capital: ${acc.startingBalance.toLocaleString()} USD
                            </div>
                            <div className="text-[11px] text-[#77837B] mt-0.5 font-mono">
                              Trader: {user.fullName} · {issuedDate}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCertificateModal({
                                title: certTitle,
                                accountSize: acc.startingBalance,
                                issueDate: issuedDate,
                                traderName: user.fullName,
                              })
                            }
                            className="w-full py-2.5 rounded-[9px] apex-secondary-btn text-xs flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-[#00E676]" />
                            <span>View &amp; Download Certificate</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {selectedCertificateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/85 backdrop-blur-md">
                  <div className="w-full max-w-2xl bg-[#050806] border border-[#00E676]/45 rounded-[16px] p-8 space-y-6 text-center shadow-2xl">
                    <div className="flex justify-between items-center">
                      <FundedApexLogo size="sm" />
                      <button
                        type="button"
                        onClick={() => setSelectedCertificateModal(null)}
                        className="p-2 rounded-[8px] bg-[#090D0A] text-[#A7B1AA] hover:text-white cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="border border-[#00E676]/35 p-8 rounded-[12px] space-y-4 bg-[#090D0A]">
                      <Award className="w-12 h-12 text-[#00E676] mx-auto" />
                      <div className="text-[11px] font-mono font-bold text-[#00E676] uppercase tracking-widest">
                        {selectedCertificateModal.title}
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white uppercase tracking-wider">
                        Certificate of Achievement
                      </h3>
                      <p className="text-xs text-[#A7B1AA]">This certifies that</p>
                      <h4 className="text-2xl font-display font-bold text-[#00E676]">
                        {selectedCertificateModal.traderName}
                      </h4>
                      <p className="text-xs text-[#A7B1AA] max-w-md mx-auto leading-relaxed">
                        is an authorized FUNDED APEX Trader managing a simulated capital allocation of{' '}
                        <strong className="text-white">${selectedCertificateModal.accountSize.toLocaleString()} USD</strong>.
                      </p>
                      <div className="text-xs font-mono text-[#77837B] pt-3">
                        Issued: {selectedCertificateModal.issueDate} · ID: APEX-CERT-{selectedCertificateModal.accountSize}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        pushNotification('Certificate Downloaded', 'Saved official PDF certificate.', 'success');
                        setSelectedCertificateModal(null);
                      }}
                      className="px-8 py-3 rounded-[9px] apex-glow-btn text-xs cursor-pointer"
                    >
                      Download Official PDF →
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* =====================================================================
              7. PAYOUTS TAB
              ===================================================================== */}
          {activeTab === 'payouts' && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 apex-fade-up">
              <div className="bg-[#090D0A] border border-[#00E676]/15 rounded-[14px] p-6 sm:p-7 space-y-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#00E676]" />
                    <span>Performance Payout Request</span>
                  </h2>
                  <p className="text-xs text-[#A7B1AA] leading-relaxed">
                    Instant Funded accounts can withdraw profit when P&amp;L &gt; $0 and the 15% Consistency Rule is satisfied. Multi-step evaluations unlock payouts once all evaluation phases are passed.
                  </p>
                </div>

                {accounts.length === 0 ? (
                  <div className="p-6 rounded-[12px] bg-[#030504] border border-white/10 text-center space-y-3">
                    <p className="text-xs text-[#A7B1AA]">
                      Purchase an evaluation account and generate positive P&amp;L to unlock payouts.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('challenges')}
                      className="px-5 py-2.5 rounded-[9px] apex-glow-btn text-xs cursor-pointer"
                    >
                      Explore Challenges →
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#A7B1AA] mb-1.5">
                        1. Select Trading Account
                      </label>
                      <select
                        value={selectedPayoutAccount?.id || ''}
                        onChange={(e) => {
                          setSelectedPayoutAccountId(e.target.value);
                          setPayoutErrorMsg(null);
                          setPayoutSubmittedMsg(null);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-xs font-mono font-bold text-white"
                      >
                        {accounts.map((acc) => {
                          const accRules = resolveChallengeRulesForAccount(acc);
                          const accClosed = userOrders.filter(
                            (o) => o.accountId === acc.id && o.status === 'CLOSED'
                          );
                          const accRealizedNet = accClosed.reduce((s, o) => s + (o.netPnl || 0), 0);
                          const accWithdrawnGross = payouts
                            .filter((p) => p.accountId === acc.id)
                            .reduce((s, p) => s + p.amountUsd / ((accRules.profitSplitPct || 80) / 100), 0);
                          const syncedBal =
                            acc.status === 'failed'
                              ? acc.balance
                              : acc.startingBalance + accRealizedNet - accWithdrawnGross;
                          const pnl = Math.round((syncedBal - acc.startingBalance) * 100) / 100;
                          const stepBadge =
                            acc.status === 'passed' || acc.status === 'completed'
                              ? 'FUNDED'
                              : (acc.totalSteps || accRules.totalSteps) > 1
                              ? `STEP ${acc.currentStep || 1}/${acc.totalSteps || accRules.totalSteps}`
                              : 'PHASE 1';
                          return (
                            <option key={acc.id} value={acc.id}>
                              #{acc.accountNumber} · {acc.challengeTitle} [{stepBadge}] · P&amp;L: {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {payoutEligibility && selectedPayoutAccount && (
                      <div className="p-4 rounded-[12px] bg-[#030504] border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-display font-bold text-white">
                            #{payoutEligibility.accountNumber} Status
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-[6px] text-[10px] font-mono font-bold uppercase ${
                              payoutEligibility.eligible
                                ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                            }`}
                          >
                            {payoutEligibility.eligible ? 'PAYOUT UNLOCKED ✓' : 'OBJECTIVES PENDING'}
                          </span>
                        </div>

                        {/* Multi-Step Challenge Gate Indicator (1-Step / 2-Step / 3-Step) */}
                        {(() => {
                          const rules = resolveChallengeRulesForAccount(selectedPayoutAccount);
                          const totalSteps = selectedPayoutAccount.totalSteps || rules.totalSteps || 1;
                          const currentStep = selectedPayoutAccount.currentStep || rules.currentStep || 1;
                          const isFunded =
                            selectedPayoutAccount.status === 'passed' ||
                            selectedPayoutAccount.status === 'completed';

                          if (totalSteps >= 2) {
                            return (
                              <div className="p-2.5 rounded-[9px] bg-[#090D0A] border border-white/10 space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="text-[#A7B1AA] uppercase font-bold">
                                    {totalSteps}-Step Evaluation Gate
                                  </span>
                                  <span className={isFunded ? 'text-[#00E676] font-bold' : 'text-amber-300 font-bold'}>
                                    {isFunded
                                      ? 'All Steps Passed — Funded ✓'
                                      : `Step ${currentStep} of ${totalSteps} Active`}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                                  <div
                                    className={`px-2 py-1.5 rounded-[6px] border text-center font-bold ${
                                      isFunded || currentStep > 1
                                        ? 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                                        : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                    }`}
                                  >
                                    Step 1 (+8%) {isFunded || currentStep > 1 ? '✓' : '•'}
                                  </div>
                                  <div
                                    className={`px-2 py-1.5 rounded-[6px] border text-center font-bold ${
                                      isFunded || (totalSteps > 2 && currentStep > 2)
                                        ? 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                                        : currentStep === 2
                                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                        : 'bg-[#030504] border-white/10 text-[#77837B]'
                                    }`}
                                  >
                                    Step 2 (+5%) {isFunded || (totalSteps > 2 && currentStep > 2) ? '✓' : currentStep === 2 ? '•' : '🔒'}
                                  </div>
                                  <div
                                    className={`px-2 py-1.5 rounded-[6px] border text-center font-bold ${
                                      isFunded
                                        ? 'bg-[#00E676]/20 border-[#00E676]/50 text-[#00E676]'
                                        : 'bg-[#030504] border-white/10 text-[#77837B]'
                                    }`}
                                  >
                                    Payouts {isFunded ? '✓' : '🔒'}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="p-2.5 rounded-[8px] bg-[#090D0A] border border-white/5">
                            <span className="text-[10px] text-[#77837B] block">Realized P&amp;L</span>
                            <strong className={payoutEligibility.realizedProfitUsd > 0 ? 'text-[#00E676]' : 'text-white'}>
                              ${payoutEligibility.realizedProfitUsd.toFixed(2)}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded-[8px] bg-[#090D0A] border border-white/5">
                            <span className="text-[10px] text-[#77837B] block">
                              Withdrawable ({payoutEligibility.profitSplitPct}%)
                            </span>
                            <strong className="text-[#00E676]">
                              ${payoutEligibility.maxWithdrawableUsd.toFixed(2)}
                            </strong>
                          </div>
                        </div>

                        <div className="text-xs text-[#A7B1AA]">{payoutEligibility.reason}</div>
                      </div>
                    )}

                    {payoutErrorMsg && (
                      <div className="p-3.5 rounded-[9px] bg-red-950/60 border border-red-500/50 text-xs font-bold text-red-300">
                        {payoutErrorMsg}
                      </div>
                    )}

                    {payoutSubmittedMsg && (
                      <div className="p-3.5 rounded-[9px] bg-[#0D130F] border border-[#00E676]/45 text-xs font-bold text-[#00E676]">
                        {payoutSubmittedMsg}
                      </div>
                    )}

                    <form onSubmit={handlePayoutSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[#A7B1AA] mb-1">
                          2. Withdrawal Amount (USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="20"
                          max={payoutEligibility?.maxWithdrawableUsd || 100000}
                          disabled={!payoutEligibility?.eligible}
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-sm font-mono font-bold text-white disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#A7B1AA] mb-1">
                          3. Settlement Method
                        </label>
                        <select
                          disabled={!payoutEligibility?.eligible}
                          value={payoutMethod}
                          onChange={(e) => setPayoutMethod(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-xs text-white font-semibold disabled:opacity-50"
                        >
                          <option value="USDT_BEP20">USDT (BEP-20 BNB Smart Chain)</option>
                          <option value="USDT_TRC20">USDT (TRC-20)</option>
                          <option value="USDC">USDC (ERC-20)</option>
                          <option value="WIRE">Bank Wire Transfer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#A7B1AA] mb-1">
                          4. Destination Wallet Address
                        </label>
                        <input
                          type="text"
                          required
                          disabled={!payoutEligibility?.eligible}
                          placeholder="0x... USDT (BEP-20) wallet address"
                          value={payoutWalletAddress}
                          onChange={(e) => setPayoutWalletAddress(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-xs text-white font-mono disabled:opacity-50"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!payoutEligibility?.eligible}
                        className="w-full py-3 rounded-[9px] apex-glow-btn text-xs cursor-pointer disabled:opacity-40"
                      >
                        {payoutEligibility?.eligible
                          ? `Withdraw $${payoutAmount.toFixed(2)} USD Profit →`
                          : 'Payout Locked — Complete Challenge Objectives'}
                      </button>
                    </form>
                  </>
                )}
              </div>

              <div className="bg-[#090D0A] border border-[#00E676]/15 rounded-[14px] p-6 sm:p-7 space-y-4">
                <h2 className="text-xl font-display font-bold text-white">
                  Verified Payout Registry
                </h2>
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {verifiedPayouts.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-[10px] bg-[#030504] border border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-display font-bold text-white">{p.traderName}</div>
                        <div className="text-[11px] text-[#77837B] font-mono">{p.currency} · {p.paymentDate}</div>
                      </div>
                      <div className="font-mono text-[#00E676] font-extrabold text-sm tabular-nums">
                        +${p.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* =====================================================================
              8. REWARDS & AFFILIATE TAB
              ===================================================================== */}
          {activeTab === 'affiliate' && (
            <section className="space-y-6 apex-fade-up">
              <div className="bg-[#090D0A] border border-[#00E676]/15 rounded-[14px] p-6 sm:p-8 space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[7px] bg-[#0D130F] border border-[#00E676]/30 text-xs font-mono font-bold text-[#00E676]">
                      <Gift className="w-3.5 h-3.5" />
                      <span>TRADER REWARDS &amp; PARTNER PROGRAM</span>
                    </div>
                    <h2 className="text-2xl font-display font-bold text-white">
                      Rewards, Coupons &amp; 15% Partner Commissions
                    </h2>
                    <p className="text-xs text-[#A7B1AA] max-w-xl">
                      Claim exclusive evaluation discount rewards or share your partner link to earn 15% commission on referrals.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-4 py-2.5 rounded-[12px] bg-[#061318] border border-[#00E5B0]/35 text-xs font-mono font-bold text-[#00E5B0]">
                      Rewards Vault: Coming Soon
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyReferral}
                      className="px-5 py-2.5 rounded-[9px] apex-glow-btn text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Partner Link</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-[12px] bg-[#030504] border border-white/10">
                    <div className="text-xs text-[#A7B1AA]">Partner Referral Code</div>
                    <div className="text-xl font-mono font-bold text-[#00E676] mt-1">{user.referralCode}</div>
                  </div>
                  <div className="p-4 rounded-[12px] bg-[#030504] border border-white/10">
                    <div className="text-xs text-[#A7B1AA]">Direct Commission</div>
                    <div className="text-xl font-mono font-bold text-white mt-1">15% Lifetime</div>
                  </div>
                  <div className="p-4 rounded-[12px] bg-[#030504] border border-white/10">
                    <div className="text-xs text-[#A7B1AA]">Active Reward Coupons</div>
                    <div className="text-xl font-mono font-bold text-[#00E676] mt-1">{userCoupons.length} Available</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =====================================================================
              9. SETTINGS TAB
              ===================================================================== */}
          {activeTab === 'settings' && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 apex-fade-up">
              <div className="bg-[#090D0A] border border-[#00E676]/15 rounded-[14px] p-6 sm:p-7 space-y-5">
                <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#00E676]" />
                  <span>Profile Settings</span>
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A7B1AA] mb-1.5">
                      Profile Picture
                    </label>
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] bg-[#030504] border border-white/15 text-xs font-medium text-white cursor-pointer hover:border-[#00E676]">
                      <Upload className="w-4 h-4 text-[#00E676]" />
                      <span>Upload Avatar</span>
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A7B1AA] mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-sm font-medium text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A7B1AA] mb-1.5">Country</label>
                    <select
                      value={profileCountry}
                      onChange={(e) => setProfileCountry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-sm font-medium text-white"
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
                    className="px-6 py-2.5 rounded-[9px] apex-glow-btn text-xs cursor-pointer"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </div>

              <div className="bg-[#090D0A] border border-[#00E676]/15 rounded-[14px] p-6 sm:p-7 space-y-5">
                <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00E676]" />
                  <span>Security &amp; Credentials</span>
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A7B1AA] mb-1.5">Change Password</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min. 8 chars)"
                        className="flex-1 px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-white/15 text-xs text-white"
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
                        className="px-4 py-2.5 rounded-[9px] apex-glow-btn text-xs cursor-pointer"
                      >
                        Update
                      </button>
                    </div>
                    {passwordStatus && <p className="text-xs text-[#00E676] mt-1 font-medium">{passwordStatus}</p>}
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-[10px] bg-[#030504] border border-white/10">
                    <div>
                      <div className="text-sm font-display font-bold text-white">
                        Multi-Factor Authentication (MFA)
                      </div>
                      <div className="text-xs text-[#A7B1AA]">
                        Status: {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateUserProfile({ mfaEnabled: !user.mfaEnabled })}
                      className="px-4 py-2 rounded-[8px] bg-[#0D130F] border border-[#00E676]/35 text-xs text-[#00E676] font-bold cursor-pointer"
                    >
                      {user.mfaEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-[10px] bg-red-950/30 border border-red-500/35">
                    <div>
                      <div className="text-sm font-display font-bold text-white">
                        Sign Out of Session
                      </div>
                      <div className="text-xs text-[#A7B1AA] mt-0.5">
                        Safely terminate your current trader session.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate('login');
                      }}
                      className="px-4 py-2 rounded-[8px] bg-red-500/20 hover:bg-red-500/35 border border-red-500/45 text-red-300 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
