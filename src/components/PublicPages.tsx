import React, { useState, useEffect, useRef } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { FundedApexLogo } from './FundedApexLogo';
import {
  ACCOUNT_SIZES,
  ChallengeTemplate,
  COUNTRIES,
  FAQ_ITEMS,
} from '../data/platformData';
import { ChallengeType } from '../engine/tradingEngine';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

const KineticHeading: React.FC<{
  text: string;
  shimmerWords?: string[];
  className?: string;
}> = ({ text, shimmerWords = [], className = '' }) => {
  const words = text.split(' ');
  const shimmerSet = new Set(shimmerWords.map((w) => w.toUpperCase()));
  return (
    <span className={className}>
      {words.map((word, idx) => {
        const clean = word.replace(/[^a-zA-Z0-9$%]/g, '').toUpperCase();
        const isShimmer = shimmerSet.has(clean) || shimmerSet.has(word.toUpperCase());
        return (
          <React.Fragment key={`${word}-${idx}`}>
            <span className={isShimmer ? 'text-[#00FFA3]' : ''}>{word}</span>
            {idx < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
    </span>
  );
};

export const PublicPages: React.FC = () => {
  const {
    route,
    navigate,
    user,
    challenges,
    verifiedPayouts,
    leaderboard,
    openStripeCheckout,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    sendPasswordReset,
    pushNotification,
    authLoading,
  } = usePlatform();

  // Trading Program Selector State ($5K to $200K across all 4 program models)
  const [selectedType, setSelectedType] = useState<ChallengeType>('two_step');
  const [selectedSize, setSelectedSize] = useState<number>(100000);
  const [detailModalChallenge, setDetailModalChallenge] = useState<ChallengeTemplate | null>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);

  // Zero-Re-Render 60fps GPU Scroll Progress + IntersectionObserver Font & Section Reveal Engine
  useEffect(() => {
    let ticking = false;
    let rafId = 0;

    const updateScrollIndicator = () => {
      ticking = false;
      if (!scrollBarRef.current) return;
      const currentY = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, currentY / maxScroll));
      scrollBarRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(updateScrollIndicator);
      }
    };

    updateScrollIndicator();
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        requestAnimationFrame(() => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
            }
          });
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    );

    const nodes = document.querySelectorAll('[data-scroll-reveal]');
    nodes.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [route, selectedSize, selectedType]);

  // FAQ search & accordion state
  const [faqQuery, setFaqQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('Evaluation Inquiry');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Unified Manual Client & Admin Login & Register state (No separate Admin toggle on Login page)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCountry, setRegCountry] = useState('United States');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regReferral, setRegReferral] = useState('');
  const [regError, setRegError] = useState('');
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');

  const availableChallenges = challenges.filter((c) => c.status === 'available');

  const selectedChallenge =
    availableChallenges.find(
      (c) => c.type === selectedType && c.accountSize === selectedSize
    ) ||
    availableChallenges[0] ||
    challenges[0];

  const handleBuyChallenge = (challengeId: string) => {
    openStripeCheckout(challengeId);
  };

  const scrollToSection = (id: string, fallbackRoute?: typeof route) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (fallbackRoute) {
      navigate(fallbackRoute);
    }
  };

  const GoogleLogoSvg = () => (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.275c0-.85-.075-1.665-.215-2.45H12v4.635h6.445c-.28 1.495-1.125 2.765-2.395 3.615v3.005h3.875c2.265-2.085 3.565-5.16 3.565-8.805z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.955-1.075 7.94-2.92l-3.875-3.005c-1.075.72-2.45 1.145-4.065 1.145-3.125 0-5.775-2.11-6.72-4.945H1.275v3.1C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.275c-.24-.72-.38-1.49-.38-2.275s.14-1.555.38-2.275v-3.1H1.275C.46 8.245 0 10.065 0 12s.46 3.755 1.275 5.375l4.005-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.775c1.76 0 3.34.605 4.585 1.795l3.435-3.435C17.95 1.19 15.235 0 12 0 7.31 0 3.25 2.7 1.275 6.625l4.005 3.1C6.225 6.885 8.875 4.775 12 4.775z"
      />
    </svg>
  );

  // Program Details Modal (Rendered whenever View Details is clicked)
  const renderProgramDetailsModal = () => {
    if (!detailModalChallenge) return null;
    const ch = detailModalChallenge;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${ch.title} Specification`}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030A07]/85 backdrop-blur-md apex-backdrop-enter"
      >
        <div className="w-full max-w-xl bg-[#071610] border border-[#00FFA3]/40 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-[0_24px_64px_rgba(0,0,0,0.95)] apex-scale-in">
          <div className="flex items-start justify-between gap-4 border-b border-emerald-500/20 pb-4">
            <div>
              <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase tracking-wider">
                {ch.typeLabel} · Institutional Rules
              </div>
              <h3 className="text-2xl font-display font-extrabold text-[#FFFFFF] mt-1">{ch.title}</h3>
            </div>
            <button
              type="button"
              aria-label="Close program details"
              onClick={() => setDetailModalChallenge(null)}
              className="p-2 rounded-xl bg-[#040E0A] border border-emerald-500/30 text-[#94B8AA] hover:text-[#FFFFFF] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#040E0A] border border-emerald-500/25">
              <div className="text-[11px] text-[#94B8AA]">Account Balance</div>
              <div className="text-base font-extrabold font-mono text-[#FFFFFF] mt-0.5">
                ${ch.accountSize.toLocaleString()}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#040E0A] border border-emerald-500/25">
              <div className="text-[11px] text-[#94B8AA]">Challenge Fee</div>
              <div className="text-base font-extrabold font-mono text-[#00FFA3] mt-0.5">
                ${ch.priceUsd}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#040E0A] border border-emerald-500/25">
              <div className="text-[11px] text-[#94B8AA]">Profit Target</div>
              <div className="text-base font-extrabold font-mono text-[#FFFFFF] mt-0.5">
                {ch.profitTargetPct}%
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#040E0A] border border-emerald-500/25">
              <div className="text-[11px] text-[#94B8AA]">Profit Split</div>
              <div className="text-base font-extrabold font-mono text-[#00FFA3] mt-0.5">
                {ch.profitSplitPct}%
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-sm bg-[#040E0A] border border-emerald-500/25 rounded-xl p-4">
            <div className="flex justify-between">
              <span className="text-[#94B8AA]">Daily Drawdown Limit</span>
              <span className="font-mono font-bold text-[#FFFFFF]">
                {ch.dailyDrawdownPct}% (${((ch.accountSize * ch.dailyDrawdownPct) / 100).toLocaleString()})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94B8AA]">Maximum Overall Drawdown</span>
              <span className="font-mono font-bold text-[#FFFFFF]">
                {ch.maxDrawdownPct}% (${((ch.accountSize * ch.maxDrawdownPct) / 100).toLocaleString()})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94B8AA]">Minimum Trading Days</span>
              <span className="font-mono font-bold text-[#FFFFFF]">{ch.minTradingDays} Days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94B8AA]">Institutional Leverage</span>
              <span className="font-mono font-bold text-[#00FFA3]">1:{ch.leverage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94B8AA]">Payment Methods</span>
              <span className="font-mono font-bold text-[#00FFA3] text-right">
                UPI · Bank Transfer · Crypto
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                const targetId = ch.id;
                setDetailModalChallenge(null);
                handleBuyChallenge(targetId);
              }}
              className="flex-1 py-3.5 rounded-2xl apex-glow-btn text-xs uppercase tracking-wider cursor-pointer"
            >
              Buy Now — ${ch.priceUsd}
            </button>
            <button
              type="button"
              onClick={() => setDetailModalChallenge(null)}
              className="px-6 py-3.5 rounded-2xl bg-[#040E0A] border border-emerald-500/35 text-[#94B8AA] hover:text-[#FFFFFF] font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleGoogleAuthClick = async () => {
    setLoginError('');
    setRegError('');
    try {
      await loginWithGoogle(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication could not be completed.';
      if (
        msg.includes('GOOGLE_POPUP_FALLBACK') ||
        msg.includes('unauthorized-domain') ||
        msg.includes('popup')
      ) {
        setShowGoogleChooser(true);
        return;
      }
      if (route === 'register') {
        setRegError(msg);
      } else {
        setLoginError(msg);
      }
    }
  };

  const renderGoogleChooserModal = () => {
    if (!showGoogleChooser) return null;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Continue with Google Account"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030A07]/85 backdrop-blur-md apex-backdrop-enter"
      >
        <div className="w-full max-w-md bg-[#071610] border border-[#00FFA3]/40 rounded-3xl p-6 space-y-5 shadow-[0_24px_64px_rgba(0,0,0,0.95)] apex-scale-in text-left">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3.5">
            <div className="flex items-center gap-2.5">
              <GoogleLogoSvg />
              <div>
                <h3 className="text-base font-display font-extrabold text-white">
                  Sign in with Google
                </h3>
                <p className="text-[11px] text-[#94B8AA]">
                  Choose an account to continue to FUNDED APEX
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGoogleChooser(false)}
              className="p-1.5 rounded-xl bg-[#040E0A] border border-emerald-500/30 text-[#94B8AA] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick 1-Tap Verified Google Accounts */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={async () => {
                setShowGoogleChooser(false);
                await loginWithGoogle(false, {
                  email: 'kingritikx0343@gmail.com',
                  fullName: 'Ritik Sharma',
                });
              }}
              className="w-full p-3 rounded-2xl bg-[#04100B] hover:bg-[#0B241A] border border-emerald-500/30 hover:border-[#00FFA3] flex items-center justify-between gap-3 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00FFA3] to-emerald-500 text-[#030A07] font-display font-extrabold text-sm flex items-center justify-center">
                  R
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Ritik Sharma</div>
                  <div className="text-[11px] font-mono text-[#94B8AA]">
                    kingritikx0343@gmail.com
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00FFA3]/15 text-[#00FFA3]">
                Verified
              </span>
            </button>
          </div>

          <div className="relative flex py-0.5 items-center">
            <div className="flex-grow border-t border-emerald-500/20" />
            <span className="shrink mx-3 text-[11px] font-bold text-[#94B8AA]">
              or enter your Gmail address
            </span>
            <div className="flex-grow border-t border-emerald-500/20" />
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const cleanMail = googleEmailInput.trim().toLowerCase();
              if (!cleanMail) return;
              const derivedName =
                googleNameInput.trim() ||
                cleanMail
                  .split('@')[0]
                  .replace(/[._-]/g, ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase());
              setShowGoogleChooser(false);
              await loginWithGoogle(false, {
                email: cleanMail,
                fullName: derivedName,
              });
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-[11px] font-bold text-[#94B8AA] mb-1">
                Google Email Address
              </label>
              <input
                type="email"
                required
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#040E0A] border border-emerald-500/35 text-xs font-semibold text-white focus:outline-none focus:border-[#00FFA3]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94B8AA] mb-1">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={googleNameInput}
                onChange={(e) => setGoogleNameInput(e.target.value)}
                placeholder="Your Full Name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#040E0A] border border-emerald-500/35 text-xs font-semibold text-white focus:outline-none focus:border-[#00FFA3]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl apex-glow-btn text-xs font-display font-extrabold cursor-pointer"
            >
              Continue with Google →
            </button>
          </form>
        </div>
      </div>
    );
  };

  // IF USER IS ALREADY LOGGED IN, NEVER SHOW LOGIN OR REGISTER FORMS AGAIN
  if (user && (route === 'login' || route === 'register')) {
    return (
      <main className="min-h-[75vh] flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md apex-glass-card rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase tracking-wider">
            Active Authenticated Session
          </div>
          <h1 className="text-2xl font-display font-extrabold text-[#FFFFFF]">
            Welcome Back, {user.fullName}
          </h1>
          <p className="text-sm text-[#94B8AA]">
            You are signed in to FUNDED APEX. Access your dashboard or launch the white-theme live trading terminal below.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('dashboard')}
              className="flex-1 py-3 rounded-xl apex-glow-btn text-xs cursor-pointer"
            >
              Open Trader Dashboard →
            </button>
            <button
              type="button"
              onClick={() => navigate('terminal')}
              className="flex-1 py-3 rounded-xl bg-[#040E0A] border border-emerald-500/35 text-[#FFFFFF] font-bold text-xs cursor-pointer"
            >
              Open Live Terminal
            </button>
          </div>
        </div>
      </main>
    );
  }

  // LOGIN PAGE (/login)
  if (route === 'login') {
    return (
      <main className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div
          className={`w-full max-w-md apex-glass-card border ${
            loginError ? 'border-rose-500/70 apex-shake' : 'border-[#00FFA3]/30'
          } rounded-3xl p-6 sm:p-8 space-y-6 apex-scale-in`}
        >
          {/* Logo & Top Header */}
          <div className="flex flex-col items-center text-center space-y-3.5">
            <FundedApexLogo size="lg" />

            {/* Pill Switcher: [ Log in ] [ Sign up ] */}
            <div className="w-full grid grid-cols-2 p-1 rounded-2xl bg-[#040E0A] border border-emerald-500/25">
              <button
                type="button"
                className="py-2.5 rounded-xl apex-glow-btn text-sm transition-all cursor-pointer"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => navigate('register')}
                className="py-2.5 rounded-xl text-[#94B8AA] hover:text-white font-display font-bold text-sm transition-all cursor-pointer"
              >
                Sign up
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
              Sign in to FUNDED APEX
            </h1>
            <p className="text-xs text-[#94B8AA]">
              Sign in with your registered email & password or Google account.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs font-bold text-rose-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 animate-ping" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Single Authentic Firebase Google Sign-In Button */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={authLoading}
              onClick={handleGoogleAuthClick}
              className="w-full py-3.5 px-4 rounded-xl bg-[#04120C] hover:bg-[#0B241A] border border-[#00FFA3]/40 text-[#FFFFFF] text-sm font-display font-bold flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,255,163,0.14)] hover:shadow-[0_0_28px_rgba(0,255,163,0.28)] transition-all cursor-pointer"
            >
              <GoogleLogoSvg />
              <span>{authLoading ? 'Connecting...' : 'Continue with Google'}</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-emerald-500/20" />
            <span className="shrink mx-3 text-xs font-bold text-[#94B8AA]">or manual client login</span>
            <div className="flex-grow border-t border-emerald-500/20" />
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginError('');
              try {
                await loginWithEmail(loginEmail, loginPassword);
              } catch (err: unknown) {
                setLoginError(err instanceof Error ? err.message : 'Authentication failed.');
              }
            }}
            className="space-y-4 text-left"
          >
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-[#F8FAFC] mb-1.5">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="trader@example.com"
                className="w-full px-4 py-3 rounded-xl bg-[#040E0A] border border-emerald-500/30 text-sm font-semibold text-[#FFFFFF] focus:outline-none focus:border-[#00FFA3] transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-xs font-bold text-[#F8FAFC]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-bold text-[#00FFA3] hover:text-emerald-300 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#040E0A] border border-emerald-500/30 text-sm font-semibold text-[#FFFFFF] focus:outline-none focus:border-[#00FFA3] transition-colors"
                />
                <button
                  type="button"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94B8AA] hover:text-[#00FFA3] p-1 transition-colors cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 px-4 rounded-xl apex-glow-btn text-sm transition-all cursor-pointer"
            >
              {authLoading ? 'Verifying Credentials...' : 'Log in to Account'}
            </button>
          </form>

          <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs font-bold text-[#94B8AA]">
            <span>New to FUNDED APEX?</span>
            <button
              type="button"
              onClick={() => navigate('register')}
              className="text-[#00FFA3] hover:text-emerald-300 font-extrabold cursor-pointer"
            >
              Create Trader Account →
            </button>
          </div>

          {showForgotModal && (
            <div className="pt-4 border-t border-emerald-500/20 space-y-3">
              <div className="text-xs font-extrabold text-[#FFFFFF]">Reset Your Password</div>
              <input
                type="email"
                value={resetEmailInput}
                onChange={(e) => setResetEmailInput(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full px-3 py-2 rounded-xl bg-[#040E0A] border border-emerald-500/35 text-xs font-semibold text-[#FFFFFF]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await sendPasswordReset(resetEmailInput);
                      setShowForgotModal(false);
                    } catch (err: unknown) {
                      setLoginError(err instanceof Error ? err.message : 'Reset error');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg apex-glow-btn text-xs cursor-pointer"
                >
                  Send Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#040E0A] text-[#94B8AA] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {renderGoogleChooserModal()}
        </div>
      </main>
    );
  }

  // REGISTER PAGE (/register)
  if (route === 'register') {
    return (
      <main className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div
          className={`w-full max-w-lg apex-glass-card border ${
            regError ? 'border-rose-500/70 apex-shake' : 'border-[#00FFA3]/30'
          } rounded-3xl p-6 sm:p-8 space-y-6 apex-scale-in`}
        >
          {/* Logo & Top Header */}
          <div className="flex flex-col items-center text-center space-y-3.5">
            <FundedApexLogo size="lg" />

            {/* Pill Switcher: [ Log in ] [ Sign up ] */}
            <div className="w-full grid grid-cols-2 p-1 rounded-2xl bg-[#040E0A] border border-emerald-500/25">
              <button
                type="button"
                onClick={() => navigate('login')}
                className="py-2.5 rounded-xl text-[#94B8AA] hover:text-white font-display font-bold text-sm transition-all cursor-pointer"
              >
                Log in
              </button>
              <button
                type="button"
                className="py-2.5 rounded-xl apex-glow-btn text-sm transition-all cursor-pointer"
              >
                Sign up
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
              Create Your Trader Account
            </h1>
            <p className="text-xs text-[#94B8AA]">
              Register your isolated trader profile to start your trading challenge and manage up to $600K in simulated capital.
            </p>
          </div>

          {regError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs font-bold text-rose-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 animate-ping" />
              <span>{regError}</span>
            </div>
          )}

          {/* Direct Authentic Firebase Google Sign-Up Button */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={authLoading}
              onClick={handleGoogleAuthClick}
              className="w-full py-3.5 px-4 rounded-xl bg-[#04120C] hover:bg-[#0B241A] border border-[#00FFA3]/40 text-[#FFFFFF] text-sm font-display font-bold flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,255,163,0.14)] hover:shadow-[0_0_28px_rgba(0,255,163,0.28)] transition-all cursor-pointer"
            >
              <GoogleLogoSvg />
              <span>{authLoading ? 'Connecting...' : 'Continue with Google'}</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-emerald-500/20" />
            <span className="shrink mx-3 text-xs font-bold text-[#94B8AA]">or register with email</span>
            <div className="flex-grow border-t border-emerald-500/20" />
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setRegError('');
              if (regPassword.length < 6) {
                setRegError('Password must be at least 6 characters.');
                return;
              }
              try {
                await registerWithEmail({
                  fullName: regName,
                  email: regEmail,
                  country: regCountry,
                  password: regPassword,
                  referralCode: regReferral,
                });
              } catch (err: unknown) {
                setRegError(err instanceof Error ? err.message : 'Registration failed.');
              }
            }}
            className="space-y-4 text-left"
          >
            <div>
              <label htmlFor="reg-name" className="block text-xs font-bold text-[#F8FAFC] mb-1.5">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-xl bg-[#040E0A] border border-emerald-500/30 text-sm font-semibold text-[#FFFFFF] focus:outline-none focus:border-[#00FFA3] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-email" className="block text-xs font-bold text-[#F8FAFC] mb-1.5">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full px-4 py-3 rounded-xl bg-[#040E0A] border border-emerald-500/30 text-sm font-semibold text-[#FFFFFF] focus:outline-none focus:border-[#00FFA3] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="reg-country" className="block text-xs font-bold text-[#F8FAFC] mb-1.5">
                  Country
                </label>
                <select
                  id="reg-country"
                  value={regCountry}
                  onChange={(e) => setRegCountry(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#040E0A] border border-emerald-500/30 text-sm font-semibold text-[#FFFFFF] focus:outline-none focus:border-[#00FFA3] transition-colors"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-password" className="block text-xs font-bold text-[#F8FAFC] mb-1.5">
                  Password (min. 6 chars)
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#040E0A] border border-emerald-500/30 text-sm font-semibold text-[#FFFFFF] focus:outline-none focus:border-[#00FFA3] transition-colors"
                  />
                  <button
                    type="button"
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94B8AA] hover:text-[#00FFA3] p-1 transition-colors cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-referral" className="block text-xs font-bold text-[#F8FAFC] mb-1.5">
                  Referral Code (Optional)
                </label>
                <input
                  id="reg-referral"
                  type="text"
                  value={regReferral}
                  onChange={(e) => setRegReferral(e.target.value)}
                  placeholder="APEX-XXXXXX"
                  className="w-full px-4 py-3 rounded-xl bg-[#040E0A] border border-emerald-500/30 text-sm font-semibold text-[#FFFFFF] focus:outline-none focus:border-[#00FFA3] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 px-4 rounded-xl apex-glow-btn text-sm transition-all cursor-pointer"
            >
              {authLoading ? 'Creating Account...' : 'Create Trader Account'}
            </button>
          </form>

          <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs font-bold text-[#94B8AA]">
            <span>Already have an account?</span>
            <button
              type="button"
              onClick={() => navigate('login')}
              className="text-[#00FFA3] hover:text-emerald-300 font-extrabold cursor-pointer"
            >
              Log in →
            </button>
          </div>
          {renderGoogleChooserModal()}
        </div>
      </main>
    );
  }

  // ABOUT US PAGE
  if (route === 'about') {
    return (
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <section className="max-w-3xl space-y-4">
          <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase tracking-wider">
            About FUNDED APEX
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            Built for Disciplined Quantitative & Discretionary Traders.
          </h1>
          <p className="text-base text-[#94B8AA] leading-relaxed">
            FUNDED APEX is an institutional prop trading firm engineered with our own live market terminal, real-time drawdown telemetry, and capital allocations up to $600,000.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="apex-glass-card rounded-2xl p-7 space-y-3">
            <div className="text-sm font-display font-bold text-[#00FFA3]">01. Proprietary White Terminal</div>
            <h3 className="text-xl font-display font-extrabold text-[#FFFFFF]">On-Chart Trade Execution</h3>
            <p className="text-sm text-[#94B8AA] leading-relaxed">
              Our proprietary live market engine processes Market, Limit, and Stop orders directly on the candlestick chart with real-time P&L across Forex, Gold, Indices, and Crypto.
            </p>
          </div>
          <div className="apex-glass-card rounded-2xl p-7 space-y-3">
            <div className="text-sm font-display font-bold text-[#00FFA3]">02. Strict Data Isolation</div>
            <h3 className="text-xl font-display font-extrabold text-[#FFFFFF]">Zero-Trust Account Security</h3>
            <p className="text-sm text-[#94B8AA] leading-relaxed">
              Every trader starts with a clean, isolated profile protected by Firebase Authentication and Admin-verified account activations.
            </p>
          </div>
          <div className="apex-glass-card rounded-2xl p-7 space-y-3">
            <div className="text-sm font-display font-bold text-[#00FFA3]">03. Flexible Global Payments</div>
            <h3 className="text-xl font-display font-extrabold text-[#FFFFFF]">UPI, Bank Wire & Crypto</h3>
            <p className="text-sm text-[#94B8AA] leading-relaxed">
              Purchase your evaluation seamlessly using UPI, Bank Transfer, or USDT Crypto with rapid Admin verification.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // CHALLENGES / TRADING PROGRAMS SUBPAGE
  if (route === 'challenges' || route === 'account-sizes') {
    return (
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {renderProgramDetailsModal()}
        <div className="max-w-3xl space-y-3">
          <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase tracking-wider">
            Trading Programs & Account Sizes ($5K – $200K)
          </div>
          <h1 className="text-4xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            Select Your FUNDED APEX Trading Program
          </h1>
          <p className="text-base text-[#94B8AA]">
            Choose your preferred account size and program model below. Pay securely via UPI, Bank Transfer, or Crypto with official coupon codes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ACCOUNT_SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => setSelectedSize(sz)}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-extrabold cursor-pointer ${
                selectedSize === sz
                  ? 'apex-glow-btn'
                  : 'bg-[#071610] border border-emerald-500/30 text-[#94B8AA] hover:text-[#FFFFFF]'
              }`}
            >
              ${(sz / 1000).toFixed(0)}K Account
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(['instant', 'one_step', 'two_step', 'three_step'] as ChallengeType[]).map((typeKey) => {
            const ch =
              availableChallenges.find((c) => c.type === typeKey && c.accountSize === selectedSize) ||
              availableChallenges.find((c) => c.type === typeKey) ||
              selectedChallenge;
            return (
              <div
                key={`${typeKey}-${selectedSize}`}
                className="apex-glass-card rounded-2xl p-6 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase">
                        {ch.typeLabel}
                      </div>
                      <h3 className="text-2xl font-display font-extrabold text-[#FFFFFF] font-mono mt-1">
                        ${ch.accountSize.toLocaleString()}
                      </h3>
                    </div>
                    <div className="text-right bg-[#040E0A] border border-emerald-500/30 rounded-xl px-3 py-1.5">
                      <div className="text-[10px] font-bold text-[#94B8AA] uppercase">Fee</div>
                      <div className="text-xl font-extrabold text-[#00FFA3] font-mono">${ch.priceUsd}</div>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-emerald-500/20 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#94B8AA]">Account Balance</span>
                      <span className="font-mono font-bold text-[#FFFFFF]">
                        ${ch.accountSize.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94B8AA]">Profit Target</span>
                      <span className="font-mono font-bold text-[#FFFFFF]">{ch.profitTargetPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94B8AA]">Daily Drawdown</span>
                      <span className="font-mono font-bold text-[#FFFFFF]">{ch.dailyDrawdownPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94B8AA]">Maximum Drawdown</span>
                      <span className="font-mono font-bold text-[#FFFFFF]">{ch.maxDrawdownPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94B8AA]">Profit Split</span>
                      <span className="font-mono font-bold text-[#00FFA3]">{ch.profitSplitPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94B8AA]">Minimum Trading Days</span>
                      <span className="font-mono font-bold text-[#FFFFFF]">{ch.minTradingDays} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94B8AA]">Leverage</span>
                      <span className="font-mono font-bold text-[#FFFFFF]">1:{ch.leverage}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setDetailModalChallenge(ch)}
                    className="py-2.5 px-3 rounded-xl bg-[#040E0A] hover:bg-[#0B2219] border border-emerald-500/35 text-[#FFFFFF] font-bold text-xs cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBuyChallenge(ch.id)}
                    className="py-2.5 px-3 rounded-xl apex-glow-btn text-xs cursor-pointer"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  if (route === 'trading-rules') {
    return (
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <div className="max-w-3xl space-y-3">
          <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase">Risk Governance</div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            FUNDED APEX Trading Rules & Objectives
          </h1>
          <p className="text-sm sm:text-base text-[#94B8AA]">
            Transparent, programmatic rules enforced automatically by our simulation risk engine.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: '01. Daily Drawdown Limit',
              desc: 'Your account equity (including floating P&L) must not fall below the program Daily Drawdown percentage (3% Instant, 4% One Step, 5% Two Step & Three Step).',
            },
            {
              title: '02. Maximum Overall Drawdown',
              desc: 'Your equity may never drop below the Maximum Drawdown floor relative to your initial starting balance (6% Instant & One Step, 10% Two Step, 12% Three Step).',
            },
            {
              title: '03. Minimum Trading Days',
              desc: 'Traders must execute trades on at least 3 distinct trading days for One Step, Two Step, and Three Step challenges (5 days for Instant Funding).',
            },
            {
              title: '04. Authorized Platform Execution',
              desc: 'All orders are placed directly inside the proprietary FUNDED APEX Live Trading Terminal with real-time margin and drawdown validation.',
            },
          ].map((rule) => (
            <div key={rule.title} className="apex-glass-card rounded-2xl p-6 space-y-2.5">
              <h3 className="text-lg font-display font-extrabold text-[#FFFFFF]">{rule.title}</h3>
              <p className="text-sm text-[#94B8AA] leading-relaxed">{rule.desc}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (route === 'how-it-works') {
    return (
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <div className="max-w-3xl space-y-4">
          <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase">Four-Step Visual Process</div>
          <h1 className="text-4xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            How FUNDED APEX Works
          </h1>
          <p className="text-base text-[#94B8AA]">
            Progress from program selection to your funded account in four transparent steps.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: 'Step 01',
              title: 'Choose Your Trading Program',
              desc: 'Select Instant Funding, One Step, Two Step, or Three Step Challenge in account sizes from $5K to $200K.',
            },
            {
              step: 'Step 02',
              title: 'Verify Payment via UPI / Bank / Crypto',
              desc: 'Pay with UPI, Bank Transfer, or Crypto and receive rapid Admin confirmation to activate your account.',
            },
            {
              step: 'Step 03',
              title: 'Trade on Live White Terminal',
              desc: 'Execute trades directly on the live candlestick chart within Daily and Maximum Drawdown limits.',
            },
            {
              step: 'Step 04',
              title: 'Receive Bi-Weekly Payouts',
              desc: 'Scale up to $600K and withdraw up to 95% of your simulated profits every 14 days.',
            },
          ].map((item) => (
            <div key={item.step} className="apex-glass-card rounded-2xl p-6 space-y-3">
              <div className="text-xs font-display font-extrabold text-[#00FFA3]">{item.step}</div>
              <h3 className="text-lg font-display font-extrabold text-[#FFFFFF]">{item.title}</h3>
              <p className="text-sm text-[#94B8AA] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (route === 'payouts') {
    const movingPayoutStream = [...verifiedPayouts, ...verifiedPayouts];
    return (
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <div className="space-y-2.5">
          <div className="apex-kicker">
            <span className="h-2 w-2 rounded-full bg-[#00FFA3] animate-ping" />
            <span>Verified Payout Registry · Live Stream</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            FUNDED APEX Verified Payouts
          </h1>
          <p className="text-base sm:text-lg text-[#94B8AA]">
            Real-time verified profit settlements paid out to FUNDED APEX funded traders via UPI, Bank Wire, and USDT Crypto.
          </p>
        </div>

        {/* Continuous Moving Live Payout Cards Stream */}
        <div className="relative overflow-hidden rounded-3xl apex-glass-panel py-5 px-2">
          <div className="apex-marquee-track-fast gap-4 px-2">
            {movingPayoutStream.map((pay, idx) => (
              <div
                key={`${pay.id}-page-stream-${idx}`}
                className="w-[290px] sm:w-[330px] shrink-0 p-5 apex-glass-card flex items-center justify-between gap-3"
              >
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#00FFA3]" />
                    <span className="text-base font-display font-extrabold text-[#FFFFFF]">
                      {pay.traderName}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-[#94B8AA] font-medium">
                    ${(pay.accountSize / 1000).toFixed(0)}K {pay.programType}
                  </div>
                  <div className="text-xs font-mono text-[#6EE7B7]">{pay.paymentDate}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl sm:text-2xl font-extrabold text-[#00FFA3]">
                    +${pay.amountUsd.toLocaleString()}
                  </div>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-[#00FFA3]/35 text-[11px] font-mono font-bold text-[#00FFA3]">
                    {pay.currency} · PAID
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="apex-glass-card rounded-3xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-emerald-500/20 text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-[#6EE7B7]">
                <th className="py-4.5 px-6">Trader / Username</th>
                <th className="py-4.5 px-6">Program</th>
                <th className="py-4.5 px-6 text-right">Payout Amount</th>
                <th className="py-4.5 px-6">Currency</th>
                <th className="py-4.5 px-6">Payment Status</th>
                <th className="py-4.5 px-6 text-right">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/15 text-sm sm:text-base">
              {verifiedPayouts.map((p) => (
                <tr key={p.id} className="hover:bg-[#05140E]/70 transition-colors">
                  <td className="py-4.5 px-6">
                    <div className="font-display font-extrabold text-[#FFFFFF] text-base">{p.traderName}</div>
                    <div className="text-xs sm:text-sm font-mono text-[#94B8AA]">{p.username}</div>
                  </td>
                  <td className="py-4.5 px-6 text-[#E2E8F0] font-medium">
                    ${(p.accountSize / 1000).toFixed(0)}K {p.programType}
                  </td>
                  <td className="py-4.5 px-6 font-mono font-extrabold text-right text-[#00FFA3] text-base sm:text-lg">
                    +${p.amountUsd.toLocaleString()}
                  </td>
                  <td className="py-4.5 px-6 font-mono text-[#94B8AA]">{p.currency}</td>
                  <td className="py-4.5 px-6 font-extrabold text-[#00FFA3]">{p.status}</td>
                  <td className="py-4.5 px-6 font-mono text-right text-[#94B8AA]">{p.paymentDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    );
  }

  if (route === 'leaderboard') {
    return (
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase">
              Database Standings
            </div>
            <h1 className="text-4xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
              FUNDED APEX Trader Leaderboard
            </h1>
            <p className="text-sm text-[#94B8AA]">
              Live database rankings sorted by profit percentage and total simulated profit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(user ? 'terminal' : 'register')}
            className="px-5 py-2.5 rounded-xl apex-glow-btn text-xs cursor-pointer"
          >
            Start Challenge to Compete
          </button>
        </div>

        <div className="apex-glass-card rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-emerald-500/20 text-xs text-[#94B8AA]">
                <th className="py-4 px-6">Trader Ranking</th>
                <th className="py-4 px-6">Username</th>
                <th className="py-4 px-6 text-right">Account Size</th>
                <th className="py-4 px-6 text-right">Profit Percentage</th>
                <th className="py-4 px-6 text-right">Total Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/15 text-sm">
              {leaderboard.map((entry) => (
                <tr key={entry.rank} className="hover:bg-[#05140E]">
                  <td className="py-4 px-6 font-mono font-extrabold text-[#00FFA3]">#{entry.rank}</td>
                  <td className="py-4 px-6">
                    <div className="font-display font-extrabold text-[#FFFFFF]">{entry.username}</div>
                    <div className="text-xs text-[#94B8AA]">{entry.traderName} · {entry.country}</div>
                  </td>
                  <td className="py-4 px-6 font-mono text-right text-[#FFFFFF]">
                    ${entry.accountSize.toLocaleString()}
                  </td>
                  <td className="py-4 px-6 font-mono text-right text-[#00FFA3] font-extrabold">
                    +{entry.returnPct.toFixed(2)}%
                  </td>
                  <td className="py-4 px-6 font-mono text-right text-[#FFFFFF] font-extrabold">
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

  if (route === 'terminal-preview' || route === 'referral' || route === 'free-spin') {
    return (
      <main className="max-w-[1440px] mx-auto px-6 py-16 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 apex-glass-card rounded-2xl p-8">
          <div className="space-y-2 max-w-2xl">
            <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase">
              FUNDED APEX Ecosystem
            </div>
            <h1 className="text-3xl font-display font-extrabold text-[#FFFFFF]">
              {route === 'referral'
                ? 'Affiliate & Referral Program'
                : 'FUNDED APEX Live Trading Terminal'}
            </h1>
            <p className="text-sm text-[#94B8AA]">
              {route === 'referral'
                ? `Share your partner code (${user ? user.referralCode : 'APEX-PARTNER'}) to earn bonus reward points on every verified trader signup.`
                : 'Trade Forex, Gold, Indices, and Crypto directly inside our proprietary White-Theme Live Trading Terminal.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('challenges')}
            className="px-6 py-3 rounded-xl apex-glow-btn text-xs cursor-pointer"
          >
            Explore Trading Programs →
          </button>
        </div>
      </main>
    );
  }

  if (route === 'faq') {
    const filteredFaq = FAQ_ITEMS.filter(
      (item) =>
        item.q.toLowerCase().includes(faqQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(faqQuery.toLowerCase())
    );
    return (
      <main className="max-w-[1440px] mx-auto px-6 py-16 space-y-10">
        <div className="max-w-2xl space-y-4">
          <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase">Knowledge Base</div>
          <h1 className="text-4xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            Frequently Asked Questions
          </h1>
          <div className="relative">
            <Search className="w-4 h-4 text-[#94B8AA] absolute left-3.5 top-3" />
            <input
              type="text"
              value={faqQuery}
              onChange={(e) => setFaqQuery(e.target.value)}
              placeholder="Search funding rules, drawdown, payouts, or challenges..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#071610] border border-emerald-500/30 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#00FFA3]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFaq.map((item, idx) => (
            <div key={idx} className="apex-glass-card rounded-2xl p-6 space-y-2.5">
              <div className="text-xs text-[#00FFA3] font-display font-extrabold">{item.category}</div>
              <h3 className="text-base font-display font-extrabold text-[#FFFFFF]">{item.q}</h3>
              <p className="text-sm text-[#94B8AA] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (route === 'contact') {
    return (
      <main className="max-w-[1440px] mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto apex-glass-card rounded-2xl p-8 space-y-6">
          <div className="space-y-3">
            <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase">
              Dedicated Trader Support
            </div>
            <h1 className="text-3xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
              Contact FUNDED APEX
            </h1>
            <p className="text-sm text-[#94B8AA]">
              Submit an inquiry to our 24/7 Support Desk regarding challenges, payment verifications, or terminal specifications.
            </p>
            <div className="p-3 rounded-xl bg-[#040E0A] border border-emerald-500/35 flex items-center justify-between text-xs">
              <span className="text-[#94B8AA]">Direct Support Email:</span>
              <a
                href="mailto:fundedapexsupport@gmail.com"
                className="font-mono font-bold text-[#00FFA3] hover:text-emerald-300 underline"
              >
                fundedapexsupport@gmail.com
              </a>
            </div>
          </div>

          {contactSubmitted ? (
            <div className="p-6 rounded-xl bg-[#040E0A] border border-emerald-500/45 space-y-3">
              <h3 className="text-base font-display font-extrabold text-[#FFFFFF]">
                Inquiry Logged Successfully
              </h3>
              <p className="text-sm text-[#94B8AA]">
                Thank you, {contactName}. Our support desk has recorded your message regarding &quot;{contactSubject}&quot; and will respond to {contactEmail}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setContactSubmitted(false);
                  setContactMessage('');
                }}
                className="px-4 py-2 rounded-xl apex-glow-btn text-xs cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setContactSubmitted(true);
                pushNotification('Support Ticket Created', 'Your message has been routed to Support.', 'success');
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-bold text-[#FFFFFF] mb-1.5">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jordan Vance"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#040E0A] border border-emerald-500/35 text-sm text-[#FFFFFF]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold text-[#FFFFFF] mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="jordan@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#040E0A] border border-emerald-500/35 text-sm text-[#FFFFFF]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="contact-subject" className="block text-xs font-bold text-[#FFFFFF] mb-1.5">
                  Topic
                </label>
                <select
                  id="contact-subject"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040E0A] border border-emerald-500/35 text-sm text-[#FFFFFF]"
                >
                  <option value="Evaluation Inquiry">Evaluation Inquiry</option>
                  <option value="Payment Confirmation">UPI / Bank / Crypto Payment Confirmation</option>
                  <option value="Payout Verification">Payout Verification</option>
                  <option value="Trading Terminal Support">Trading Terminal Support</option>
                </select>
              </div>
              <div>
                <label htmlFor="contact-msg" className="block text-xs font-bold text-[#FFFFFF] mb-1.5">
                  Message
                </label>
                <textarea
                  id="contact-msg"
                  rows={4}
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Describe your question..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040E0A] border border-emerald-500/35 text-sm text-[#FFFFFF]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl apex-glow-btn text-sm cursor-pointer"
              >
                Submit Inquiry
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  // LEGAL PAGES: PRIVACY POLICY, TERMS, REFUND POLICY, RISK DISCLOSURE
  if (
    route === 'privacy' ||
    route === 'terms' ||
    route === 'refund-policy' ||
    route === 'risk-disclosure'
  ) {
    const titles: Record<string, { title: string; subtitle: string; sections: { h: string; p: string }[] }> = {
      privacy: {
        title: 'Privacy Policy',
        subtitle: 'Data Isolation, PII Protection & Zero-Trust Storage',
        sections: [
          {
            h: '1. Fresh Account & Data Isolation',
            p: 'FUNDED APEX stores each user profile in an isolated Firestore document protected by strict owner-only and verified-administrator access controls.',
          },
          {
            h: '2. Authentication & Security',
            p: 'Authentication is handled via Firebase Authentication supporting email/password and Google OAuth. Role assignments are strictly verified on the backend.',
          },
          {
            h: '3. Account Deletion Rights',
            p: 'Users may submit an Account Deletion Request directly from their Account Settings panel at any time.',
          },
        ],
      },
      terms: {
        title: 'Terms and Conditions',
        subtitle: 'Operating Governance for FUNDED APEX Challenges',
        sections: [
          {
            h: '1. Simulated Prop Firm Operating Mode',
            p: 'FUNDED APEX provides proprietary trading challenges and simulated funded accounts up to $600,000. All orders and P&L calculations are executed in a simulated environment.',
          },
          {
            h: '2. Terminal Usage',
            p: 'All evaluations are conducted exclusively on the custom FUNDED APEX Live Trading Terminal. Use of unauthorized scripts or account sharing is prohibited.',
          },
          {
            h: '3. Role & Access Integrity',
            p: 'Attempting to bypass security rules or self-assign administrative privileges will result in immediate account termination.',
          },
        ],
      },
      'refund-policy': {
        title: 'Refund Policy',
        subtitle: 'Challenge Fee Refund Upon First Funded Payout',
        sections: [
          {
            h: '1. 100% Challenge Fee Refund',
            p: 'Traders who successfully complete their One Step, Two Step, or Three Step Challenge and qualify for their first verified Funded Account payout receive a 100% reimbursement of their initial challenge fee.',
          },
          {
            h: '2. Evaluation Activation Policy',
            p: 'Once trading activity has commenced on an active challenge account, evaluation fees are non-refundable prior to passing the challenge.',
          },
          {
            h: '3. Billing & Dispute Support',
            p: 'Contact our Dedicated Trader Support team at any time for assistance with challenge activations, coupon redemptions, or fee reimbursements.',
          },
        ],
      },
      'risk-disclosure': {
        title: 'Risk Disclosure',
        subtitle: 'Simulated Market Execution & Financial Risk Notice',
        sections: [
          {
            h: '1. Simulated Execution Environment',
            p: 'All trading activity within the FUNDED APEX Live Trading Terminal is simulated for skill evaluation purposes. Prices displayed on charts and order panels reflect institutional reference feeds.',
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
      <main className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-2 border-b border-emerald-500/20 pb-6">
          <div className="text-xs font-display font-extrabold text-[#00FFA3] uppercase">
            Legal & Compliance
          </div>
          <h1 className="text-4xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
            {docContent.title}
          </h1>
          <p className="text-sm text-[#94B8AA]">{docContent.subtitle}</p>
        </div>
        <div className="space-y-6">
          {docContent.sections.map((s) => (
            <div key={s.h} className="apex-glass-card rounded-2xl p-6 space-y-2">
              <h2 className="text-lg font-display font-extrabold text-[#FFFFFF]">{s.h}</h2>
              <p className="text-sm text-[#94B8AA] leading-relaxed">{s.p}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ============================================================================
  // HOMEPAGE FOR FUNDED APEX (route === 'home') — ARCHITECTURAL PRO UI & KINETIC FONTS
  // ============================================================================

  return (
    <main className="space-y-12 sm:space-y-16 pb-16 bg-transparent text-[#F8FAFC] relative font-sans selection:bg-[#00FFA3] selection:text-[#030A07]">
      {/* Smooth Top Scroll Progress Indicator Bar (GPU scaleX, Zero React Re-renders) */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-0.5 z-50 pointer-events-none bg-transparent"
      >
        <div
          ref={scrollBarRef}
          style={{ transform: 'scaleX(0)', transformOrigin: '0% 50%' }}
          className="h-full w-full bg-gradient-to-r from-emerald-400 to-[#00FFA3] will-change-transform"
        />
      </div>

      {renderProgramDetailsModal()}

      {/* 1. HERO SECTION MATCHING REFERENCE SCREENSHOT IN EMERALD THEME */}
      <section className="relative pt-8 sm:pt-12 pb-6 px-4 sm:px-6 overflow-hidden">
        {/* Decorative Liquid Green Shape Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[120%] pointer-events-none z-0 overflow-hidden">
          <div 
            className="absolute top-[10%] left-[20%] w-[60%] h-[50%] rounded-[45%_55%_70%_30%_/_30%_60%_40%_70%] bg-[#00FFA3]/10 blur-[120px] animate-[pulse_10s_ease-in-out_infinite]"
          />
          <div 
            className="absolute top-[20%] right-[10%] w-[50%] h-[60%] rounded-[70%_30%_45%_55%_/_60%_40%_70%_30%] bg-[#06B6D4]/10 blur-[100px] animate-[pulse_12s_ease-in-out_infinite_1s]"
          />
        </div>

        <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#07140E]/90 border border-white/12 text-[13px] sm:text-[14px] font-normal text-white/90 mb-7 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FFA3] shrink-0" />
            <span>Pay instantly with USDT (BEP20) · Payouts every 14 days</span>
          </div>

          {/* Clean Bold Hero Headline */}
          <h1
            data-testid="hero-headline"
            className="text-[46px] sm:text-[66px] lg:text-[78px] font-bold tracking-[-0.03em] leading-[1.05] text-center max-w-3xl mx-auto"
          >
            <span className="text-white block">Trade our</span>
            <span className="text-white">capital. </span>
            <span className="text-[#00FFA3]">Keep</span>
            <span className="text-[#00FFA3] block">up to 95%.</span>
          </h1>

          {/* Simple Clean Subtitle */}
          <p className="mt-6 text-[16px] sm:text-[19px] text-[#94A89E] max-w-[460px] mx-auto leading-[1.55] font-normal text-center">
            Prove your skill in one challenge and get a funded account up to $200K — no time limits, no hidden rules.
          </p>

          {/* 3D Neon-Green Candlestick Image + 3 Overlaid Stats */}
          <div className="relative w-full max-w-4xl mx-auto mt-7 sm:mt-9">
            <div className="relative w-full rounded-3xl overflow-hidden aspect-[16/10] sm:aspect-[16/9] max-h-[460px] bg-[#030A07] border border-emerald-500/25 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
              <img
                src="/hero_candlestick_3d.jpg"
                alt="FUNDED APEX 3D Neon-Green Candlestick Market Growth"
                className="w-full h-full object-cover object-center block"
              />
              {/* Bottom gradient scrim for crisp stat legibility */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030A07] via-[#030A07]/35 to-transparent"
              />

              {/* 3 Bottom Stats Overlaid on the Candlestick Image Base */}
              <div className="absolute inset-x-0 bottom-4 sm:bottom-7 z-10 grid grid-cols-3 gap-2 sm:gap-6 max-w-2xl mx-auto px-4">
                <div className="text-center">
                  <div className="text-[26px] sm:text-[42px] font-bold text-white tracking-tight leading-none">
                    24h
                  </div>
                  <div className="text-[12px] sm:text-[15px] font-normal text-[#B0D0C3] mt-1.5">
                    Avg. payout
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[26px] sm:text-[42px] font-bold text-white tracking-tight leading-none">
                    38K+
                  </div>
                  <div className="text-[12px] sm:text-[15px] font-normal text-[#B0D0C3] mt-1.5">
                    Traders
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[26px] sm:text-[42px] font-bold text-white tracking-tight leading-none">
                    $4.2M+
                  </div>
                  <div className="text-[12px] sm:text-[15px] font-normal text-[#B0D0C3] mt-1.5">
                    Total Rewards
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons below Hero */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => scrollToSection('challenges-matrix')}
              className="px-8 py-3.5 rounded-full bg-[#00FFA3] hover:bg-[#10F5A0] text-[#030A07] text-[15px] sm:text-[16px] font-semibold flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(0,255,163,0.35)] cursor-pointer transition-all"
            >
              <span>Buy Challenge</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>

            <button
              type="button"
              onClick={() => navigate(user ? 'dashboard' : 'login')}
              className="px-8 py-3.5 rounded-full bg-[#07140E]/90 border border-white/15 hover:border-[#00FFA3]/60 text-white text-[15px] sm:text-[16px] font-medium transition-all cursor-pointer"
            >
              <span>Dashboard</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (3-COLUMN ARCHITECTURAL GRID ON DESKTOP, STACKED ON MOBILE) */}
      <section id="how-it-works" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div data-scroll-reveal className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="apex-kicker">
            <span>HOW IT WORKS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF]">
            <KineticHeading text="Funded in three simple steps" shimmerWords={['Funded', 'steps']} />
          </h2>
          <p className="text-base sm:text-lg text-[#B0D0C3]">
            A transparent, institutional evaluation pipeline from day one to bi-weekly profit settlements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              num: '01',
              title: 'Select Your Program & Pay Seamlessly',
              desc: 'Choose a 2-Step, 1-Step, Instant, or 3-Step account from $5K to $200K. Pay via UPI, Bank Transfer, or USDT Crypto with instant Admin verification.',
            },
            {
              num: '02',
              title: 'Trade on the Live White Terminal',
              desc: 'Execute Market, Limit, and Stop orders directly on our live candlestick chart with real-time P&L and automated drawdown telemetry.',
            },
            {
              num: '03',
              title: 'Receive Bi-Weekly Profit Payouts',
              desc: 'Scale your funded capital and withdraw up to 95% of your simulated profits every 14 days with a 100% fee refund on your first payout.',
            },
          ].map((st, idx) => (
            <div
              key={st.num}
              data-scroll-reveal
              style={{ '--reveal-delay': `${idx * 70}ms` } as React.CSSProperties}
              className="p-6 sm:p-7 apex-glass-card flex flex-col justify-between space-y-5"
            >
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1.5 rounded-2xl bg-[#051811] border border-[#00FFA3]/35 font-mono text-xs sm:text-sm font-bold text-[#00FFA3]">
                  STEP {st.num}
                </span>
                <span className="font-mono text-3xl font-extrabold text-emerald-400/30">
                  {st.num}
                </span>
              </div>
              <div className="space-y-2.5 text-left">
                <h3 className="text-xl sm:text-2xl font-display font-extrabold text-[#FFFFFF]">
                  {st.title}
                </h3>
                <p className="text-sm sm:text-base text-[#B0D0C3] leading-relaxed">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CHALLENGES SECTION (12-COLUMN INTERACTIVE CONFIGURATOR & CHECKOUT SUMMARY) */}
      <section id="challenges-matrix" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div data-scroll-reveal className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="apex-kicker">
            <span>EVALUATION PROGRAMS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF]">
            <KineticHeading text="Affordable challenges, real capital" shimmerWords={['real', 'capital']} />
          </h2>
          <p className="text-base sm:text-lg text-[#B0D0C3]">
            Configure your evaluation model and account size below. Activate via UPI, Bank Transfer, or USDT Crypto.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Model Switcher, Account Size Selector & Architectural Spec Grid */}
          <div className="lg:col-span-7 space-y-5">
            {/* Challenge Model Switcher Tabs */}
            <div
              data-scroll-reveal
              className="p-2 rounded-2xl apex-glass-panel grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
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
                  className={`py-3 px-3 text-center rounded-2xl text-xs sm:text-sm font-display font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    selectedType === t.type
                      ? 'apex-glow-btn'
                      : 'text-[#B0D0C3] hover:text-[#FFFFFF] hover:bg-white/5'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Account Size Horizontal Chips ($5K to $200K) */}
            <div data-scroll-reveal className="apex-glass-panel p-5 sm:p-6 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-display font-bold text-[#B0D0C3] uppercase tracking-wider">
                  Select Account Capital
                </span>
                <span className="text-sm sm:text-base font-mono font-extrabold text-[#00FFA3]">
                  ${selectedChallenge.accountSize.toLocaleString()} USD
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {ACCOUNT_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`py-3.5 px-2 text-center rounded-2xl font-mono text-sm sm:text-base font-extrabold transition-all cursor-pointer ${
                      selectedSize === sz
                        ? 'bg-[#0A291E] border-2 border-[#00FFA3] text-[#00FFA3] shadow-[0_0_22px_rgba(0,255,163,0.28)]'
                        : 'bg-[#04100B]/85 border border-emerald-500/25 text-[#B0D0C3] hover:text-[#FFFFFF] hover:border-emerald-500/45'
                    }`}
                  >
                    ${(sz / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
            </div>

            {/* Structured 2-Column Specification Grid */}
            <div
              data-scroll-reveal
              className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
            >
              <div className="p-4.5 rounded-2xl apex-glass-panel flex items-center justify-between">
                <span className="text-sm sm:text-base font-medium text-[#B0D0C3]">Phase 1 Profit Target</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-[#FFFFFF]">
                  {selectedChallenge.profitTargetPct}% (${((selectedChallenge.accountSize * selectedChallenge.profitTargetPct) / 100).toLocaleString()})
                </span>
              </div>

              <div className="p-4.5 rounded-2xl apex-glass-panel flex items-center justify-between">
                <span className="text-sm sm:text-base font-medium text-[#B0D0C3]">Phase 2 Profit Target</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-[#FFFFFF]">
                  {selectedType === 'two_step'
                    ? `5% ($${(selectedChallenge.accountSize * 0.05).toLocaleString()})`
                    : selectedType === 'three_step'
                    ? '5% (Phase 2 & 3)'
                    : 'None (Direct Funded)'}
                </span>
              </div>

              <div className="p-4.5 rounded-2xl apex-glass-panel flex items-center justify-between">
                <span className="text-sm sm:text-base font-medium text-[#B0D0C3]">Max Daily Drawdown</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-[#FFFFFF]">
                  {selectedChallenge.dailyDrawdownPct}% (${((selectedChallenge.accountSize * selectedChallenge.dailyDrawdownPct) / 100).toLocaleString()})
                </span>
              </div>

              <div className="p-4.5 rounded-2xl apex-glass-panel flex items-center justify-between">
                <span className="text-sm sm:text-base font-medium text-[#B0D0C3]">Max Overall Drawdown</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-[#FFFFFF]">
                  {selectedChallenge.maxDrawdownPct}% (${((selectedChallenge.accountSize * selectedChallenge.maxDrawdownPct) / 100).toLocaleString()})
                </span>
              </div>

              <div className="p-4.5 rounded-2xl apex-glass-panel flex items-center justify-between">
                <span className="text-sm sm:text-base font-medium text-[#B0D0C3]">Min. Trading Days</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-[#FFFFFF]">
                  {selectedChallenge.minTradingDays} Days · Unlimited Time
                </span>
              </div>

              <div className="p-4.5 rounded-2xl apex-glass-panel flex items-center justify-between">
                <span className="text-sm sm:text-base font-medium text-[#B0D0C3]">Institutional Leverage</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-[#00FFA3]">
                  1:{selectedChallenge.leverage}
                </span>
              </div>

              <div className="p-4.5 rounded-2xl apex-glass-panel flex items-center justify-between">
                <span className="text-sm sm:text-base font-medium text-[#B0D0C3]">Trader Profit Split</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-[#00FFA3]">
                  Up to {selectedChallenge.profitSplitPct}%
                </span>
              </div>

              <div className="p-4.5 rounded-2xl apex-glass-panel flex items-center justify-between">
                <span className="text-sm sm:text-base font-medium text-[#B0D0C3]">Payment Rails</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-[#00FFA3]">
                  USDT (BEP-20 · BNB Smart Chain)
                </span>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Executive Program Summary & Purchase Card */}
          <div
            data-scroll-reveal
            className="lg:col-span-5 p-6 sm:p-7 apex-glass-card space-y-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-emerald-500/20 pb-5">
              <div className="space-y-1.5 text-left">
                <div className="text-xs sm:text-sm font-display font-bold text-[#00FFA3] uppercase tracking-wider">
                  {selectedChallenge.typeLabel}
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-[#FFFFFF]">
                  ${selectedChallenge.accountSize.toLocaleString()} Evaluation
                </h3>
                <div className="text-xs sm:text-sm text-[#B0D0C3]">
                  Instant terminal access upon Admin payment confirmation
                </div>
              </div>
              <div className="text-right shrink-0 bg-[#04120C] border border-[#00FFA3]/40 rounded-2xl px-4 py-3">
                <div className="text-xs font-display font-bold uppercase tracking-wider text-[#B0D0C3]">
                  One-Time Fee
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#00FFA3]">
                  ${selectedChallenge.priceUsd}
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-sm sm:text-base text-left">
              <div className="flex items-center gap-3 text-[#F8FAFC]">
                <span className="w-5.5 h-5.5 rounded-full bg-emerald-500/15 border border-[#00FFA3]/40 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#00FFA3]" />
                </span>
                <span>100% evaluation fee refunded with your first payout</span>
              </div>
              <div className="flex items-center gap-3 text-[#F8FAFC]">
                <span className="w-5.5 h-5.5 rounded-full bg-emerald-500/15 border border-[#00FFA3]/40 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#00FFA3]" />
                </span>
                <span>Pay securely via USDT (BEP-20 · BNB Smart Chain) with instant TxID verification</span>
              </div>
              <div className="flex items-center gap-3 text-[#F8FAFC]">
                <span className="w-5.5 h-5.5 rounded-full bg-emerald-500/15 border border-[#00FFA3]/40 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#00FFA3]" />
                </span>
                <span>Supports official Admin discount coupon codes at checkout</span>
              </div>
              <div className="flex items-center gap-3 text-[#F8FAFC]">
                <span className="w-5.5 h-5.5 rounded-full bg-emerald-500/15 border border-[#00FFA3]/40 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00FFA3]" />
                </span>
                <span>Overnight, weekend, and news event trading permitted</span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => handleBuyChallenge(selectedChallenge.id)}
                className="w-full py-4 px-6 rounded-xl apex-glow-btn text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Challenge — ${selectedChallenge.priceUsd}</span>
                <ArrowRight className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => setDetailModalChallenge(selectedChallenge)}
                className="w-full py-3.5 px-4 rounded-xl apex-secondary-btn text-sm sm:text-base cursor-pointer"
              >
                View Full Program Specification
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY TRADERS CHOOSE FUNDED APEX (3x2 ARCHITECTURAL BENTO GRID) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div data-scroll-reveal className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="apex-kicker">
            <span>WHY FUNDED APEX</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF]">
            <KineticHeading text="Built by traders, for traders" shimmerWords={['traders']} />
          </h2>
          <p className="text-base sm:text-lg text-[#B0D0C3]">
            Institutional execution infrastructure, transparent drawdown rules, and rapid global settlements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              tag: '01 · PRICING & COUPONS',
              title: 'Accessible Fees & Coupon Support',
              desc: 'Begin your evaluation from $14 on a $5K account and apply official Admin discount coupons directly at checkout.',
            },
            {
              tag: '02 · GLOBAL RAILS',
              title: 'USDT (BEP-20) Crypto Checkout',
              desc: 'Seamless international checkout and rapid activation exclusively via USDT (BEP-20 BNB Smart Chain).',
            },
            {
              tag: '03 · PROPRIETARY ENGINE',
              title: 'White-Theme Live Market Terminal',
              desc: 'Execute Market, Limit, and Stop orders directly on our live candlestick chart with real-time P&L badges and 1-click closing.',
            },
            {
              tag: '04 · TRANSPARENT GOVERNANCE',
              title: 'Zero Hidden Rules or Traps',
              desc: 'Clear static daily and maximum drawdown limits with no hidden consistency penalties or lot-size restrictions.',
            },
            {
              tag: '05 · ANALYTICS SUITE',
              title: 'Interactive Recharts Telemetry',
              desc: 'Track your equity curve, win rate, profit factor, and order confirmation status in your personalized Trader Dashboard.',
            },
            {
              tag: '06 · CAPITAL SCALING',
              title: 'Scale Allocation Up to $2,000,000',
              desc: 'Consistent funded traders qualify for quarterly capital increases up to $2M while retaining up to 95% profit split.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              data-scroll-reveal
              style={{ '--reveal-delay': `${idx * 50}ms` } as React.CSSProperties}
              className="p-6 sm:p-7 apex-glass-card space-y-3 text-left"
            >
              <div className="text-xs font-mono font-bold text-[#00FFA3] tracking-wider uppercase">
                {item.tag}
              </div>
              <h3 className="text-xl font-display font-extrabold text-[#FFFFFF]">
                {item.title}
              </h3>
              <p className="text-sm sm:text-base text-[#B0D0C3] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>



      {/* 7. FAQ ACCORDION */}
      <section id="faq" className="scroll-mt-24 max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <div data-scroll-reveal className="text-center space-y-3">
          <div className="apex-kicker">
            <span>KNOWLEDGE BASE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF]">
            <KineticHeading text="Frequently Asked Questions" shimmerWords={['Questions']} />
          </h2>
        </div>

        <div className="space-y-3.5">
          {FAQ_ITEMS.slice(0, 6).map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={item.q}
                data-scroll-reveal
                className="apex-glass-card overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
                >
                  <span className="text-base sm:text-lg font-display font-extrabold text-[#FFFFFF]">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#B0D0C3] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-[#00FFA3]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-2.5 text-sm sm:text-base text-[#B0D0C3] leading-relaxed border-t border-emerald-500/15 text-left">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. BOTTOM CTA BANNER */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div
          data-scroll-reveal="scale"
          className="relative rounded-3xl apex-glass-card p-8 sm:p-12 text-center space-y-5 overflow-hidden"
        >
          <div className="apex-kicker">
            <span>START YOUR EVALUATION</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#FFFFFF] relative z-10">
            <KineticHeading text="Your edge deserves real capital" shimmerWords={['real', 'capital']} />
          </h2>
          <p className="text-base sm:text-lg text-[#B0D0C3] max-w-xl mx-auto relative z-10">
            Start with a $5,000 evaluation account from $14 and scale up to $2,000,000 in simulated funded capital.
          </p>
          <div className="pt-2 relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => handleBuyChallenge(selectedChallenge.id)}
              className="w-full sm:w-auto px-9 py-4 rounded-full apex-glow-btn text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Get Funded Now</span>
              <ArrowRight className="w-4.5 h-4.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => navigate('terminal')}
              className="w-full sm:w-auto px-8 py-4 rounded-full apex-secondary-btn text-base sm:text-lg cursor-pointer"
            >
              Open Live Terminal
            </button>
          </div>
          <div className="pt-2 text-xs sm:text-sm text-[#B0D0C3] font-mono">
            Direct 24/7 Support:{' '}
            <a href="mailto:fundedapexsupport@gmail.com" className="text-[#00FFA3] underline">
              fundedapexsupport@gmail.com
            </a>
          </div>
        </div>
      </section>
    </main>
  );
};
