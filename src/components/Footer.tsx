import React from 'react';
import { PageRoute, usePlatform } from '../context/PlatformContext';
import { FundedApexLogo } from './FundedApexLogo';
import { ShieldCheck, Globe, Lock, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigate, pushNotification } = usePlatform();

  const handleFooterNav = (target: PageRoute) => {
    navigate(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSocialClick = (network: string, handle: string) => {
    pushNotification(
      `FUNDED APEX ${network}`,
      `Official ${network} institutional channel (${handle}) opened. Connect with verified funded traders 24/7.`,
      'info'
    );
  };

  return (
    <footer className="bg-[#050807]/75 backdrop-blur-xl border-t border-[#28D6B0]/18 text-[#F4F8F6] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative z-10 select-none font-sans">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand & Clean Geometric Typography Showcase */}
        <div className="lg:col-span-2 space-y-6">
          <button
            type="button"
            onClick={() => handleFooterNav('home')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <FundedApexLogo size="md" />
          </button>

          <div className="space-y-2 max-w-md">
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.035em] leading-[1.15] text-[#F4F8F6]">
              Trade our capital.{' '}
              <span className="text-[#28D6B0]">Keep up to 95%.</span>
            </h3>
            <p className="text-sm sm:text-[15px] text-[#A5B5AE] font-normal leading-relaxed">
              Prove your skill in one challenge and get a funded account up to $200K — no time limits, transparent rules, and instant Aqua-STP execution.
            </p>
          </div>

          {/* Clean Geometric Metrics Row (Matching Uploaded Typography Reference) */}
          <div className="grid grid-cols-3 gap-4 max-w-md pt-1">
            <div className="p-3.5 rounded-[18px] bg-[#0C1411]/90 border border-[#28D6B0]/16">
              <div className="font-display text-xl sm:text-2xl font-extrabold text-[#F4F8F6] tracking-[-0.03em] tabular-nums">
                24h
              </div>
              <div className="text-xs text-[#8B9A92] font-medium mt-0.5">Avg. payout</div>
            </div>
            <div className="p-3.5 rounded-[18px] bg-[#0C1411]/90 border border-[#28D6B0]/16">
              <div className="font-display text-xl sm:text-2xl font-extrabold text-[#F4F8F6] tracking-[-0.03em] tabular-nums">
                38K+
              </div>
              <div className="text-xs text-[#8B9A92] font-medium mt-0.5">Traders</div>
            </div>
            <div className="p-3.5 rounded-[18px] bg-[#0C1411]/90 border border-[#28D6B0]/16">
              <div className="font-display text-xl sm:text-2xl font-extrabold text-[#28D6B0] tracking-[-0.03em] tabular-nums">
                $4.2M+
              </div>
              <div className="text-xs text-[#8B9A92] font-medium mt-0.5">Total Rewards</div>
            </div>
          </div>

          {/* Institutional Trust Pillars */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#A5B5AE] font-medium pt-1">
            <span className="inline-flex items-center gap-1.5 text-[#28D6B0]">
              <ShieldCheck className="w-4 h-4" />
              <span>95% Profit Split</span>
            </span>
            <span aria-hidden="true" className="text-[#8B9A92]">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-[#28D6B0]" />
              <span>In-House Live Terminal</span>
            </span>
            <span aria-hidden="true" className="text-[#8B9A92]">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#28D6B0]" />
              <span>150+ Countries</span>
            </span>
          </div>

          {/* Official Community Channels */}
          <div className="pt-1 space-y-2.5">
            <div className="text-xs font-semibold text-[#8B9A92]">
              Global Trader Community
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                  className="px-4 py-2 rounded-[14px] bg-[#0C1411] hover:bg-[#28D6B0] hover:text-[#04100C] border border-[#28D6B0]/20 text-xs font-semibold text-[#F4F8F6] transition-all cursor-pointer"
                >
                  {soc.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column 1: Evaluation Programs */}
        <div className="space-y-4">
          <h4 className="text-base font-display font-bold text-[#F4F8F6] tracking-[-0.02em] border-b border-[#28D6B0]/15 pb-3">
            Challenge Programs
          </h4>
          <ul className="space-y-2.5">
            {[
              { label: 'Challenge Programs', target: 'challenges' as PageRoute },
              { label: 'Account Sizes ($5K – $200K)', target: 'account-sizes' as PageRoute },
              { label: 'How It Works', target: 'how-it-works' as PageRoute },
              { label: 'Trading Rules & Objectives', target: 'trading-rules' as PageRoute },
              { label: 'In-House Trading Terminal', target: 'terminal' as PageRoute },
            ].map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={() => handleFooterNav(link.target)}
                  className="text-sm font-medium text-[#A5B5AE] hover:text-[#28D6B0] transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: Platform & Community */}
        <div className="space-y-4">
          <h4 className="text-base font-display font-bold text-[#F4F8F6] tracking-[-0.02em] border-b border-[#28D6B0]/15 pb-3">
            Platform &amp; Rewards
          </h4>
          <ul className="space-y-2.5">
            {[
              { label: 'About FUNDED APEX', target: 'about' as PageRoute },
              { label: 'Verified Payouts Registry', target: 'payouts' as PageRoute },
              { label: 'Trader Leaderboard', target: 'leaderboard' as PageRoute },
              { label: 'Trader Rewards & Spin', target: 'free-spin' as PageRoute },
              { label: 'Frequently Asked Questions', target: 'faq' as PageRoute },
            ].map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={() => handleFooterNav(link.target)}
                  className="text-sm font-medium text-[#A5B5AE] hover:text-[#28D6B0] transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Legal & Governance */}
        <div className="space-y-4">
          <h4 className="text-base font-display font-bold text-[#F4F8F6] tracking-[-0.02em] border-b border-[#28D6B0]/15 pb-3">
            Governance &amp; Legal
          </h4>
          <ul className="space-y-2.5">
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
                  className="text-sm font-medium text-[#A5B5AE] hover:text-[#28D6B0] transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Institutional Risk Disclaimer */}
      <div className="max-w-[1440px] mx-auto mt-12 pt-8 border-t border-white/10 space-y-5">
        <div className="p-5 rounded-[20px] bg-[#090F0D]/90 border border-[#28D6B0]/12 text-[13px] text-[#8B9A92] leading-relaxed">
          <strong className="text-[#F4F8F6] font-semibold">Institutional Simulation &amp; Risk Disclosure:</strong> All content published and distributed by FUNDED APEX Institutional Simulation Ltd. and its affiliates is to be treated as general information only. All trading accounts provided to clients are simulated evaluation or funded simulation accounts with virtual capital quoting live institutional market feeds. Nothing on this platform constitutes investment advice or an invitation to trade real financial instruments.
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-medium text-[#8B9A92]">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#28D6B0]" />
            <span>
              &copy; {new Date().getFullYear()} <strong className="text-[#F4F8F6]">FUNDED APEX</strong> Institutional Simulation Ltd. All rights reserved.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" onClick={() => handleFooterNav('about')} className="hover:text-[#28D6B0] transition-colors cursor-pointer">
              About
            </button>
            <button type="button" onClick={() => handleFooterNav('terms')} className="hover:text-[#28D6B0] transition-colors cursor-pointer">
              Terms
            </button>
            <button type="button" onClick={() => handleFooterNav('privacy')} className="hover:text-[#28D6B0] transition-colors cursor-pointer">
              Privacy
            </button>
            <button type="button" onClick={() => handleFooterNav('refund-policy')} className="hover:text-[#28D6B0] transition-colors cursor-pointer">
              Refund Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
