import React, { useState } from 'react';
import { PageRoute, usePlatform } from '../context/PlatformContext';
import { FundedApexLogo } from './FundedApexLogo';
import {
  Terminal,
  Shield,
  LogOut,
  UserCheck,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react';

/**
 * Institutional Aqua-Green & Abyssal Obsidian Navbar for FUNDED APEX
 * - Features the sculpted 3-line menu across all viewports with stylish luxury typography:
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

          {/* Right: Clean Client Area + Get Funded + 3-Line Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => handleNav(user ? 'dashboard' : 'login')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#081C23] hover:bg-[#0D2832] border border-[#00E5B0]/40 hover:border-[#38F8D2] text-[12.5px] font-sans font-semibold text-[#F4FBFA] hover:text-[#38F8D2] transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#00E5B0]" />
              <UserCheck className="w-3.5 h-3.5 text-[#00E5B0]" />
              <span>Client Area</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('challenges', 'challenges-matrix')}
              className="px-3.5 py-2 sm:px-4.5 sm:py-2 rounded-full apex-glow-btn text-[12.5px] sm:text-[13px] font-sans font-bold leading-none cursor-pointer"
            >
              Get Funded
            </button>

            {/* Clean 3-Line Menu Button */}
            <button
              type="button"
              data-testid="mobile-menu-toggle"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={`group relative h-10 px-3.5 rounded-full bg-[#081C23] border ${
                mobileMenuOpen
                  ? 'border-[#38F8D2]'
                  : 'border-[#00E5B0]/35 hover:border-[#38F8D2]'
              } text-white flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0`}
            >
              <div className="relative w-5 h-3.5 flex flex-col justify-between items-center">
                <span
                  className={`w-5 h-[2px] rounded-full bg-white transition-transform duration-200 ease-out ${
                    mobileMenuOpen ? 'translate-y-[6px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`w-5 h-[2px] rounded-full bg-[#00E5B0] transition-opacity duration-150 ease-out ${
                    mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`w-5 h-[2px] rounded-full bg-white transition-transform duration-200 ease-out ${
                    mobileMenuOpen ? '-translate-y-[6px] -rotate-45' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Simple, Clean, Fast 3-Line Navigation Drawer */}
      <div
        data-testid="three-line-drawer"
        aria-hidden={!mobileMenuOpen}
        className={`overflow-hidden transition-all duration-200 ease-out ${
          mobileMenuOpen
            ? 'max-h-[680px] opacity-100 translate-y-0 pointer-events-auto pb-4'
            : 'max-h-0 opacity-0 -translate-y-1.5 pointer-events-none pb-0'
        }`}
      >
        <div className="max-w-md mx-auto px-2.5 sm:px-4 pt-2">
          <div className="rounded-[24px] bg-[#061318] border border-[#00E5B0]/30 px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.92)]">
            <nav className="flex flex-col space-y-1" aria-label="Primary 3-Line Navigation">
              {/* 1. MODELS */}
              <div>
                <div className="w-full flex items-center justify-between py-2 px-3 rounded-[12px] hover:bg-[#0B2028] transition-colors">
                  <button
                    type="button"
                    onClick={() => handleNav('challenges', 'challenges-matrix')}
                    className="flex-1 text-left text-[15px] font-sans font-semibold text-white hover:text-[#00E5B0] transition-colors cursor-pointer"
                  >
                    Models
                  </button>
                  <button
                    type="button"
                    aria-label="Toggle Models list"
                    onClick={() => setModelsExpanded((prev) => !prev)}
                    className="p-1 rounded-full text-[#00E5B0] hover:bg-[#0F2A35] transition-colors cursor-pointer"
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-[#00E5B0] transition-transform duration-200 ease-out ${
                        modelsExpanded ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                </div>

                <div
                  className={`grid transition-all duration-200 ease-out ${
                    modelsExpanded
                      ? 'grid-rows-[1fr] opacity-100 mt-1'
                      : 'grid-rows-[0fr] opacity-0 mt-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pl-3 pr-1 py-1 space-y-1 border-l border-[#00E5B0]/30 ml-3">
                      {modelSubItems.map((sub) => (
                        <button
                          key={sub.label}
                          type="button"
                          onClick={() => handleNav(sub.target, sub.sectionId)}
                          className="w-full px-3 py-1.5 rounded-[10px] hover:bg-[#0B2028] text-left flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                        >
                          <span className="text-[13px] font-sans font-medium text-[#D6EBE7] group-hover:text-[#00E5B0]">
                            {sub.label}
                          </span>
                          <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-[#081920] border border-[#00E5B0]/25 text-[#38F8D2]">
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
                className={`w-full px-3 py-2 rounded-[12px] text-left text-[15px] font-sans font-semibold transition-colors cursor-pointer ${
                  route === 'leaderboard'
                    ? 'bg-[#0B2028] text-[#00E5B0]'
                    : 'text-white hover:bg-[#0B2028] hover:text-[#00E5B0]'
                }`}
              >
                Free Trading Competition
              </button>

              {/* 3. REWARD */}
              <button
                type="button"
                onClick={() => handleNav('free-spin')}
                className={`w-full px-3 py-2 rounded-[12px] text-left text-[15px] font-sans font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  route === 'free-spin'
                    ? 'bg-[#0B2028] text-[#00E5B0]'
                    : 'text-white hover:bg-[#0B2028] hover:text-[#00E5B0]'
                }`}
              >
                <span>Reward</span>
                <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-[#081920] border border-[#00E5B0]/30 text-[#00E5B0]">
                  Coming Soon
                </span>
              </button>

              {/* 4. AFFILIATE PROGRAM */}
              <button
                type="button"
                onClick={() => handleNav('referral')}
                className={`w-full px-3 py-2 rounded-[12px] text-left text-[15px] font-sans font-semibold transition-colors cursor-pointer ${
                  route === 'referral'
                    ? 'bg-[#0B2028] text-[#00E5B0]'
                    : 'text-white hover:bg-[#0B2028] hover:text-[#00E5B0]'
                }`}
              >
                Affiliate Program
              </button>

              {/* 5. FAQS */}
              <button
                type="button"
                onClick={() => handleNav('faq')}
                className={`w-full px-3 py-2 rounded-[12px] text-left text-[15px] font-sans font-semibold transition-colors cursor-pointer ${
                  route === 'faq'
                    ? 'bg-[#0B2028] text-[#00E5B0]'
                    : 'text-white hover:bg-[#0B2028] hover:text-[#00E5B0]'
                }`}
              >
                FAQs
              </button>

              {/* Optional Admin Link if logged in as Admin */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNav('admin')}
                  className="w-full px-3 py-2 rounded-[12px] text-left text-[15px] font-sans font-semibold text-[#00E5B0] hover:bg-[#0B2028] flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Panel</span>
                </button>
              )}
            </nav>

            {/* Bottom Actions: Client Area & Terminal */}
            <div className="mt-3.5 pt-3 border-t border-[#00E5B0]/15 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => handleNav(user ? 'dashboard' : 'login')}
                className="flex-1 py-2.5 px-4 rounded-full apex-glow-btn text-[13px] font-sans font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Client Area</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-sans font-semibold text-[#A3BDB8]">
                <button
                  type="button"
                  onClick={() => handleNav('terminal')}
                  className="py-2 px-3.5 rounded-full bg-[#091E26] border border-[#00E5B0]/30 hover:border-[#38F8D2] text-[#38F8D2] inline-flex items-center gap-1.5 cursor-pointer"
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
                    className="py-2 px-3 rounded-full bg-[#091920] border border-red-500/35 text-red-400 hover:bg-red-500/15 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNav('register')}
                    className="py-2 px-3.5 rounded-full bg-[#091E26] border border-[#00E5B0]/25 hover:border-[#38F8D2] text-white hover:text-[#38F8D2] cursor-pointer whitespace-nowrap"
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
