import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlatform } from '../context/PlatformContext';
import { ACCOUNT_SIZES, COUNTRIES, FAQ_ITEMS, ChallengeTemplate } from '../data/platformData';
import { ChallengeType } from '../engine/tradingEngine';
import { ApexHero3DScene } from './ApexHero3DScene';
import { FundedApexLogo } from './FundedApexLogo';
import {
  ArrowRight,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  Eye,
  EyeOff,
  HelpCircle,
  Layers,
  Lock,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';

// ============================================================================
// CUSTOM 3D ARCHITECTURAL SVG EMBLEMS (MATTE BLACK METAL + EMERALD GLASS)
// ============================================================================
const ArchitecturalCubeEmblem: React.FC<{ variant?: number }> = ({ variant = 0 }) => {
  return (
    <svg viewBox="0 0 56 56" fill="none" className="w-11 h-11 shrink-0 apex-float-shape" aria-hidden="true">
      <defs>
        <linearGradient id={`apex-metal-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#122830" />
          <stop offset="55%" stopColor="#081419" />
          <stop offset="100%" stopColor="#040A0D" />
        </linearGradient>
        <linearGradient id={`apex-emerald-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38F8D2" />
          <stop offset="50%" stopColor="#00E5B0" />
          <stop offset="100%" stopColor="#00B894" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="52"
        height="52"
        rx="16"
        fill="#061014"
        stroke="rgba(0,229,176,0.28)"
        strokeWidth="1"
      />
      {variant % 3 === 0 && (
        <>
          <polygon
            points="28,10 44,19 44,37 28,46 12,37 12,19"
            fill={`url(#apex-metal-${variant})`}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1"
          />
          <polygon
            points="28,10 44,19 28,28 12,19"
            fill="rgba(0,230,118,0.14)"
            stroke="#00E676"
            strokeWidth="1.2"
          />
          <line x1="28" y1="28" x2="28" y2="46" stroke="#00E676" strokeWidth="1.4" />
        </>
      )}
      {variant % 3 === 1 && (
        <>
          <polygon
            points="28,9 45,41 11,41"
            fill={`url(#apex-metal-${variant})`}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
          />
          <polygon
            points="28,17 38,37 18,37"
            fill="rgba(0,230,118,0.15)"
            stroke={`url(#apex-emerald-${variant})`}
            strokeWidth="1.3"
          />
          <circle cx="28" cy="31" r="2.5" fill="#00E676" />
        </>
      )}
      {variant % 3 === 2 && (
        <>
          <rect
            x="13"
            y="26"
            width="6"
            height="16"
            rx="1.5"
            fill="#141E18"
            stroke="rgba(255,255,255,0.15)"
          />
          <rect
            x="25"
            y="19"
            width="6"
            height="23"
            rx="1.5"
            fill="#192820"
            stroke="rgba(0,230,118,0.4)"
          />
          <rect
            x="37"
            y="12"
            width="6"
            height="30"
            rx="1.5"
            fill={`url(#apex-emerald-${variant})`}
          />
        </>
      )}
    </svg>
  );
};

export const PublicPages: React.FC = () => {
  const {
    route,
    navigate,
    quotes,
    challenges,
    verifiedPayouts,
    leaderboard,
    user,
    loginWithEmail,
    registerWithEmail,
    sendPasswordReset,
    openStripeCheckout,
    userCoupons,
    spinDailyWheel,
  } = usePlatform();

  // Interactive Challenge Configurator State
  const [selectedType, setSelectedType] = useState<ChallengeType>('two_step');
  const [selectedSize, setSelectedSize] = useState<number>(50000);
  const [faqQuery, setFaqQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [detailModalChallenge, setDetailModalChallenge] = useState<ChallengeTemplate | null>(null);

  // Reward Wheel State
  const [isSpinningWheel, setIsSpinningWheel] = useState(false);
  const [wheelRotationDeg, setWheelRotationDeg] = useState(0);
  const [wonPrizeBanner, setWonPrizeBanner] = useState<{
    label: string;
    code: string;
    discountPct: number;
    description: string;
  } | null>(null);

  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authCountry, setAuthCountry] = useState('India');
  const [authReferral, setAuthReferral] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotBox, setShowForgotBox] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const forgotInputRef = useRef<HTMLInputElement | null>(null);

  const scrollBarRef = useRef<HTMLDivElement | null>(null);

  // Scroll Progress Bar (Zero layout-read during scroll for locked 60FPS)
  useEffect(() => {
    if (route !== 'home') return;
    let rafId = 0;
    let cachedMaxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    const measureDocHeight = () => {
      cachedMaxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };

    const updateScroll = () => {
      rafId = 0;
      if (!scrollBarRef.current) return;
      const progress = Math.min(1, Math.max(0, window.scrollY / cachedMaxScroll));
      scrollBarRef.current.style.transform = `scale3d(${progress.toFixed(4)}, 1, 1)`;
    };

    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateScroll);
    };

    measureDocHeight();
    updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measureDocHeight, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measureDocHeight);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [route]);

  const scrollToSection = (sectionId: string) => {
    if (route !== 'home') {
      navigate('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 90);
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const availableChallenges = challenges.filter((c) => c.status === 'available');
  const selectedChallenge =
    availableChallenges.find((c) => c.type === selectedType && c.accountSize === selectedSize) ||
    availableChallenges.find((c) => c.type === selectedType) ||
    availableChallenges[0];

  const handleBuyChallenge = (challengeId: string) => {
    openStripeCheckout(challengeId);
  };

  // Prevent background scrolling and enable ESC to close when Program Details Modal is active
  useEffect(() => {
    if (detailModalChallenge && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setDetailModalChallenge(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [detailModalChallenge]);

  // ============================================================================
  // PROGRAM SPECIFICATION MODAL (PORTALED DIRECTLY TO BODY FOR ROCK-SOLID CENTERING)
  // ============================================================================
  const renderProgramDetailsModal = () => {
    if (!detailModalChallenge || typeof document === 'undefined') return null;
    const ch = detailModalChallenge;

    return createPortal(
      <AnimatePresence>
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="program-spec-title"
          data-interactive-container
          style={{ willChange: 'transform, opacity' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailModalChallenge(null);
            }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 sm:p-6 overflow-y-auto"
        >
          <motion.div
            data-interactive-container
            style={{ willChange: 'transform, opacity', transform: 'translate3d(0, 0, 0)' }}
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto my-auto rounded-[24px] bg-[#071318]/98 border border-[#00E5B0]/35 p-6 sm:p-7 space-y-5 shadow-[0_32px_95px_rgba(0,0,0,0.96),inset_0_1px_0_rgba(56,248,210,0.18)] custom-scrollbar"
          >
          <div className="flex items-start justify-between gap-4 border-b border-[#00E5B0]/20 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00E5B0]/12 border border-[#00E5B0]/30 text-[10px] font-mono font-bold uppercase tracking-wider text-[#00E5B0]">
                <span>{ch.typeLabel}</span>
                <span>•</span>
                <span>Institutional Spec</span>
              </div>
              <h3 id="program-spec-title" className="text-2xl font-display font-extrabold text-[#FFFFFF] mt-1.5 tracking-tight">
                ${ch.accountSize.toLocaleString()} USD Funded Evaluation
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setDetailModalChallenge(null)}
              aria-label="Close modal"
              className="p-1.5 rounded-full text-[#A3BDB8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-[16px] bg-[#050E13] border border-[#00E5B0]/20">
              <div className="text-[#728F8A] uppercase font-mono text-[10px] font-bold">Account Size</div>
              <div className="text-base font-mono font-extrabold text-white mt-1">
                ${ch.accountSize.toLocaleString()}
              </div>
            </div>
            <div className="p-3.5 rounded-[16px] bg-[#050E13] border border-[#00E5B0]/20">
              <div className="text-[#728F8A] uppercase font-mono text-[10px] font-bold">Evaluation Fee</div>
              <div className="text-base font-mono font-extrabold text-[#00E5B0] mt-1">
                ${ch.priceUsd} USD
              </div>
            </div>
            <div className="p-3.5 rounded-[16px] bg-[#050E13] border border-[#00E5B0]/20">
              <div className="text-[#728F8A] uppercase font-mono text-[10px] font-bold">Profit Target</div>
              <div className="text-sm font-mono font-bold text-white mt-1">
                {ch.profitTargetPct === 0 ? 'None (Instant Funded)' : `${ch.profitTargetPct}% Target`}
              </div>
            </div>
            <div className="p-3.5 rounded-[16px] bg-[#050E13] border border-[#00E5B0]/20">
              <div className="text-[#728F8A] uppercase font-mono text-[10px] font-bold">Daily / Max Drawdown</div>
              <div className="text-sm font-mono font-bold text-white mt-1">
                {ch.dailyDrawdownPct}% / {ch.maxDrawdownPct}%
              </div>
            </div>
            <div className="p-3.5 rounded-[16px] bg-[#050E13] border border-[#00E5B0]/20">
              <div className="text-[#728F8A] uppercase font-mono text-[10px] font-bold">Trading Duration</div>
              <div className="text-sm font-mono font-bold text-white mt-1">
                {ch.minTradingDays} Min Days · Unlimited Time
              </div>
            </div>
            <div className="p-3.5 rounded-[16px] bg-[#050E13] border border-[#00E5B0]/20">
              <div className="text-[#728F8A] uppercase font-mono text-[10px] font-bold">Profit Split &amp; Leverage</div>
              <div className="text-sm font-mono font-bold text-[#00E5B0] mt-1">
                Up to {ch.profitSplitPct}% · 1:{ch.leverage}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-[16px] bg-[#040A0D] border border-white/8 text-xs text-[#A3BDB8] space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#00E5B0]" />
              <span>Authorized Instruments &amp; Execution Rules</span>
            </div>
            <p className="leading-relaxed">
              Trade Forex Majors, Gold (XAUUSD), US Indices (NAS100, US30, SPX500), and Crypto with zero time limit, ultra-low raw spreads, and 100% evaluation fee refund on your first verified payout.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDetailModalChallenge(null)}
              className="px-4 py-2.5 rounded-[14px] bg-[#08151B] border border-white/12 text-xs font-semibold text-[#A3BDB8] hover:text-white cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const id = ch.id;
                setDetailModalChallenge(null);
                handleBuyChallenge(id);
              }}
              className="px-6 py-2.5 rounded-[14px] bg-[#00E5B0] hover:bg-[#2AFADF] text-[#03120F] font-display font-bold text-xs cursor-pointer transition-all shadow-[0_8px_24px_rgba(0,229,176,0.3)]"
            >
              Start Challenge — ${ch.priceUsd}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
      document.body
    );
  };

  // ============================================================================
  // AUTH PAGES: LOGIN & REGISTER (#000000 PURE BLACK + #090D0A CARD)
  // ============================================================================
  if (route === 'login' || route === 'register') {
    const isLogin = route === 'login';

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      setAuthInfo(null);
      setAuthLoading(true);
      try {
        if (isLogin) {
          await loginWithEmail(authEmail, authPassword);
        } else {
          await registerWithEmail({
            email: authEmail,
            password: authPassword,
            fullName: authName,
            country: authCountry,
            referralCode: authReferral,
          });
        }
      } catch (err: any) {
        setAuthError(err?.message || 'Authentication failed');
      } finally {
        setAuthLoading(false);
      }
    };

    const handleForgot = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setAuthError(null);
      setAuthInfo(null);
      const targetResetEmail = (forgotEmail || authEmail).trim();
      if (!targetResetEmail) {
        setShowForgotBox(true);
        setAuthError('Please enter your registered email address below to reset your password.');
        setTimeout(() => forgotInputRef.current?.focus(), 60);
        return;
      }
      try {
        await sendPasswordReset(targetResetEmail);
        setAuthInfo(`Password reset link & recovery code sent to ${targetResetEmail}.`);
        setShowForgotBox(false);
      } catch (err: any) {
        setAuthError(err?.message || 'Unable to send reset link');
      }
    };

    return (
      <main className="min-h-[calc(100vh-80px)] bg-transparent flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div
          aria-hidden="true"
          style={{
            background: 'radial-gradient(circle, rgba(0, 230, 118, 0.08) 0%, transparent 70%)',
          }}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full"
        />
        <motion.div
          key={route}
          data-interactive-container
          initial={false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-[14px] bg-[#090D0A] border border-[#00E676]/20 p-7 sm:p-8 space-y-6 relative z-10 shadow-[0_24px_70px_rgba(0,0,0,0.92)]"
        >
          <div className="space-y-2 text-center">
            <div className="flex justify-center mb-3">
              <FundedApexLogo variant="compact" size="md" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
              {isLogin ? 'Institutional Portal Login' : 'Create Funded Trader Account'}
            </h1>
            <p className="text-xs sm:text-sm text-[#A7B1AA]">
              {isLogin
                ? 'Access your FUNDED APEX evaluation accounts, analytics, and live trading terminal.'
                : 'Register your institutional profile to start a funded trading challenge up to $200,000.'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-[9px] bg-red-500/10 border border-red-500/35 text-xs font-medium text-red-300">
              {authError}
            </div>
          )}
          {authInfo && (
            <div className="p-3.5 rounded-[9px] bg-[#00E676]/10 border border-[#00E676]/35 text-xs font-medium text-[#00E676]">
              {authInfo}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-[#A7B1AA] mb-1.5">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-[#00E676]/20 text-sm text-white focus:outline-none focus:border-[#00E676]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#A7B1AA] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                data-testid="auth-email-input"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="trader@fundedapex.com"
                className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-[#00E676]/20 text-sm text-white focus:outline-none focus:border-[#00E676]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#A7B1AA]">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    data-testid="forgot-password-toggle-btn"
                    onClick={() => {
                      setShowForgotBox((prev) => {
                        const next = !prev;
                        if (next) {
                          if (authEmail && !forgotEmail) setForgotEmail(authEmail);
                          setTimeout(() => forgotInputRef.current?.focus(), 60);
                        }
                        return next;
                      });
                    }}
                    className="text-xs text-[#00E5B0] hover:underline cursor-pointer"
                  >
                    {showForgotBox ? 'Hide reset box' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  data-testid="auth-password-input"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-11 py-2.5 rounded-[9px] bg-[#030504] border border-[#00E676]/20 text-sm text-white focus:outline-none focus:border-[#00E676]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#A3BDB8] hover:text-[#00E5B0] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A7B1AA] mb-1.5">
                    Country / Region
                  </label>
                  <div className="relative">
                    <select
                      value={authCountry}
                      onChange={(e) => setAuthCountry(e.target.value)}
                      data-testid="auth-country-select"
                      className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-[9px] bg-[#030504] border border-[#00E676]/25 text-sm text-white focus:outline-none focus:border-[#00E676] cursor-pointer"
                    >
                      {COUNTRIES.map((countryName) => (
                        <option
                          key={countryName}
                          value={countryName}
                          className="bg-[#061015] text-white"
                        >
                          {countryName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#00E5B0] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A7B1AA] mb-1.5">
                    Partner Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={authReferral}
                    onChange={(e) => setAuthReferral(e.target.value)}
                    placeholder="APEX-PARTNER"
                    className="w-full px-3.5 py-2.5 rounded-[9px] bg-[#030504] border border-[#00E676]/20 text-sm text-white focus:outline-none focus:border-[#00E676]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              data-testid="auth-submit-btn"
              className="w-full py-3 px-5 rounded-[9px] bg-[#00E676] hover:bg-[#00C853] text-[#000000] font-display font-bold text-sm cursor-pointer transition-all shadow-[0_8px_24px_rgba(0,230,118,0.25)]"
            >
              {authLoading
                ? 'Authenticating...'
                : isLogin
                ? 'Sign In to FUNDED APEX'
                : 'Create Trader Account'}
            </button>
          </form>

          {/* Forgot Password Email Recovery Box — ONLY shown after user clicks "Forgot password?" */}
          <AnimatePresence initial={false}>
            {isLogin && showForgotBox && (
              <motion.div
                key="forgot-password-panel"
                data-interactive-container
                style={{ willChange: 'transform, opacity', transform: 'translate3d(0, 0, 0)' }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="pt-3 border-t border-white/10 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#A3BDB8] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#00E5B0]" />
                    <span>Reset Password via Registered Email</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowForgotBox(false)}
                    className="text-[11px] font-medium text-[#A3BDB8] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleForgot} className="flex items-center gap-2">
                  <input
                    ref={forgotInputRef}
                    type="email"
                    required
                    data-testid="forgot-password-email-input"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your email for password reset..."
                    className="flex-1 px-3 py-2 rounded-[9px] bg-[#030504] border border-[#00E5B0]/25 text-xs text-white placeholder-[#77837B] focus:outline-none focus:border-[#00E5B0]"
                  />
                  <button
                    type="submit"
                    data-testid="forgot-password-submit-btn"
                    className="px-3.5 py-2 rounded-[9px] bg-[#0D1E24] hover:bg-[#00E5B0] text-[#00E5B0] hover:text-[#020A0D] border border-[#00E5B0]/35 font-sans font-bold text-xs whitespace-nowrap transition-colors cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center text-xs text-[#A7B1AA] pt-1">
            {isLogin ? (
              <>
                New to FUNDED APEX?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotBox(false);
                    navigate('register');
                  }}
                  className="text-[#00E676] font-semibold hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotBox(false);
                    navigate('login');
                  }}
                  className="text-[#00E676] font-semibold hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </>
            )}
          </div>
        </motion.div>
      </main>
    );
  }

  // ============================================================================
  // ABOUT PAGE
  // ============================================================================
  if (route === 'about') {
    return (
      <main className="max-w-[1380px] mx-auto px-4 sm:px-8 py-14 space-y-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E676]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E676]">
            <span>INSTITUTIONAL PROPRIETARY TRADING</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            About FUNDED APEX
          </h1>
          <p className="text-base text-[#A7B1AA] leading-relaxed">
            FUNDED APEX is an international proprietary trading evaluation platform built for disciplined Forex, Gold, Index, and Digital Asset traders. We combine transparent risk rules, zero time limits, and an institutional in-house trading terminal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Institutional Execution Environment',
              desc: 'Trade major and minor Forex pairs, XAUUSD Gold, US Indices, and Crypto on our low-latency live candlestick terminal.',
            },
            {
              title: 'Automated Risk Governance',
              desc: 'Every evaluation parameter—daily drawdown, maximum drawdown, and minimum trading days—is tracked transparently in real time.',
            },
            {
              title: 'Bi-Weekly Profit Settlements',
              desc: 'Retain up to 95% of simulated profits with bi-weekly payout cycles and 100% evaluation fee reimbursement on your first payout.',
            },
          ].map((card, i) => (
            <div
              key={card.title}
              className="rounded-[14px] bg-[#090D0A] border border-[#00E676]/15 p-6 space-y-3"
            >
              <ArchitecturalCubeEmblem variant={i} />
              <h3 className="text-lg font-display font-bold text-[#FFFFFF]">{card.title}</h3>
              <p className="text-sm text-[#A7B1AA] leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ============================================================================
  // CHALLENGES & ACCOUNT SIZES DEDICATED PAGES
  // ============================================================================
  if (route === 'challenges' || route === 'account-sizes') {
    const filteredList = availableChallenges.filter((c) => c.type === selectedType);
    return (
      <main className="max-w-[1380px] mx-auto px-4 sm:px-8 py-12 space-y-10">
        {renderProgramDetailsModal()}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E676]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E676]">
              <span>EVALUATION ARCHITECTURE</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
              {route === 'account-sizes'
                ? 'Account Sizes & Capital Tiers'
                : 'Structured Trading Challenges'}
            </h1>
            <p className="text-sm sm:text-base text-[#A7B1AA]">
              Select your preferred evaluation model and capital tier from $5,000 to $200,000 USD. All challenges feature zero time limits and up to 95% profit split.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-[12px] bg-[#090D0A] border border-[#00E676]/15">
            {(
              [
                { type: 'two_step' as ChallengeType, label: 'Two Step' },
                { type: 'one_step' as ChallengeType, label: 'One Step' },
                { type: 'instant' as ChallengeType, label: 'Instant' },
                { type: 'three_step' as ChallengeType, label: 'Three Step' },
              ]
            ).map((tab) => (
              <button
                key={tab.type}
                type="button"
                onClick={() => setSelectedType(tab.type)}
                className={`px-4 py-2.5 rounded-[9px] text-xs font-display font-bold transition-all cursor-pointer ${
                  selectedType === tab.type
                    ? 'bg-[#00E676] text-[#000000] shadow-[0_0_20px_rgba(0,230,118,0.28)]'
                    : 'text-[#A7B1AA] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((ch) => (
            <div
              key={ch.id}
              className="rounded-[14px] bg-[#090D0A] hover:bg-[#0D130F] border border-[#00E676]/18 hover:border-[#00E676]/45 p-6 flex flex-col justify-between space-y-6 transition-all duration-200 shadow-[0_18px_45px_rgba(0,0,0,0.85)]"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-4">
                  <div>
                    <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.12em] text-[#00E676]">
                      {ch.typeLabel}
                    </div>
                    <div className="text-3xl font-mono font-extrabold text-[#FFFFFF] mt-1">
                      ${ch.accountSize.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right px-3.5 py-2 rounded-[10px] bg-[#030504] border border-[#00E676]/25">
                    <div className="text-[10px] font-mono uppercase text-[#77837B]">Fee</div>
                    <div className="text-xl font-mono font-extrabold text-[#00E676]">
                      ${ch.priceUsd}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                    <span className="text-[#A7B1AA]">Profit Target</span>
                    <span className="font-mono font-bold text-[#FFFFFF]">
                      {ch.profitTargetPct === 0 ? 'None (Direct Funded)' : `${ch.profitTargetPct}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                    <span className="text-[#A7B1AA]">Daily Drawdown</span>
                    <span className="font-mono font-bold text-[#FFFFFF]">{ch.dailyDrawdownPct}%</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                    <span className="text-[#A7B1AA]">Maximum Drawdown</span>
                    <span className="font-mono font-bold text-[#FFFFFF]">{ch.maxDrawdownPct}%</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                    <span className="text-[#A7B1AA]">Minimum Trading Days</span>
                    <span className="font-mono font-bold text-[#FFFFFF]">{ch.minTradingDays} Days</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                    <span className="text-[#A7B1AA]">Profit Split</span>
                    <span className="font-mono font-bold text-[#00E676]">Up to {ch.profitSplitPct}%</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[#A7B1AA]">Trading Rules</span>
                    <span className="font-mono font-semibold text-[#69F0AE]">
                      1:{ch.leverage} · No Time Limit
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDetailModalChallenge(ch)}
                  className="py-2.5 px-3 rounded-[9px] bg-[#030504] hover:bg-[#131B15] border border-white/12 text-xs font-semibold text-[#A7B1AA] hover:text-white cursor-pointer transition-all"
                >
                  Specifications
                </button>
                <button
                  type="button"
                  onClick={() => handleBuyChallenge(ch.id)}
                  className="py-2.5 px-3 rounded-[9px] bg-[#00E676] hover:bg-[#00C853] text-[#000000] font-display font-bold text-xs cursor-pointer transition-all"
                >
                  Start Challenge
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ============================================================================
  // TRADING RULES PAGE
  // ============================================================================
  if (route === 'trading-rules') {
    return (
      <main className="max-w-[1380px] mx-auto px-4 sm:px-8 py-12 space-y-10">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E676]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E676]">
            <span>RISK GOVERNANCE</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            Trading Rules & Objectives
          </h1>
          <p className="text-sm sm:text-base text-[#A7B1AA]">
            Clear, programmatic risk parameters enforced automatically by the FUNDED APEX institutional execution engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: '01. Daily Drawdown Limit',
              desc: 'Your account equity (including floating P&L) must not fall below the program Daily Drawdown threshold (3% Instant, 4% One Step, 5% Two Step & Three Step).',
            },
            {
              title: '02. Maximum Overall Drawdown',
              desc: 'Account equity may never drop below the static Maximum Drawdown floor relative to starting balance (6% Instant & One Step, 10% Two Step, 12% Three Step).',
            },
            {
              title: '03. Minimum Active Trading Days',
              desc: 'Execute at least one trade on 3 distinct trading days for One Step, Two Step, and Three Step challenges (5 days for Instant Funding). Zero maximum time limit.',
            },
            {
              title: '04. News, Overnight & Weekend Holding',
              desc: 'Traders are permitted to hold positions overnight, across weekends, and during macroeconomic news releases within standard margin and drawdown boundaries.',
            },
          ].map((rule, idx) => (
            <div
              key={rule.title}
              className="rounded-[14px] bg-[#090D0A] border border-[#00E676]/16 p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#00E676]">RULE 0{idx + 1}</span>
                <ShieldCheck className="w-4 h-4 text-[#00E676]" />
              </div>
              <h3 className="text-lg font-display font-bold text-[#FFFFFF]">{rule.title}</h3>
              <p className="text-sm text-[#A7B1AA] leading-relaxed">{rule.desc}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ============================================================================
  // HOW IT WORKS PAGE
  // ============================================================================
  if (route === 'how-it-works') {
    return (
      <main className="max-w-[1380px] mx-auto px-4 sm:px-8 py-12 space-y-10">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E676]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E676]">
            <span>FOUR-STEP PROGRESSION</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            How FUNDED APEX Works
          </h1>
          <p className="text-sm sm:text-base text-[#A7B1AA]">
            Progress from challenge selection to a funded trading account and bi-weekly payouts in four structured stages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: 'STEP 01',
              title: 'Select Challenge Tier',
              desc: 'Choose Instant, One Step, Two Step, or Three Step funding in account sizes ranging from $5K to $200K.',
            },
            {
              step: 'STEP 02',
              title: 'Instant Crypto Activation',
              desc: 'Complete checkout via USDT (BEP-20) and receive your dedicated Terminal User ID and Password upon verification.',
            },
            {
              step: 'STEP 03',
              title: 'Trade in the Terminal',
              desc: 'Execute Forex, Gold, Index, and Crypto trades inside the FUNDED APEX terminal within drawdown parameters.',
            },
            {
              step: 'STEP 04',
              title: 'Bi-Weekly Profit Payouts',
              desc: 'Withdraw up to 95% of simulated profits every 14 days and receive a 100% refund of your initial fee.',
            },
          ].map((item, i) => (
            <div
              key={item.step}
              className="rounded-[14px] bg-[#090D0A] border border-[#00E676]/16 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-[8px] bg-[#030504] border border-[#00E676]/30 text-[11px] font-mono font-bold text-[#00E676]">
                  {item.step}
                </span>
                <ArchitecturalCubeEmblem variant={i} />
              </div>
              <h3 className="text-lg font-display font-bold text-[#FFFFFF]">{item.title}</h3>
              <p className="text-sm text-[#A7B1AA] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ============================================================================
  // PAYOUTS PAGE
  // ============================================================================
  if (route === 'payouts') {
    return (
      <main className="max-w-[1380px] mx-auto px-4 sm:px-8 py-12 space-y-10">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E676]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E676]">
            <span>VERIFIED SETTLEMENT LEDGER</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            FUNDED APEX Payout Registry
          </h1>
          <p className="text-sm sm:text-base text-[#A7B1AA]">
            Verified profit settlements disbursed to FUNDED APEX funded traders across global settlement rails.
          </p>
        </div>

        <div className="rounded-[14px] bg-[#090D0A] border border-[#00E676]/16 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-[#77837B] bg-[#030504]">
                <th className="py-4 px-6">Trader</th>
                <th className="py-4 px-6">Program Tier</th>
                <th className="py-4 px-6 text-right">Settlement Amount</th>
                <th className="py-4 px-6">Method</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Settlement Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {verifiedPayouts.map((p) => (
                <tr key={p.id} className="hover:bg-[#0D130F] transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-display font-bold text-[#FFFFFF]">{p.traderName}</div>
                    <div className="text-xs font-mono text-[#77837B]">{p.username}</div>
                  </td>
                  <td className="py-4 px-6 text-[#A7B1AA]">
                    ${(p.accountSize / 1000).toFixed(0)}K {p.programType}
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-right text-[#00E676]">
                    +${p.amountUsd.toLocaleString()}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-[#A7B1AA]">{p.currency}</td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-[8px] bg-[#00E676]/12 border border-[#00E676]/30 text-[11px] font-mono font-bold text-[#00E676]">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-right text-[#77837B]">
                    {p.paymentDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    );
  }

  // ============================================================================
  // LEADERBOARD PAGE
  // ============================================================================
  if (route === 'leaderboard') {
    return (
      <main className="max-w-[1380px] mx-auto px-4 sm:px-8 py-12 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E676]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E676]">
              <span>INSTITUTIONAL STANDINGS</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
              Funded Trader Leaderboard
            </h1>
            <p className="text-sm text-[#A7B1AA]">
              Top performing traders ranked by verified return percentage and net simulated profit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('challenges')}
            className="px-5 py-2.5 rounded-[9px] bg-[#00E676] hover:bg-[#00C853] text-[#000000] font-display font-bold text-xs cursor-pointer"
          >
            Start Challenge
          </button>
        </div>

        <div className="rounded-[14px] bg-[#090D0A] border border-[#00E676]/16 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-[#77837B] bg-[#030504]">
                <th className="py-4 px-6">Rank</th>
                <th className="py-4 px-6">Trader</th>
                <th className="py-4 px-6 text-right">Account Capital</th>
                <th className="py-4 px-6 text-right">Return %</th>
                <th className="py-4 px-6 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {leaderboard.map((entry) => (
                <tr key={entry.rank} className="hover:bg-[#0D130F] transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-[#00E676]">#{entry.rank}</td>
                  <td className="py-4 px-6">
                    <div className="font-display font-bold text-[#FFFFFF]">{entry.username}</div>
                    <div className="text-xs text-[#77837B]">
                      {entry.traderName} · {entry.country}
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-right text-[#FFFFFF]">
                    ${entry.accountSize.toLocaleString()}
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-right text-[#00E676]">
                    +{entry.returnPct.toFixed(2)}%
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-right text-[#FFFFFF]">
                    +${entry.netProfitUsd.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    );
  }

  // ============================================================================
  // REWARDS ("COMING SOON") / REFERRAL / TERMINAL PREVIEW
  // ============================================================================
  if (route === 'free-spin') {
    return (
      <main className="max-w-[1100px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="rounded-[24px] bg-[#090D0A] border border-[#00E5B0]/30 p-8 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-[0_28px_80px_rgba(0,0,0,0.92)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[240px] rounded-full bg-[#00E5B0]/[0.09] blur-[110px]"
          />
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#051217] border border-[#00E5B0]/35 flex items-center justify-center shadow-[0_0_32px_rgba(0,229,176,0.22)]">
            <Award className="w-8 h-8 text-[#00E5B0]" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#051217] border border-[#00E5B0]/35 text-xs font-mono font-bold uppercase tracking-[0.16em] text-[#00E5B0]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>COMING SOON</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            FUNDED APEX <span className="text-[#00E5B0]">Rewards Vault</span>
          </h1>
          <p className="text-sm sm:text-base text-[#A3BDB8] max-w-xl mx-auto leading-relaxed">
            Our exclusive Trader Rewards Vault — featuring milestone loyalty allocations, fee-free challenge vouchers, and VIP profit split boosts — is launching soon.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('challenges')}
              className="px-7 py-3.5 rounded-[14px] apex-glow-btn text-xs sm:text-sm cursor-pointer"
            >
              Explore Funded Challenges →
            </button>
            <button
              type="button"
              onClick={() => navigate('home')}
              className="px-6 py-3.5 rounded-[14px] apex-secondary-btn text-xs sm:text-sm cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (route === 'referral' || route === 'terminal-preview') {
    const handleTriggerSpin = () => {
      if (isSpinningWheel) return;
      setIsSpinningWheel(true);
      setWonPrizeBanner(null);
      const outcome = spinDailyWheel({ requireAuth: false });
      const extraSpins = 1440 + Math.floor(Math.random() * 360);
      setWheelRotationDeg((prev) => prev + extraSpins);
      setTimeout(() => {
        setIsSpinningWheel(false);
        if (outcome.ok && outcome.coupon) {
          setWonPrizeBanner({
            label: outcome.coupon.label,
            code: outcome.coupon.code,
            discountPct: outcome.coupon.discountPct || 20,
            description: outcome.coupon.description,
          });
        }
      }, 1600);
    };

    return (
      <main className="max-w-[1380px] mx-auto px-4 sm:px-8 py-12 space-y-10">
        <div className="rounded-[14px] bg-[#090D0A] border border-[#00E676]/20 p-7 sm:p-9 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#030504] border border-[#00E676]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E676]">
              <span>FUNDED APEX PARTNER PROGRAM</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
              Institutional Partner &amp; Referral Program
            </h1>
            <p className="text-sm sm:text-base text-[#A7B1AA] leading-relaxed">
              Share your institutional referral code ({user ? user.referralCode : 'APEX-PARTNER'}) to earn reward credits and evaluation fee discounts on verified trader signups.
            </p>

            {wonPrizeBanner && (
              <div className="p-4 rounded-[12px] bg-[#030504] border border-[#00E676]/40 space-y-1">
                <div className="text-xs font-mono font-bold text-[#00E676] uppercase">
                  Reward Unlocked: {wonPrizeBanner.label}
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  Coupon Code: <span className="text-[#00E676]">{wonPrizeBanner.code}</span>
                </div>
                <p className="text-xs text-[#A7B1AA]">{wonPrizeBanner.description}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTriggerSpin}
                disabled={isSpinningWheel}
                className="px-6 py-3 rounded-[9px] bg-[#00E676] hover:bg-[#00C853] disabled:opacity-40 text-[#000000] font-display font-bold text-xs cursor-pointer transition-all"
              >
                {isSpinningWheel
                  ? 'Allocating Voucher...'
                  : 'Claim Partner Discount Voucher'}
              </button>
              <button
                type="button"
                onClick={() => navigate('challenges')}
                className="px-6 py-3 rounded-[9px] bg-[#030504] hover:bg-[#131B15] border border-white/12 text-xs font-semibold text-white cursor-pointer transition-all"
              >
                Explore Challenges
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-[14px] bg-[#030504] border border-[#00E676]/15 space-y-4">
            <div
              style={{
                transform: `rotate(${wheelRotationDeg}deg)`,
                transition: 'transform 1.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              className="w-40 h-40 rounded-full bg-[#090D0A] border-2 border-[#00E676]/45 flex items-center justify-center shadow-[0_0_40px_rgba(0,230,118,0.18)]"
            >
              <Award className="w-14 h-14 text-[#00E676]" />
            </div>
            <div className="text-center space-y-1">
              <div className="text-xs font-mono uppercase text-[#77837B]">Recent Vouchers</div>
              <div className="text-xs font-mono text-[#A7B1AA]">
                {userCoupons.length > 0
                  ? `${userCoupons[0].label} (${userCoupons[0].code})`
                  : 'Claim your discount voucher above'}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ============================================================================
  // FAQ PAGE
  // ============================================================================
  if (route === 'faq') {
    const filteredFaq = FAQ_ITEMS.filter(
      (item) =>
        item.q.toLowerCase().includes(faqQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(faqQuery.toLowerCase())
    );
    return (
      <main className="max-w-[1380px] mx-auto px-4 sm:px-8 py-12 space-y-10">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E676]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E676]">
            <span>KNOWLEDGE BASE</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            Frequently Asked Questions
          </h1>
          <div className="relative">
            <Search className="w-4 h-4 text-[#77837B] absolute left-3.5 top-3" />
            <input
              type="text"
              value={faqQuery}
              onChange={(e) => setFaqQuery(e.target.value)}
              placeholder="Search evaluation rules, drawdown limits, payouts, or challenges..."
              className="w-full pl-10 pr-4 py-2.5 rounded-[9px] bg-[#090D0A] border border-[#00E676]/20 text-sm text-white focus:outline-none focus:border-[#00E676]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredFaq.map((item, idx) => (
            <div
              key={idx}
              className="rounded-[14px] bg-[#090D0A] border border-[#00E676]/15 p-6 space-y-2.5"
            >
              <div className="text-[11px] font-mono font-bold uppercase text-[#00E676]">
                {item.category}
              </div>
              <h3 className="text-base font-display font-bold text-[#FFFFFF]">{item.q}</h3>
              <p className="text-sm text-[#A7B1AA] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ============================================================================
  // LEGAL PAGES: PRIVACY, TERMS, REFUND POLICY, RISK DISCLOSURE
  // ============================================================================
  if (
    route === 'privacy' ||
    route === 'terms' ||
    route === 'refund-policy' ||
    route === 'risk-disclosure'
  ) {
    const titles: Record<
      string,
      { title: string; subtitle: string; sections: { h: string; p: string }[] }
    > = {
      privacy: {
        title: 'Privacy Policy',
        subtitle: 'Data Isolation, PII Protection & Zero-Trust Storage',
        sections: [
          {
            h: '1. Account & Data Isolation',
            p: 'FUNDED APEX stores each trader profile in an isolated document protected by strict owner-only and verified-administrator access controls.',
          },
          {
            h: '2. Authentication & Security',
            p: 'Authentication is managed via encrypted email and password credentials. Administrative privileges are strictly enforced at the server layer.',
          },
          {
            h: '3. Account Deletion Rights',
            p: 'Traders may submit an Account Deletion Request directly from their Dashboard Settings panel at any time.',
          },
        ],
      },
      terms: {
        title: 'Terms and Conditions',
        subtitle: 'Operating Governance for FUNDED APEX Challenges',
        sections: [
          {
            h: '1. Simulated Proprietary Evaluation Mode',
            p: 'FUNDED APEX provides proprietary trading challenges and simulated funded accounts up to $600,000. All orders and P&L calculations are executed in a simulated environment.',
          },
          {
            h: '2. Authorized Terminal Usage',
            p: 'All evaluations are conducted exclusively on the in-house FUNDED APEX Trading Terminal. Account sharing or latency arbitrage is prohibited.',
          },
          {
            h: '3. Role & Access Integrity',
            p: 'Attempting to bypass security controls or manipulate execution feeds will result in immediate account termination.',
          },
        ],
      },
      'refund-policy': {
        title: 'Refund Policy',
        subtitle: '100% Challenge Fee Reimbursement Upon First Funded Payout',
        sections: [
          {
            h: '1. 100% Challenge Fee Refund',
            p: 'Traders who complete their evaluation challenge and qualify for their first verified Funded Account payout receive a 100% reimbursement of their initial challenge fee.',
          },
          {
            h: '2. Evaluation Activation Policy',
            p: 'Once trading activity has commenced on an active challenge account, evaluation fees are non-refundable prior to completing the challenge objectives.',
          },
          {
            h: '3. Billing & Support Desk',
            p: 'Contact our Trader Operations Desk at any time for assistance with challenge activations, coupon redemptions, or fee reimbursements.',
          },
        ],
      },
      'risk-disclosure': {
        title: 'Risk Disclosure',
        subtitle: 'Simulated Market Execution & Financial Risk Notice',
        sections: [
          {
            h: '1. Simulated Execution Environment',
            p: 'All trading activity within the FUNDED APEX Trading Terminal is simulated for proprietary evaluation purposes. Market prices reflect institutional reference feeds.',
          },
          {
            h: '2. Hypothetical Performance Limitations',
            p: 'Simulated trading results have inherent limitations and do not guarantee future performance in live financial markets.',
          },
          {
            h: '3. Market Volatility',
            p: 'Foreign exchange, precious metals, indices, and digital assets exhibit significant volatility. Always use Stop Loss controls and monitor margin levels.',
          },
        ],
      },
    };
    const docContent = titles[route];
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-14 space-y-8">
        <div className="space-y-2 border-b border-white/10 pb-6">
          <div className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#00E676]">
            LEGAL & COMPLIANCE
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            {docContent.title}
          </h1>
          <p className="text-sm text-[#A7B1AA]">{docContent.subtitle}</p>
        </div>
        <div className="space-y-5">
          {docContent.sections.map((s) => (
            <div
              key={s.h}
              className="rounded-[14px] bg-[#090D0A] border border-[#00E676]/15 p-6 space-y-2"
            >
              <h2 className="text-lg font-display font-bold text-[#FFFFFF]">{s.h}</h2>
              <p className="text-sm text-[#A7B1AA] leading-relaxed">{s.p}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ============================================================================
  // HOMEPAGE (route === 'home') — 12 INSTITUTIONAL DEEP BLACK & EMERALD SECTIONS
  // ============================================================================
  const twoStepChallenges = availableChallenges.filter((c) => c.type === 'two_step');

  return (
    <main data-scroll-container className="bg-transparent text-[#FFFFFF] relative overflow-hidden">
      {/* Top Scroll Progress Bar */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none bg-transparent"
      >
        <div
          ref={scrollBarRef}
          style={{
            willChange: 'transform',
            transform: 'scale3d(0, 1, 1)',
            transformOrigin: '0% 50%',
          }}
          className="h-full w-full bg-[#00E676]"
        />
      </div>

      {renderProgramDetailsModal()}

      {/* ====================================================================
          SECTION 1: HERO SECTION (GLOBAL 3D BACKGROUND + RIGHT-SIDE 3D COMPOSITION)
          ==================================================================== */}
      <section data-scroll-container className="relative bg-transparent pt-8 sm:pt-12 pb-10 sm:pb-14 px-4 sm:px-8 border-b border-[#00E5B0]/15 overflow-hidden">
        {/* Controlled Radial Aqua-Water Illumination strictly behind the right 3D composition */}
        <div
          aria-hidden="true"
          style={{
            background: 'radial-gradient(circle, rgba(0, 229, 176, 0.14) 0%, transparent 70%)',
          }}
          className="pointer-events-none absolute top-1/2 right-[8%] -translate-y-1/2 w-[540px] h-[540px] rounded-full"
        />

        <div className="max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          {/* Left Column: Exact Screenshot Font Hierarchy + Aqua-Green Water Theme */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left apex-fade-up">
            {/* Rounded Pill Kicker matching screenshot typography */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#071419]/90 border border-[#00E5B0]/30 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E5B0]" />
              <span className="text-xs sm:text-sm font-sans font-semibold tracking-[-0.01em] text-[#F4FBFA]">
                Pay instantly with BNB · Payouts every 14 days
              </span>
            </div>

            {/* Hero Display Headline in Exact Screenshot Geometric Sans Weight & Proportion */}
            <h1
              data-testid="hero-headline"
              className="font-display font-black text-[44px] sm:text-[62px] xl:text-[72px] leading-[1.03] tracking-[-0.042em] text-[#FFFFFF] text-balance"
            >
              <span className="block text-[#FFFFFF]">Trade our</span>
              <span className="block">
                <span className="text-[#FFFFFF]">capital. </span>
                <span className="text-[#00E5B0]">Keep</span>
              </span>
              <span className="block text-[#00E5B0]">up to 95%.</span>
            </h1>

            {/* Supporting Lead Copy in Exact Screenshot Clean Sans */}
            <p className="text-base sm:text-xl text-[#A3BDB8] max-w-[540px] mx-auto lg:mx-0 leading-[1.55] font-normal tracking-[-0.015em]">
              Prove your skill in one challenge and get a funded account up to $200K — no time limits, no hidden rules.
            </p>

            {/* Key Institutional Highlights Strip (24h | 38K+ | $4.2M+) in Exact Screenshot Font */}
            <div className="pt-2 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <div className="font-display text-3xl sm:text-4xl font-black text-[#FFFFFF] tracking-[-0.038em] tabular-nums">
                  24h
                </div>
                <div className="text-xs sm:text-sm text-[#A3BDB8] mt-0.5 font-normal">
                  Avg. payout
                </div>
              </div>
              <div className="text-center lg:text-left">
                <div className="font-display text-3xl sm:text-4xl font-black text-[#FFFFFF] tracking-[-0.038em] tabular-nums">
                  38K+
                </div>
                <div className="text-xs sm:text-sm text-[#A3BDB8] mt-0.5 font-normal">
                  Traders
                </div>
              </div>
              <div className="text-center lg:text-left">
                <div className="font-display text-3xl sm:text-4xl font-black text-[#FFFFFF] tracking-[-0.038em] tabular-nums">
                  $4.2M+
                </div>
                <div className="text-xs sm:text-sm text-[#A3BDB8] mt-0.5 font-normal">
                  Total Rewards
                </div>
              </div>
            </div>

            {/* Rounded Primary Hero Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => scrollToSection('challenges-matrix')}
                className="px-8 py-4 rounded-[18px] apex-glow-btn text-sm sm:text-base flex items-center gap-2.5 cursor-pointer"
              >
                <span>Buy Evaluation</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => openStripeCheckout('two-step-5000', '5K30OFF')}
                className="px-8 py-4 rounded-[18px] apex-secondary-btn text-sm sm:text-base text-[#00E5B0] cursor-pointer"
              >
                <span>$5K Starter</span>
              </button>
            </div>
          </div>

          {/* Right Column: Custom 3D Geometric Architectural Composition */}
          <div className="lg:col-span-6">
            <ApexHero3DScene />
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 3: WHY FUNDED APEX (ARCHITECTURAL 3D GEOMETRY CARDS)
          ==================================================================== */}
      <section className="bg-transparent py-10 sm:py-14 px-4 sm:px-8 border-b border-[#00E676]/10">
        <div className="max-w-[1380px] mx-auto space-y-7">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E676]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E676]">
                <span>03 · WHY FUNDED APEX</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#FFFFFF] tracking-tight">
                Engineered for Institutional Trading Performance
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[#A7B1AA] max-w-md">
              Built with precision execution infrastructure, deterministic drawdown governance, and transparent capital scaling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'In-House Live Trading Terminal',
                desc: 'Execute Market, Limit, and Stop orders directly on our proprietary candlestick terminal with real-time margin and drawdown telemetry.',
              },
              {
                title: 'Zero Time Limits on Evaluations',
                desc: 'Trade at your own institutional pace. Every One Step, Two Step, and Three Step evaluation carries unlimited calendar days.',
              },
              {
                title: 'Up to 95% Profit Split',
                desc: 'Keep up to 95% of the simulated profits you generate, plus receive a 100% challenge fee refund with your first payout.',
              },
              {
                title: 'Forex, Gold (XAUUSD) & Indices',
                desc: 'Access deep simulated liquidity across EURUSD, GBPUSD, USDJPY, XAUUSD Gold, NAS100, US30, and BTCUSD.',
              },
              {
                title: 'Transparent Static Drawdown',
                desc: 'No hidden trailing traps or sudden rule changes. Daily and maximum drawdown thresholds are displayed live on your dashboard.',
              },
              {
                title: 'Instant USDT (BEP-20) Checkout',
                desc: 'Activate your challenge account globally via USDT (BEP-20 BNB Smart Chain) with official admin discount coupon support.',
              },
            ].map((item, idx) => (
              <div
                key={item.title}
                style={{ '--reveal-delay': `${idx * 75}ms` } as React.CSSProperties}
                className="apex-reveal-init rounded-[18px] bg-[#090D0A]/90 hover:bg-[#0D181E] border border-[#00E5B0]/20 hover:border-[#00E5B0]/50 p-6 sm:p-7 space-y-4 transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:-translate-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <ArchitecturalCubeEmblem variant={idx} />
                  <span className="text-xs font-mono font-bold text-[#00E5B0]">0{idx + 1}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-display font-bold text-[#FFFFFF]">
                  {item.title}
                </h3>
                <p className="text-sm text-[#A3BDB8] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 4: CHALLENGE PROGRAMS (INTERACTIVE CONFIGURATOR)
          ==================================================================== */}
      <section
        id="challenges-matrix"
        className="apex-reveal-init scroll-mt-20 bg-[#030504]/55 backdrop-blur-[2px] py-10 sm:py-14 px-4 sm:px-8 border-b border-[#00E5B0]/15"
      >
        <div className="max-w-[1380px] mx-auto space-y-6 sm:space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E5B0]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E5B0]">
                <span>04 · CHALLENGE PROGRAMS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#FFFFFF] tracking-tight">
                Select Your Evaluation Architecture
              </h2>
              <p className="text-sm sm:text-base text-[#A3BDB8]">
                Choose your preferred evaluation track and capital tier below. All figures reflect exact platform rules.
              </p>
            </div>

            {/* Challenge Model Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-[14px] bg-[#071318] border border-[#00E5B0]/20">
              {(
                [
                  { type: 'two_step' as ChallengeType, label: '2-Step Classic' },
                  { type: 'one_step' as ChallengeType, label: '1-Step Pro' },
                  { type: 'instant' as ChallengeType, label: 'Instant Funded' },
                  { type: 'three_step' as ChallengeType, label: '3-Step Institutional' },
                ]
              ).map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setSelectedType(t.type)}
                  className={`py-2.5 px-3.5 rounded-[10px] text-xs font-display font-bold transition-all cursor-pointer ${
                    selectedType === t.type
                      ? 'bg-[#00E5B0] text-[#03120F] shadow-[0_0_20px_rgba(0,229,176,0.3)]'
                      : 'text-[#A3BDB8] hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Account Size Selector & 8-Parameter Institutional Grid */}
            <div className="lg:col-span-7 space-y-5 apex-reveal-init" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
              <div className="rounded-[18px] bg-[#090D0A]/90 border border-[#00E5B0]/20 p-5 sm:p-6 space-y-4 shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#A7B1AA]">
                    Select Account Size
                  </span>
                  <span className="text-sm font-mono font-bold text-[#00E676]">
                    ${selectedChallenge.accountSize.toLocaleString()} USD
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {ACCOUNT_SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`py-3 px-2 rounded-[9px] font-mono text-sm font-bold transition-all cursor-pointer ${
                        selectedSize === sz
                          ? 'bg-[#0D130F] border-2 border-[#00E676] text-[#00E676] shadow-[0_0_18px_rgba(0,230,118,0.22)]'
                          : 'bg-[#030504] border border-white/10 text-[#A7B1AA] hover:text-white hover:border-[#00E676]/35'
                      }`}
                    >
                      ${(sz / 1000).toFixed(0)}K
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    label: selectedType === 'instant' ? 'Profit Target' : 'Phase 1 Profit Target',
                    value:
                      selectedType === 'instant' || selectedChallenge.profitTargetPct === 0
                        ? 'None (Direct Funded)'
                        : `${selectedChallenge.profitTargetPct}% ($${((selectedChallenge.accountSize * selectedChallenge.profitTargetPct) / 100).toLocaleString()})`,
                    highlight: true,
                  },
                  {
                    label: 'Subsequent Phase Target',
                    value:
                      selectedType === 'two_step'
                        ? `5% ($${(selectedChallenge.accountSize * 0.05).toLocaleString()})`
                        : selectedType === 'three_step'
                        ? '5% (Phase 2 & Phase 3)'
                        : 'None (Single Phase)',
                    highlight: false,
                  },
                  {
                    label: 'Daily Drawdown Limit',
                    value: `${selectedChallenge.dailyDrawdownPct}% ($${((selectedChallenge.accountSize * selectedChallenge.dailyDrawdownPct) / 100).toLocaleString()})`,
                    highlight: false,
                  },
                  {
                    label: 'Maximum Overall Drawdown',
                    value: `${selectedChallenge.maxDrawdownPct}% ($${((selectedChallenge.accountSize * selectedChallenge.maxDrawdownPct) / 100).toLocaleString()})`,
                    highlight: false,
                  },
                  {
                    label: 'Minimum Trading Days',
                    value: `${selectedChallenge.minTradingDays} Days · Unlimited Time`,
                    highlight: false,
                  },
                  {
                    label: 'Institutional Leverage',
                    value: `1:${selectedChallenge.leverage}`,
                    highlight: true,
                  },
                  {
                    label: 'Trader Profit Split',
                    value: `Up to ${selectedChallenge.profitSplitPct}%`,
                    highlight: true,
                  },
                  {
                    label: 'Trading Rules & Holding',
                    value: 'News, Overnight & Weekend Allowed',
                    highlight: false,
                  },
                ].map((spec) => (
                  <div
                    key={spec.label}
                    className="p-4 rounded-[12px] bg-[#090D0A] border border-[#00E676]/15 flex items-center justify-between gap-2"
                  >
                    <span className="text-xs sm:text-sm text-[#A7B1AA]">{spec.label}</span>
                    <span
                      className={`font-mono text-xs sm:text-sm font-bold ${
                        spec.highlight ? 'text-[#00E676]' : 'text-[#FFFFFF]'
                      }`}
                    >
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 Columns: Challenge Purchase Summary Card */}
            <div
              style={{ '--reveal-delay': '140ms' } as React.CSSProperties}
              className="lg:col-span-5 rounded-[22px] bg-[#071318]/95 backdrop-blur-xl border border-[#00E5B0]/30 p-6 sm:p-7 space-y-6 shadow-[0_28px_80px_rgba(0,0,0,0.95)] apex-reveal-init"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#00E5B0]/15 pb-5">
                <div>
                  <div className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#00E5B0]">
                    {selectedChallenge.typeLabel}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-[#FFFFFF] mt-1">
                    ${selectedChallenge.accountSize.toLocaleString()} Account
                  </h3>
                  <div className="text-xs text-[#728F8A] mt-1">
                    One-time evaluation fee · 100% refundable on 1st payout
                  </div>
                </div>
                <div className="px-4 py-3 rounded-[14px] bg-[#050E13] border border-[#00E5B0]/35 text-right shrink-0">
                  <div className="text-[10px] font-mono uppercase text-[#728F8A]">Evaluation Fee</div>
                  <div className="text-2xl sm:text-3xl font-mono font-extrabold text-[#00E5B0]">
                    ${selectedChallenge.priceUsd}
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                {[
                  '100% Challenge Fee refunded with your first funded payout',
                  'Instant checkout via USDT (BEP-20 · BNB Smart Chain)',
                  'Full access to the in-house FUNDED APEX Trading Terminal',
                  'Supports official Admin promotional discount coupons',
                ].map((perk) => (
                  <div key={perk} className="flex items-center gap-3 text-[#FFFFFF]">
                    <span className="w-5 h-5 rounded-[8px] bg-[#00E5B0]/15 border border-[#00E5B0]/40 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-[#00E5B0]" />
                    </span>
                    <span className="text-[#A3BDB8]">{perk}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleBuyChallenge(selectedChallenge.id)}
                  className="w-full py-3.5 px-6 rounded-[14px] bg-[#00E5B0] hover:bg-[#2AFADF] text-[#03120F] font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_12px_32px_rgba(0,229,176,0.35)] hover:-translate-y-0.5"
                >
                  <span>Start Challenge — ${selectedChallenge.priceUsd}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalChallenge(selectedChallenge)}
                  className="w-full py-3 px-4 rounded-[14px] bg-[#050E13] hover:bg-[#08151B] border border-white/12 text-xs sm:text-sm font-semibold text-[#A3BDB8] hover:text-white cursor-pointer transition-all"
                >
                  View Full Program Specification
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 5: ACCOUNT SIZES COMPARISON TABLE ($5K TO $200K)
          ==================================================================== */}
      <section className="apex-reveal-init bg-transparent py-10 sm:py-14 px-4 sm:px-8 border-b border-[#00E5B0]/15">
        <div className="max-w-[1380px] mx-auto space-y-6 sm:space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E5B0]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E5B0]">
                <span>05 · ACCOUNT SIZES</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#FFFFFF] tracking-tight">
                Capital Tiers from $5,000 to $200,000
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('account-sizes')}
              className="px-5 py-2.5 rounded-[12px] bg-[#071318] hover:bg-[#0D1E26] border border-[#00E5B0]/30 text-xs font-semibold text-[#00E5B0] cursor-pointer self-start md:self-auto transition-colors"
            >
              Compare All 24 Programs →
            </button>
          </div>

          <div className="rounded-[18px] bg-[#090D0A]/90 border border-[#00E5B0]/20 overflow-x-auto shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#030504] text-[11px] font-mono uppercase tracking-wider text-[#728F8A]">
                  <th className="py-4 px-5">Account Size</th>
                  <th className="py-4 px-5">Program</th>
                  <th className="py-4 px-5">Profit Target</th>
                  <th className="py-4 px-5">Daily Drawdown</th>
                  <th className="py-4 px-5">Max Drawdown</th>
                  <th className="py-4 px-5">Min Days</th>
                  <th className="py-4 px-5">Profit Split</th>
                  <th className="py-4 px-5 text-right">Fee & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs sm:text-sm">
                {twoStepChallenges.map((ch) => (
                  <tr key={ch.id} className="hover:bg-[#0D181E] transition-colors">
                    <td className="py-4 px-5 font-mono font-extrabold text-[#FFFFFF] text-base">
                      ${ch.accountSize.toLocaleString()}
                    </td>
                    <td className="py-4 px-5 text-[#A3BDB8]">{ch.typeLabel}</td>
                    <td className="py-4 px-5 font-mono text-[#FFFFFF]">{ch.profitTargetPct}%</td>
                    <td className="py-4 px-5 font-mono text-[#FFFFFF]">{ch.dailyDrawdownPct}%</td>
                    <td className="py-4 px-5 font-mono text-[#FFFFFF]">{ch.maxDrawdownPct}%</td>
                    <td className="py-4 px-5 font-mono text-[#A3BDB8]">{ch.minTradingDays} Days</td>
                    <td className="py-4 px-5 font-mono font-bold text-[#00E5B0]">
                      {ch.profitSplitPct}%
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleBuyChallenge(ch.id)}
                        className="px-4 py-2 rounded-[10px] bg-[#00E5B0] hover:bg-[#2AFADF] text-[#03120F] font-display font-bold text-xs cursor-pointer transition-all shadow-[0_4px_16px_rgba(0,229,176,0.25)]"
                      >
                        Start — ${ch.priceUsd}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 6: HOW IT WORKS (4-STAGE PROCESS)
          ==================================================================== */}
      <section className="apex-reveal-init bg-[#030504]/55 backdrop-blur-[2px] py-10 sm:py-14 px-4 sm:px-8 border-b border-[#00E5B0]/15">
        <div className="max-w-[1380px] mx-auto space-y-6 sm:space-y-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E5B0]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E5B0]">
              <span>06 · HOW IT WORKS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#FFFFFF] tracking-tight">
              Structured Path to Institutional Funding
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Choose Challenge',
                desc: 'Select your evaluation model and capital size from $5,000 up to $200,000 USD.',
              },
              {
                step: '02',
                title: 'Unlock Terminal',
                desc: 'Receive your dedicated Terminal User ID and Password immediately upon order approval.',
              },
              {
                step: '03',
                title: 'Demonstrate Edge',
                desc: 'Reach the profit target while respecting the daily and maximum drawdown rules.',
              },
              {
                step: '04',
                title: 'Get Funded & Paid',
                desc: 'Scale your funded account and withdraw up to 95% of simulated profits every 14 days.',
              },
            ].map((st, sidx) => (
              <div
                key={st.step}
                style={{ '--reveal-delay': `${sidx * 75}ms` } as React.CSSProperties}
                className="apex-reveal-init rounded-[18px] bg-[#090D0A]/90 hover:bg-[#0D181E] backdrop-blur-md border border-[#00E5B0]/20 hover:border-[#00E5B0]/50 p-6 space-y-4 relative transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:-translate-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-[8px] bg-[#030504] border border-[#00E5B0]/30 font-mono text-xs font-bold text-[#00E5B0]">
                    STAGE {st.step}
                  </span>
                  <span className="font-mono text-2xl font-extrabold text-white/20">{st.step}</span>
                </div>
                <h3 className="text-lg font-display font-bold text-[#FFFFFF]">{st.title}</h3>
                <p className="text-sm text-[#A3BDB8] leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 7: TRADING RULES & RISK GOVERNANCE
          ==================================================================== */}
      <section className="apex-reveal-init bg-transparent py-10 sm:py-14 px-4 sm:px-8 border-b border-[#00E5B0]/15">
        <div className="max-w-[1380px] mx-auto space-y-6 sm:space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E5B0]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E5B0]">
                <span>07 · TRADING RULES</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#FFFFFF] tracking-tight">
                Transparent &amp; Objective Risk Rules
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('trading-rules')}
              className="px-5 py-2.5 rounded-[12px] bg-[#071318] hover:bg-[#0D1E26] border border-[#00E5B0]/30 text-xs font-semibold text-[#00E5B0] cursor-pointer self-start md:self-auto transition-colors"
            >
              Read Full Rulebook →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                metric: '3% – 5%',
                title: 'Daily Loss Limit',
                desc: 'Calculated transparently on account equity so you always know your daily risk buffer.',
              },
              {
                metric: '6% – 12%',
                title: 'Maximum Drawdown',
                desc: 'Static overall equity floor relative to your initial starting account balance.',
              },
              {
                metric: 'Unlimited',
                title: 'Maximum Trading Days',
                desc: 'Zero time pressure. Complete your minimum active trading days at your own pace.',
              },
              {
                metric: 'Permitted',
                title: 'News & Weekend Holding',
                desc: 'Hold positions through macroeconomic news events and overnight sessions.',
              },
            ].map((r, ridx) => (
              <div
                key={r.title}
                style={{ '--reveal-delay': `${ridx * 75}ms` } as React.CSSProperties}
                className="apex-reveal-init rounded-[18px] bg-[#090D0A]/90 hover:bg-[#0D181E] border border-[#00E5B0]/20 hover:border-[#00E5B0]/50 p-6 space-y-2.5 transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:-translate-y-1.5"
              >
                <div className="font-mono text-2xl font-extrabold text-[#00E5B0]">{r.metric}</div>
                <h3 className="text-base font-display font-bold text-[#FFFFFF]">{r.title}</h3>
                <p className="text-xs sm:text-sm text-[#A3BDB8] leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 10: FREQUENTLY ASKED QUESTIONS
          ==================================================================== */}
      <section
        id="faq"
        className="apex-reveal-init scroll-mt-20 bg-[#030504]/55 backdrop-blur-[2px] py-10 sm:py-14 px-4 sm:px-8 border-b border-[#00E5B0]/15"
      >
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#090D0A] border border-[#00E5B0]/25 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#00E5B0]">
              <span>10 · FREQUENTLY ASKED QUESTIONS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#FFFFFF] tracking-tight">
              Institutional Evaluation FAQ
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.slice(0, 6).map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={item.q}
                  style={{ '--reveal-delay': `${index * 60}ms` } as React.CSSProperties}
                  className="apex-reveal-init rounded-[16px] bg-[#071318]/90 hover:bg-[#0D181E] backdrop-blur-md border border-[#00E5B0]/18 overflow-hidden transition-all duration-300"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 cursor-pointer transition-colors"
                  >
                    <span className="text-sm sm:text-base font-display font-bold text-[#FFFFFF]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#A3BDB8] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-[#00E5B0]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-2 text-xs sm:text-sm text-[#A3BDB8] leading-relaxed border-t border-[#00E5B0]/12">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 11: FINAL CTA
          ==================================================================== */}
      <section className="apex-reveal-init bg-transparent py-10 sm:py-14 px-4 sm:px-8">
        <div className="max-w-[1380px] mx-auto">
          <div className="rounded-[24px] bg-[#071318]/95 backdrop-blur-xl border border-[#00E5B0]/30 p-6 sm:p-10 text-center space-y-5 relative overflow-hidden shadow-[0_32px_95px_rgba(0,0,0,0.96)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[240px] rounded-full bg-[#00E5B0]/[0.10] blur-[110px]"
            />
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#050E13] border border-[#00E5B0]/35 text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#00E5B0] relative z-10">
              <span>READY TO GET FUNDED</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight max-w-2xl mx-auto relative z-10">
              TRADE BIG. THINK SMART. <span className="text-[#00E5B0]">GET FUNDED.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#A3BDB8] max-w-xl mx-auto relative z-10">
              Begin your evaluation from $14 on a $5,000 challenge or scale directly up to $200,000 in institutional simulated capital.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2 relative z-10">
              <button
                type="button"
                onClick={() => scrollToSection('challenges-matrix')}
                className="px-8 py-3.5 rounded-[14px] bg-[#00E5B0] hover:bg-[#2AFADF] text-[#03120F] font-display font-bold text-sm sm:text-base flex items-center gap-2 cursor-pointer transition-all shadow-[0_10px_28px_rgba(0,229,176,0.35)] hover:-translate-y-0.5"
              >
                <span>Start Challenge Now</span>
                <ArrowRight className="w-4 h-4 stroke-[2.4]" />
              </button>
              <button
                type="button"
                onClick={() => navigate(user ? 'dashboard' : 'register')}
                className="px-8 py-3.5 rounded-[14px] bg-[#050E13] hover:bg-[#0D1E26] border border-white/15 text-white font-display font-bold text-sm sm:text-base cursor-pointer transition-all hover:-translate-y-0.5"
              >
                Open Trader Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
