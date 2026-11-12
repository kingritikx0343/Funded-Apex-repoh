import React from 'react';

export interface FundedApexLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textVariant?: 'horizontal' | 'stacked';
  variant?: 'main' | 'compact' | 'mobile' | 'loading' | 'dashboard';
  subtitle?: string;
}

/**
 * Official FUNDED APEX White Metallic Crowned-Shield 'FA' Sticker Logo
 * - Exact match to uploaded reference: White brushed-platinum crowned shield monogram (F + A)
 * - Unframed sticker style (no surrounding box or border frame)
 * - Bold geometric all-caps white FUNDED APEX wordmark
 */
export const FundedApexLogo: React.FC<FundedApexLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textVariant = 'horizontal',
  variant = 'main',
}) => {
  const effectiveShowText =
    variant === 'compact' || variant === 'mobile' ? false : showText;

  const iconDimensions =
    size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
      ? 'w-12 h-12'
      : size === 'xl'
      ? 'w-16 h-16 sm:w-20 sm:h-20'
      : 'w-9 h-9';

  const textSize =
    size === 'sm'
      ? 'text-[15px]'
      : size === 'lg'
      ? 'text-[21px] sm:text-[24px]'
      : size === 'xl'
      ? 'text-[25px] sm:text-[30px]'
      : 'text-[17px] sm:text-[19px]';

  const uid = React.useId().replace(/:/g, '');

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none group ${
        textVariant === 'stacked' ? 'flex-col text-center gap-2' : ''
      } ${className}`}
    >
      {/* Pure Unframed White Metallic Crowned-Shield 'FA' Sticker Emblem */}
      <div
        className={`relative ${iconDimensions} shrink-0 flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-105`}
      >
        <svg
          viewBox="0 0 100 112"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full drop-shadow-[0_4px_14px_rgba(255,255,255,0.18)] ${
            variant === 'loading' ? 'animate-pulse' : ''
          }`}
          aria-label="FUNDED APEX Emblem"
        >
          <defs>
            {/* Brushed White-Platinum Left Facet Gradient */}
            <linearGradient
              id={`faWhiteMain-${uid}`}
              x1="14"
              y1="6"
              x2="84"
              y2="104"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#F1F5F9" />
              <stop offset="78%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>

            {/* Subtle Silver-White Right Bevel Shading */}
            <linearGradient
              id={`faWhiteShade-${uid}`}
              x1="50"
              y1="6"
              x2="88"
              y2="98"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="50%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
          </defs>

          {/* 1. TOP CROWN / CASTLE CREST (3 battlements + horizontal base bar) */}
          {/* Left half of crown */}
          <path
            d="M 14 21 L 32 14 L 32 23 L 41 19.5 L 41 11 L 50 6 L 50 31 L 14 31 Z"
            fill={`url(#faWhiteMain-${uid})`}
          />
          {/* Right half of crown (subtle dimensional bevel) */}
          <path
            d="M 50 6 L 59 11 L 59 19.5 L 68 23 L 68 14 L 86 21 L 86 31 L 50 31 Z"
            fill={`url(#faWhiteShade-${uid})`}
          />

          {/* 2. LEFT SHIELD PILLAR ('F' MONOGRAM) */}
          <path
            d="M 14 35.5 H 65.5 L 57.5 47 H 26.5 V 55.5 H 52 L 44 67 H 26.5 V 83.5 L 14 73.5 V 35.5 Z"
            fill={`url(#faWhiteMain-${uid})`}
          />

          {/* 3. RIGHT SHIELD & DIAGONAL ('A' MONOGRAM + BARBED SHIELD POINT) */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 70.5 35.5 H 86 V 73.5 L 74 83.5 V 66.5 L 54 71.5 L 48.5 79.5 V 106 L 32 88.5 L 38 90.5 V 80.5 L 70.5 35.5 Z M 74 44.5 L 59.5 63.5 L 74 59.5 V 44.5 Z"
            fill={`url(#faWhiteMain-${uid})`}
          />

          {/* 4. LOWER RIGHT INNER SHIELD SPEAR / BARB */}
          <path
            d="M 51.5 82.5 L 63 74.5 V 90.5 L 69 88.5 L 51.5 106 V 82.5 Z"
            fill={`url(#faWhiteShade-${uid})`}
          />
        </svg>
      </div>

      {/* Crisp Geometric White Wordmark: FUNDED APEX */}
      {effectiveShowText && (
        <div
          className={`${textSize} font-display font-black uppercase tracking-[0.04em] leading-none flex ${
            textVariant === 'stacked'
              ? 'flex-col items-center gap-0.5'
              : 'items-center gap-1.5'
          }`}
        >
          <span className="text-[#FFFFFF] drop-shadow-[0_2px_10px_rgba(255,255,255,0.12)]">
            FUNDED
          </span>
          <span className="text-[#FFFFFF] relative inline-flex items-center">
            APEX
            {variant === 'dashboard' && (
              <span className="ml-2 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest bg-[#0A181C] text-[#00E5B0] border border-[#00E5B0]/30 rounded-full">
                PRO
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};
