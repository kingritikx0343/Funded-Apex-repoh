import React, { useState } from 'react';

interface FundedApexLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textVariant?: 'horizontal' | 'stacked';
}

/**
 * Official FUNDED APEX Brand Logo:
 * Featuring the official metallic crown & cyan candlestick circular emblem
 * from the user's authentic brand image with liquid glow aura and wordmark.
 */
export const FundedApexLogo: React.FC<FundedApexLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textVariant = 'horizontal',
}) => {
  const [imgError, setImgError] = useState(false);

  const iconDimensions =
    size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
      ? 'w-12 h-12'
      : size === 'xl'
      ? 'w-16 h-16 sm:w-20 sm:h-20'
      : 'w-10 h-10';

  const textSize =
    size === 'sm'
      ? 'text-lg'
      : size === 'lg'
      ? 'text-2xl sm:text-3xl'
      : size === 'xl'
      ? 'text-3xl sm:text-4xl'
      : 'text-xl sm:text-[22px]';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none group ${className}`}>
      {/* Official Emblem Container with Liquid Glow Aura */}
      <div className={`relative ${iconDimensions} shrink-0`}>
        {/* Ambient liquid glow behind logo */}
        <div
          aria-hidden="true"
          className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#00FFA3]/40 via-[#06B6D4]/30 to-[#00FFA3]/40 blur-md opacity-75 group-hover:opacity-100 transition duration-300 pointer-events-none"
        />

        {!imgError ? (
          <img
            src="/assets/aistudio/IMG_20261108_140853_727c5a1e.png"
            alt="FUNDED APEX Emblem"
            onError={() => setImgError(true)}
            className="relative z-10 w-full h-full object-cover object-center rounded-full shadow-[0_0_20px_rgba(0,255,163,0.35)] group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(0,255,163,0.65)] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full rounded-full p-[2px] bg-gradient-to-br from-[#00FFA3] via-[#10B981] to-[#06B6D4] flex items-center justify-center relative overflow-hidden">
            <span className="text-[#00FFA3] font-black text-sm">FA</span>
          </div>
        )}
      </div>

      {/* Clean Single-Line High-Contrast Wordmark: FUNDED (White) + APEX (Aqua-Green) */}
      {showText && (
        <div
          className={`${textSize} font-display font-extrabold tracking-tight leading-none flex ${
            textVariant === 'stacked' ? 'flex-col gap-0.5' : 'items-center gap-1.5'
          }`}
        >
          <span className="text-[#FFFFFF]">FUNDED</span>
          <span className="bg-gradient-to-r from-[#00FFA3] via-[#34D399] to-[#2DD4BF] bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(0,255,163,0.35)]">
            APEX
          </span>
        </div>
      )}
    </div>
  );
};
