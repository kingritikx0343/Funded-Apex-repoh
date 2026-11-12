import React, { useState } from 'react';
import { PageRoute, usePlatform } from '../context/PlatformContext';
import { FundedApexLogo } from './FundedApexLogo';
import {
  Menu,
  X,
  Terminal,
  Shield,
  LogOut,
  UserCheck,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react';

/**
 * Institutional Aqua-Green & Abyssal Obsidian Navbar for FUNDED APEX
 * - Features the rounded floating dropdown card matching the uploaded reference (`IMG_20261112_083916_df653839.jpg`)
 *   adapted to the Aqua-Green water-glass color theme with silky-smooth spring open/close animation:
 *   MODELS (expandable chevron) | FREE TRADING COMPETITION | REWARD | AFFILIATE PROGRAM | FAQS | [ CLIENT AREA ]
 */
export const Navbar: React.FC = () => {
  const { route, navigate, user, logout, openStripeCheckout } = usePlatform();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modelsExpanded, setModelsExpanded] = useState(false);

  const isAdmin =
    user &&
    (['admin', 'super_admin'].includes(user.role) ||
      user.email.toLowerCase() === 'kingritikx0343@gmail.com');

  const handlePromoClick = React.useCallback(() => {
    openStripeCheckout('two-step-5000', '5K30OFF');
  }, [openStripeCheckout]);

  const handleNav = (target: PageRoute, sectionId?: string) => {
    setMobileMenuOpen(false);
    setModelsExpanded(false);
    if (sectionId && route === 'home') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(target);
  };

  // Dashboard and Admin views render their own dedicated top bars
  if (route === 'dashboard' || route === 'admin') {
    return null;
  }

  const desktopNavItems: { label: string; target: PageRoute; sectionId?: string }[] = [
    { label: 'Models', target: 'challenges', sectionId: 'challenges-matrix' },
    { label: 'Account Sizes', target: 'account-sizes', sectionId: 'account-sizes-section' },
    { label: 'Trading Rules', target: 'trading-rules', sectionId: 'trading-rules-section' },
    { label: 'Free Trading Competition', target: 'leaderboard' },
    { label: 'Reward', target: 'free-spin' },
    { label: 'Affiliate Program', target: 'referral' },
    { label: 'FAQs', target: 'faq' },
  ];

  const modelSubItems: { label: string; badge: string; target: PageRoute; sectionId?: string }[] = [
    { label: '2-Step Classic Evaluation', badge: '8% / 5% Target', target: 'challenges', sectionId: 'challenges-matrix' },
    { label: '1-Step Pro Evaluation', badge: '10% Target', target: 'challenges', sectionId: 'challenges-matrix' },
    { label: 'Instant Funded Account', badge: 'Zero Evaluation', target: 'challenges', sectionId: 'challenges-matrix' },
    { label: '3-Step Institutional', badge: 'Lowest Fee', target: 'challenges', sectionId: 'challenges-matrix' },
    { label: 'Account Sizes ($3K – $200K)', badge: 'All Tiers', target: 'account-sizes', sectionId: 'account-sizes-section' },
    { label: 'Trading Rules & Objectives', badge: 'Up to 95% Split', target: 'trading-rules', sectionId: 'trading-rules-section' },
    { label: 'Live Trading Terminal', badge: 'XAUUSD & Forex', target: 'terminal' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full transition-all pointer-events-none">
      {/* Top Promotion Banner — Full-Width Rectangular (No Round Corners) & Vibrant Green */}
      <div
        onClick={handlePromoClick}
        className="w-full rounded-none bg-gradient-to-r from-[#00C853] via-[#00E5B0] to-[#00B894] border-b border-[#02241A]/35 py-1.5 px-4 overflow-hidden whitespace-nowrap cursor-pointer hover:brightness-105 shadow-[0_6px_20px_rgba(0,229,176,0.28)] transition-all pointer-events-auto"
      >
        <div className="apex-marquee-track items-center gap-10 text-[11.5px] sm:text-[12px] font-bold text-[#021710]">
          <div className="flex items-center gap-6 shrink-0">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#021710] animate-pulse" />
              <span>
                STARTING FUNDED PROMOTION: <strong className="font-extrabold">$5,000 Starter Challenge</strong> — Get{' '}
                <strong className="font-mono underline">30% OFF</strong> with code{' '}
                <span className="font-mono font-extrabold text-[#38F8D2] px-2 py-0.5 rounded-[4px] bg-[#031B14]">
                  5K30OFF
                </span>
              </span>
            </span>
            <span className="text-[#021710]/50">•</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#021710]" />
              <span>PAY INSTANTLY WITH BNB &amp; USDT (BEP-20 / TRC-20) · PAYOUTS EVERY 14 DAYS</span>
            </span>
            <span className="text-[#021710]/50">•</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#021710]" />
              <span>SCALE UP TO $2,000,000 · UP TO 95% PROFIT SPLIT · 100% REFUND ON FIRST PAYOUT</span>
            </span>
            <span className="text-[#021710]/50">•</span>
            <span className="flex items-center gap-2">
              <span>ZERO TIME LIMITS · TRADE FOREX MAJORS &amp; XAUUSD GOLD DIRECTLY IN LIVE TERMINAL</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#021710]" />
            </span>
          </div>

          <div className="flex items-center gap-6 shrink-0" aria-hidden="true">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#021710] animate-pulse" />
              <span>
                STARTING FUNDED PROMOTION: <strong className="font-extrabold">$5,000 Starter Challenge</strong> — Get{' '}
                <strong className="font-mono underline">30% OFF</strong> with code{' '}
                <span className="font-mono font-extrabold text-[#38F8D2] px-2 py-0.5 rounded-[4px] bg-[#031B14]">
                  5K30OFF
                </span>
              </span>
            </span>
            <span className="text-[#021710]/50">•</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#021710]" />
              <span>PAY INSTANTLY WITH BNB &amp; USDT (BEP-20 / TRC-20) · PAYOUTS EVERY 14 DAYS</span>
            </span>
            <span className="text-[#021710]/50">•</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#021710]" />
              <span>SCALE UP TO $2,000,000 · UP TO 95% PROFIT SPLIT · 100% REFUND ON FIRST PAYOUT</span>
            </span>
            <span className="text-[#021710]/50">•</span>
            <span className="flex items-center gap-2">
              <span>ZERO TIME LIMITS · TRADE FOREX MAJORS &amp; XAUUSD GOLD DIRECTLY IN LIVE TERMINAL</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#021710]" />
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto pt-1.5 sm:pt-2 px-2.5 sm:px-5 lg:px-8 pointer-events-auto">
        {/* Main Rounded Floating Capsule Navigation Bar */}
        <div className="rounded-[28px] sm:rounded-full bg-[#051015]/92 backdrop-blur-2xl border border-[#00E5B0]/28 px-4 sm:px-6 h-[60px] sm:h-[64px] flex items-center justify-between gap-3 shadow-[0_18px_46px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(56,248,210,0.18)] transition-all duration-300">
          {/* Left: Unframed White Sticker FUNDED APEX Logo inside the Rounded Top Bar */}
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 text-left cursor-pointer shrink-0 py-1 transition-transform duration-200 hover:scale-[1.02]"
          >
            <FundedApexLogo size="md" showText={true} />
          </button>

          {/* Center: Primary Desktop Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden xl:flex items-center gap-1 text-[13px] font-semibold"
          >
            {desktopNavItems.map((item) => {
              const isActive = route === item.target;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNav(item.target, item.sectionId)}
                  className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                    isActive
                      ? 'text-[#00E5B0] bg-[#08161C] border border-[#00E5B0]/30 font-bold'
                      : 'text-[#F4FBFA] hover:text-[#00E5B0] hover:bg-[#08161C]/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNav('admin')}
                className="px-3 py-1.5 rounded-full text-[#00E5B0] hover:bg-[#08161C] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Right: Terminal + Compact Client Area + Smooth Rounded Hamburger Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleNav('terminal')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#071419] hover:bg-[#0C2129] border border-[#00E5B0]/25 text-[12px] font-semibold text-[#A3BDB8] hover:text-[#00E5B0] transition-all cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-[#00E5B0]" />
              <span>Terminal</span>
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => handleNav('dashboard')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#071419] hover:bg-[#0C2129] border border-[#00E5B0]/30 text-[12px] font-bold text-white hover:text-[#00E5B0] transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#00E5B0]" />
                <span>Client Area</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNav('login')}
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-[#071419]/80 border border-[#00E5B0]/25 text-[12px] font-semibold text-white hover:text-[#00E5B0] hover:border-[#00E5B0]/50 transition-all cursor-pointer"
              >
                Client Area
              </button>
            )}

            <button
              type="button"
              onClick={() => handleNav('challenges', 'challenges-matrix')}
              className="px-3.5 py-2 sm:px-4 sm:py-2 rounded-full apex-glow-btn text-[12px] sm:text-[13px] leading-none cursor-pointer"
            >
              Get Funded
            </button>

            <button
              type="button"
              data-testid="mobile-menu-toggle"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="xl:hidden w-9 h-9 rounded-full bg-[#071419] border border-[#00E5B0]/28 text-white hover:border-[#00E5B0]/60 hover:text-[#00E5B0] flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
            >
              <div className="relative w-4 h-4 flex items-center justify-center">
                <Menu
                  className={`w-4 h-4 absolute transition-all duration-250 ${
                    mobileMenuOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
                  }`}
                />
                <X
                  className={`w-4 h-4 absolute transition-all duration-250 ${
                    mobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Smoothly Animated Rounded Floating Card Menu */}
      <div
        data-testid="three-line-drawer"
        aria-hidden={!mobileMenuOpen}
        className={`xl:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileMenuOpen
            ? 'max-h-[760px] opacity-100 translate-y-0 pointer-events-auto pb-4'
            : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none pb-0'
        }`}
      >
        <div className="max-w-md mx-auto px-2.5 sm:px-4 pt-2">
          <div className="rounded-[28px] bg-[#071318]/96 backdrop-blur-2xl border border-[#00E5B0]/28 px-5 sm:px-6 py-5 shadow-[0_28px_72px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(56,248,210,0.16)]">
            <nav className="flex flex-col space-y-3.5" aria-label="Mobile Navigation">
              {/* 1. MODELS (Clicking MODELS directly opens Challenges; clicking chevron toggles sub-items) */}
              <div>
                <div className="w-full flex items-center justify-between py-1">
                  <button
                    type="button"
                    onClick={() => handleNav('challenges', 'challenges-matrix')}
                    className="flex-1 text-left text-[15px] sm:text-[16px] font-display font-bold tracking-[0.02em] text-[#F4FBFA] hover:text-[#00E5B0] transition-colors cursor-pointer"
                  >
                    MODELS
                  </button>
                  <button
                    type="button"
                    aria-label="Toggle Models list"
                    onClick={() => setModelsExpanded((prev) => !prev)}
                    className="p-1 rounded-full hover:bg-[#0D222B] text-[#00E5B0] transition-colors cursor-pointer"
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-[#00E5B0] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        modelsExpanded ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                </div>

                <div
                  className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    modelsExpanded
                      ? 'grid-rows-[1fr] opacity-100 mt-2'
                      : 'grid-rows-[0fr] opacity-0 mt-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pl-3 pr-1 py-1.5 space-y-1 border-l-2 border-[#00E5B0]/30">
                      {modelSubItems.map((sub) => (
                        <button
                          key={sub.label}
                          type="button"
                          onClick={() => handleNav(sub.target, sub.sectionId)}
                          className="w-full px-3 py-1.5 rounded-[12px] hover:bg-[#0D222B] text-left flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                        >
                          <span className="text-[13px] font-semibold text-[#D6EBE7] group-hover:text-[#00E5B0]">
                            {sub.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#091A21] border border-[#00E5B0]/25 text-[#38F8D2]">
                            {sub.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. FREE TRADING COMPETITION */}
              <button
                type="button"
                onClick={() => handleNav('leaderboard')}
                className={`w-full text-left text-[15px] sm:text-[16px] font-display font-bold tracking-[0.02em] transition-colors cursor-pointer py-1 ${
                  route === 'leaderboard'
                    ? 'text-[#00E5B0]'
                    : 'text-[#F4FBFA] hover:text-[#00E5B0]'
                }`}
              >
                FREE TRADING COMPETITION
              </button>

              {/* 3. REWARD */}
              <button
                type="button"
                onClick={() => handleNav('free-spin')}
                className={`w-full text-left text-[15px] sm:text-[16px] font-display font-bold tracking-[0.02em] transition-colors cursor-pointer py-1 flex items-center justify-between ${
                  route === 'free-spin'
                    ? 'text-[#00E5B0]'
                    : 'text-[#F4FBFA] hover:text-[#00E5B0]'
                }`}
              >
                <span>REWARD</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#091A21] border border-[#00E5B0]/30 text-[#00E5B0]">
                  COMING SOON
                </span>
              </button>

              {/* 4. AFFILIATE PROGRAM */}
              <button
                type="button"
                onClick={() => handleNav('referral')}
                className={`w-full text-left text-[15px] sm:text-[16px] font-display font-bold tracking-[0.02em] transition-colors cursor-pointer py-1 ${
                  route === 'referral'
                    ? 'text-[#00E5B0]'
                    : 'text-[#F4FBFA] hover:text-[#00E5B0]'
                }`}
              >
                AFFILIATE PROGRAM
              </button>

              {/* 5. FAQS */}
              <button
                type="button"
                onClick={() => handleNav('faq')}
                className={`w-full text-left text-[15px] sm:text-[16px] font-display font-bold tracking-[0.02em] transition-colors cursor-pointer py-1 ${
                  route === 'faq'
                    ? 'text-[#00E5B0]'
                    : 'text-[#F4FBFA] hover:text-[#00E5B0]'
                }`}
              >
                FAQS
              </button>

              {/* Optional Admin Link if logged in as Admin */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNav('admin')}
                  className="w-full text-left text-[15px] font-display font-bold tracking-[0.02em] text-[#00E5B0] hover:text-[#38F8D2] flex items-center gap-2 py-1 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>ADMIN PANEL</span>
                </button>
              )}
            </nav>

            {/* Compact Sleek Pill Button: CLIENT AREA */}
            <div className="mt-5 pt-3 border-t border-[#00E5B0]/15 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => handleNav(user ? 'dashboard' : 'login')}
                className="p-[2px] rounded-full bg-gradient-to-r from-[#2AFADF] via-[#00E5B0] to-[#00B894] shadow-[0_8px_20px_-4px_rgba(0,229,176,0.4)] hover:brightness-105 active:scale-[0.985] transition-all cursor-pointer"
              >
                <div className="py-2 px-5 rounded-full border border-[#03120F]/35 bg-gradient-to-r from-[#18E2B8] via-[#00D4A2] to-[#00B08B] flex items-center justify-center">
                  <span className="font-display font-extrabold text-[12px] tracking-[0.04em] text-[#031612] uppercase whitespace-nowrap">
                    CLIENT AREA
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-2 text-xs font-semibold text-[#A3BDB8]">
                <button
                  type="button"
                  onClick={() => handleNav('terminal')}
                  className="py-1.5 px-3 rounded-full bg-[#091920] border border-[#00E5B0]/20 hover:border-[#00E5B0]/50 text-[#38F8D2] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Terminal</span>
                </button>

                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                      navigate('login');
                    }}
                    className="py-1.5 px-3 rounded-full bg-[#091920] border border-red-500/30 text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNav('register')}
                    className="py-1.5 px-3 rounded-full bg-[#091920] border border-white/10 hover:border-[#00E5B0]/40 text-white hover:text-[#00E5B0] cursor-pointer whitespace-nowrap"
                  >
                    Sign Up
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
