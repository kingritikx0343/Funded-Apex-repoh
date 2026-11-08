import React, { useState, useEffect, useRef } from 'react';
import { PageRoute, usePlatform } from '../context/PlatformContext';
import { FundedApexLogo } from './FundedApexLogo';
import { Menu, X, Zap } from 'lucide-react';

/**
 * Isolated 120fps Hardware-Accelerated Top Promo Ticker
 * Matches the clean, simple typography from the reference image while keeping our #00FFA3 theme.
 */
const StarterPromoTicker: React.FC<{ onSelectPromo?: () => void }> = React.memo(({ onSelectPromo }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const firstHalfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;
    let active = true;
    let lastTime = performance.now();
    let offsetPx = 0;
    // Slow, calm, butter-smooth glide speed (28 pixels per second)
    const speedPxPerSec = 28;

    const step = (now: number) => {
      if (!active) return;
      const dt = Math.min(0.064, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const halfWidth = firstHalfRef.current?.offsetWidth || 0;
      if (halfWidth > 0 && trackRef.current) {
        offsetPx += speedPxPerSec * dt;
        if (offsetPx >= halfWidth) {
          offsetPx -= halfWidth;
        }
        trackRef.current.style.transform = `translate3d(${-offsetPx.toFixed(2)}px, 0, 0)`;
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      onClick={onSelectPromo}
      className="bg-[#00FFA3] text-[#030A07] py-2 overflow-hidden text-[13px] sm:text-[14px] font-medium tracking-normal select-none cursor-pointer"
      style={{ contain: 'layout paint' }}
    >
      <div
        ref={trackRef}
        className="apex-top-banner-marquee whitespace-nowrap flex items-center will-change-transform"
      >
        {[0, 1].map((halfIdx) => (
          <div
            key={`banner-half-${halfIdx}`}
            ref={halfIdx === 0 ? firstHalfRef : undefined}
            className="flex items-center gap-12 pr-12 shrink-0"
            aria-hidden={halfIdx === 1 ? 'true' : undefined}
          >
            {[...Array(4)].map((_, i) => (
              <div key={`banner-item-${halfIdx}-${i}`} className="flex items-center gap-2 shrink-0">
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                <span className="font-normal text-[#030A07]">
                  $5K Starter Challenge only on $10 — Code: <span className="font-semibold">5K30OFF</span>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

export const Navbar: React.FC = () => {
  const { route, navigate, user, logout, openStripeCheckout } = usePlatform();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin =
    user &&
    (['admin', 'super_admin'].includes(user.role) ||
      user.email.toLowerCase() === 'kingritikx0343@gmail.com');

  const handlePromoClick = React.useCallback(() => {
    openStripeCheckout('two-step-5000', '5K30OFF');
  }, [openStripeCheckout]);

  if (route === 'dashboard') {
    return (
      <header className="sticky top-0 z-40 w-full">
        <StarterPromoTicker onSelectPromo={handlePromoClick} />
      </header>
    );
  }

  const handleNav = (target: PageRoute, sectionId?: string) => {
    setMobileMenuOpen(false);
    if (sectionId && route === 'home') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(target);
  };

  return (
    <header className="sticky top-0 z-50 w-full transition-all">
      {/* Top Ticker Announcement Banner Bar */}
      <StarterPromoTicker onSelectPromo={handlePromoClick} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-1">
        {/* Sleek Floating Pill Header Bar matching reference screenshots */}
        <div className="bg-[#06110C]/92 backdrop-blur-2xl border border-white/12 rounded-[28px] px-4 sm:px-5 h-[66px] flex items-center justify-between gap-3 shadow-[0_12px_36px_rgba(0,0,0,0.65)]">
          {/* Left: Brand Emblem */}
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 text-left group cursor-pointer shrink-0"
          >
            <div className="sm:hidden">
              <FundedApexLogo size="md" showText={false} />
            </div>
            <div className="hidden sm:block">
              <FundedApexLogo size="md" showText={true} />
            </div>
          </button>

          {/* Center Desktop Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-6 text-[14px] font-normal text-[#B0D0C3]"
          >
            <button
              type="button"
              onClick={() => handleNav('home')}
              className={`transition-colors cursor-pointer ${
                route === 'home' ? 'text-white font-medium' : 'hover:text-white'
              }`}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => handleNav('challenges', 'challenges-matrix')}
              className={`transition-colors cursor-pointer ${
                route === 'challenges' || route === 'account-sizes'
                  ? 'text-white font-medium'
                  : 'hover:text-white'
              }`}
            >
              Challenges
            </button>

            <button
              type="button"
              onClick={() => handleNav(user ? 'dashboard' : 'login')}
              className={`transition-colors cursor-pointer ${
                (route as string) === 'dashboard' ? 'text-white font-medium' : 'hover:text-white'
              }`}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => handleNav('faq', 'faq')}
              className={`transition-colors cursor-pointer ${
                route === 'faq' ? 'text-white font-medium' : 'hover:text-white'
              }`}
            >
              FAQ
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNav('admin')}
                className={`transition-colors cursor-pointer ${
                  route === 'admin' ? 'text-[#00FFA3] font-semibold' : 'text-[#00FFA3] hover:text-white'
                }`}
              >
                Admin
              </button>
            )}
          </nav>

          {/* Right Actions: Buy Challenge Pill + Square-Rounded Menu Button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleNav('challenges', 'challenges-matrix')}
              className="px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-full bg-[#00FFA3] hover:bg-[#10F5A0] text-[#030A07] text-[14px] sm:text-[15px] font-medium leading-none shadow-[0_0_24px_rgba(0,255,163,0.32)] cursor-pointer transition-all"
            >
              Buy Challenge
            </button>

            <button
              type="button"
              data-testid="mobile-menu-toggle"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-11 h-11 rounded-2xl bg-[#040B08] border border-white/12 text-white hover:border-white/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 stroke-[1.8]" /> : <Menu className="w-5 h-5 stroke-[1.8]" />}
            </button>
          </div>
        </div>

        {/* Clean Rounded Dropdown Menu Card matching Screenshot_20261106_235240.jpg */}
        {mobileMenuOpen && (
          <div
            data-testid="three-line-drawer"
            className="mt-2.5 bg-[#06110C]/98 backdrop-blur-2xl border border-white/12 rounded-[28px] px-7 py-6 shadow-[0_24px_64px_rgba(0,0,0,0.9)] z-50 relative apex-scale-in"
          >
            <nav className="flex flex-col space-y-1" aria-label="In-page dropdown menu">
              <button
                type="button"
                onClick={() => handleNav('home')}
                className="w-full py-3.5 text-left text-[18px] font-normal text-white hover:text-[#00FFA3] transition-colors cursor-pointer"
              >
                Home
              </button>

              <button
                type="button"
                onClick={() => handleNav('challenges', 'challenges-matrix')}
                className="w-full py-3.5 text-left text-[18px] font-normal text-white hover:text-[#00FFA3] transition-colors cursor-pointer"
              >
                Challenges
              </button>

              <button
                type="button"
                onClick={() => handleNav(user ? 'dashboard' : 'login')}
                className="w-full py-3.5 text-left text-[18px] font-normal text-white hover:text-[#00FFA3] transition-colors cursor-pointer"
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => handleNav('faq', 'faq')}
                className="w-full py-3.5 text-left text-[18px] font-normal text-white hover:text-[#00FFA3] transition-colors cursor-pointer"
              >
                FAQ
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNav('admin')}
                  className="w-full py-3.5 text-left text-[18px] font-medium text-[#00FFA3] hover:text-white transition-colors cursor-pointer"
                >
                  Admin Panel
                </button>
              )}

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    navigate('login');
                  }}
                  className="w-full py-3.5 text-left text-[18px] font-normal text-white hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Log out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNav('login')}
                  className="w-full py-3.5 text-left text-[18px] font-normal text-white hover:text-[#00FFA3] transition-colors cursor-pointer"
                >
                  Log in
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
