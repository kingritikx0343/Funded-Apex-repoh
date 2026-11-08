import React from 'react';
import { PageRoute, usePlatform } from '../context/PlatformContext';
import { FundedApexLogo } from './FundedApexLogo';

export const Footer: React.FC = () => {
  const { navigate, pushNotification } = usePlatform();

  const handleFooterNav = (target: PageRoute) => {
    navigate(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSocialClick = (network: string, handle: string) => {
    pushNotification(
      `FUNDED APEX ${network}`,
      `Official ${network} community channel (${handle}) opened. Connect with verified funded traders 24/7.`,
      'info'
    );
  };

  return (
    <footer className="bg-[#030E09] border-t-2 border-[#00FFA3]/35 text-white py-16 px-4 sm:px-6 relative z-10 shadow-[0_-12px_45px_rgba(0,0,0,0.85)] select-none">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand Column */}
        <div className="lg:col-span-2 space-y-5">
          <button
            type="button"
            onClick={() => handleFooterNav('home')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <FundedApexLogo size="sm" />
          </button>
          <p className="text-sm sm:text-base text-slate-200 max-w-md leading-relaxed font-normal">
            Demonstrate your trading edge, pass your evaluation, and manage up to $600,000 in simulated capital on the proprietary FUNDED APEX Live Trading Terminal.
          </p>

          {/* Official Support Email Card - Ultra High Visibility */}
          <div className="p-4 rounded-2xl bg-[#061C13] border-2 border-[#00FFA3]/55 space-y-2 shadow-[0_0_28px_rgba(0,255,163,0.22)]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FFA3] animate-pulse shadow-[0_0_10px_#00FFA3]" />
              <span className="text-xs font-display font-black uppercase tracking-wider text-[#00FFA3]">
                Official Trader Support
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <a
                href="mailto:support@fundedapex.com"
                className="text-sm sm:text-base font-mono font-black text-white hover:text-[#00FFA3] transition-colors underline decoration-[#00FFA3] underline-offset-4 tracking-wide"
              >
                support@fundedapex.com
              </a>
              <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-lg bg-[#00FFA3]/20 text-[#00FFA3] border border-[#00FFA3]/50 shadow-sm">
                24/7 Response
              </span>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="pt-2 space-y-3">
            <div className="text-xs font-display font-black text-[#00FFA3] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3]" />
              Official Social Media &amp; Community
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { name: 'Discord', handle: 'discord.gg/fundedapex' },
                { name: 'X (Twitter)', handle: '@FundedApex' },
                { name: 'Telegram', handle: 't.me/FundedApexOfficial' },
                { name: 'YouTube', handle: '@FundedApexTV' },
                { name: 'Instagram', handle: '@fundedapex.official' },
              ].map((soc) => (
                <button
                  key={soc.name}
                  type="button"
                  onClick={() => handleSocialClick(soc.name, soc.handle)}
                  className="px-4 py-2.5 rounded-2xl bg-[#082218] hover:bg-[#00FFA3] hover:text-[#030A07] border border-[#00FFA3]/40 text-xs sm:text-sm font-extrabold text-white transition-all cursor-pointer shadow-sm hover:shadow-[0_0_16px_rgba(0,255,163,0.45)]"
                >
                  {soc.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column 1: Trading Programs */}
        <div className="space-y-4">
          <h4 className="text-base font-display font-black text-white flex items-center gap-2 border-b border-emerald-500/30 pb-2">
            <span className="w-1.5 h-3.5 rounded-full bg-[#00FFA3]" />
            <span>Trading Programs</span>
          </h4>
          <ul className="space-y-3">
            {[
              { label: 'Trading Programs', target: 'challenges' as PageRoute },
              { label: 'Account Sizes ($5K – $200K)', target: 'account-sizes' as PageRoute },
              { label: 'How It Works', target: 'how-it-works' as PageRoute },
              { label: 'Trading Rules', target: 'trading-rules' as PageRoute },
              { label: 'Live Trading Terminal', target: 'terminal' as PageRoute },
            ].map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={() => handleFooterNav(link.target)}
                  className="text-sm sm:text-base font-semibold text-slate-100 hover:text-[#00FFA3] hover:translate-x-1 transition-all inline-flex items-center gap-1.5 cursor-pointer py-0.5"
                >
                  <span className="text-[#00FFA3] text-xs">›</span>
                  <span>{link.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: Company & Community */}
        <div className="space-y-4">
          <h4 className="text-base font-display font-black text-white flex items-center gap-2 border-b border-emerald-500/30 pb-2">
            <span className="w-1.5 h-3.5 rounded-full bg-[#00FFA3]" />
            <span>Company &amp; Community</span>
          </h4>
          <ul className="space-y-3">
            {[
              { label: 'About Us', target: 'about' as PageRoute },
              { label: 'Contact Us', target: 'contact' as PageRoute },
              { label: 'Verified Payouts', target: 'payouts' as PageRoute },
              { label: 'Leaderboard', target: 'leaderboard' as PageRoute },
              { label: 'FAQ', target: 'faq' as PageRoute },
            ].map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={() => handleFooterNav(link.target)}
                  className="text-sm sm:text-base font-semibold text-slate-100 hover:text-[#00FFA3] hover:translate-x-1 transition-all inline-flex items-center gap-1.5 cursor-pointer py-0.5"
                >
                  <span className="text-[#00FFA3] text-xs">›</span>
                  <span>{link.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Legal & Governance */}
        <div className="space-y-4">
          <h4 className="text-base font-display font-black text-white flex items-center gap-2 border-b border-emerald-500/30 pb-2">
            <span className="w-1.5 h-3.5 rounded-full bg-[#00FFA3]" />
            <span>Legal &amp; Policies</span>
          </h4>
          <ul className="space-y-3">
            {[
              { label: 'Terms and Conditions', target: 'terms' as PageRoute },
              { label: 'Privacy Policy', target: 'privacy' as PageRoute },
              { label: 'Refund Policy', target: 'refund-policy' as PageRoute },
              { label: 'Risk Disclosure', target: 'risk-disclosure' as PageRoute },
            ].map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={() => handleFooterNav(link.target)}
                  className="text-sm sm:text-base font-semibold text-slate-100 hover:text-[#00FFA3] hover:translate-x-1 transition-all inline-flex items-center gap-1.5 cursor-pointer py-0.5"
                >
                  <span className="text-[#00FFA3] text-xs">›</span>
                  <span>{link.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Quick Links with Crisp High Contrast */}
      <div className="max-w-[1440px] mx-auto mt-12 pt-8 border-t-2 border-emerald-500/25 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 text-xs sm:text-sm text-slate-300 font-medium">
        <div className="leading-relaxed">
          &copy; {new Date().getFullYear()} <strong className="text-white font-bold">FUNDED APEX Institutional Simulation Ltd.</strong> All rights reserved. All trading activities are performed in a simulated environment.
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => handleFooterNav('about')}
            className="text-white font-bold hover:text-[#00FFA3] transition-colors cursor-pointer"
          >
            About Us
          </button>
          <button
            type="button"
            onClick={() => handleFooterNav('contact')}
            className="text-white font-bold hover:text-[#00FFA3] transition-colors cursor-pointer"
          >
            Contact Us
          </button>
          <button
            type="button"
            onClick={() => handleFooterNav('terms')}
            className="text-white font-bold hover:text-[#00FFA3] transition-colors cursor-pointer"
          >
            Terms and Conditions
          </button>
          <button
            type="button"
            onClick={() => handleFooterNav('privacy')}
            className="text-white font-bold hover:text-[#00FFA3] transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => handleFooterNav('refund-policy')}
            className="text-white font-bold hover:text-[#00FFA3] transition-colors cursor-pointer"
          >
            Refund Policy
          </button>
          <a
            href="mailto:support@fundedapex.com"
            className="text-[#00FFA3] hover:text-white font-mono font-black text-sm underline underline-offset-4 decoration-[#00FFA3]/60 cursor-pointer transition-colors"
          >
            support@fundedapex.com
          </a>
        </div>
      </div>
    </footer>
  );
};
