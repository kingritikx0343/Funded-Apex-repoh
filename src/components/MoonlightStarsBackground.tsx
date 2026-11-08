import React, { useMemo } from 'react';

export const MoonlightStarsBackground: React.FC = () => {
  // Generate multi-depth starfield with varying sizes, twinkle speeds, and glowing flares
  const stars = useMemo(() => {
    return Array.from({ length: 110 }).map((_, i) => ({
      id: i,
      top: `${(i * 1.05 + Math.sin(i * 2.3) * 6) % 98}%`,
      left: `${(i * 1.63 + Math.cos(i * 1.9) * 8) % 98}%`,
      size: (i % 9 === 0) ? 3.5 : (i % 4 === 0) ? 2.2 : 1.2,
      duration: (2.2 + (i % 6) * 0.9).toFixed(1),
      delay: ((i % 8) * 0.6).toFixed(1),
      opacity: (0.3 + ((i * 13) % 65) / 100).toFixed(2),
      isCrossStar: i % 8 === 0,
      glowColor: i % 3 === 0 ? 'rgba(0, 255, 163, 0.95)' : i % 5 === 0 ? 'rgba(56, 189, 248, 0.9)' : 'rgba(235, 250, 255, 0.95)',
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#020705]"
    >
      {/* 1. Deep Space Cosmic Nebular Glow & Ambient Moonlight Haze */}
      <div className="absolute -top-36 right-1/4 w-[850px] h-[850px] bg-gradient-to-b from-[#00FFA3]/18 via-[#00E5B0]/09 to-transparent rounded-full blur-[140px] opacity-80" />
      <div className="absolute top-1/4 -left-36 w-[650px] h-[650px] bg-gradient-to-r from-[#10B981]/15 via-[#00FFA3]/08 to-transparent rounded-full blur-[160px] opacity-65" />
      <div className="absolute bottom-10 right-[-10%] w-[750px] h-[750px] bg-gradient-to-tl from-[#00E5B0]/14 via-[#00FFA3]/06 to-transparent rounded-full blur-[160px] opacity-60" />

      {/* 2. MAGNIFICENT GLOWING MOON (Visible across all pages with Radiant Aura & Realistic 3D Crescent Crater Glow) */}
      <div className="absolute top-4 sm:top-8 right-4 sm:right-12 select-none pointer-events-none z-0">
        {/* Soft Lunar Light Ray Beams emanating from the Moon */}
        <div
          className="absolute -top-10 -right-10 w-96 h-96 opacity-35 blur-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(230, 255, 250, 0.45) 0%, rgba(0, 255, 163, 0.25) 45%, transparent 75%)',
          }}
        />

        {/* Deep Ambient Moonlight Radiant Halo */}
        <div
          className="absolute -inset-12 sm:-inset-20 rounded-full bg-gradient-to-br from-[#F0FDF4]/35 via-[#00FFA3]/25 to-transparent blur-[50px] sm:blur-[70px] animate-pulse"
          style={{ animationDuration: '5.5s' }}
        />

        {/* Crescent Moon Disc Body */}
        <div className="relative w-22 h-22 sm:w-32 sm:h-32 rounded-full shadow-[0_0_60px_rgba(0,255,163,0.55),0_0_110px_rgba(240,253,244,0.4)] flex items-center justify-center">
          {/* Luminous Moon Disc Base with Subtle Pearl Shimmer */}
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FFFFFF] via-[#E6FFFA] to-[#86EFAC] relative overflow-hidden border border-[#F0FDF4]/80 shadow-[inset_0_0_18px_rgba(255,255,255,0.9)]">
            {/* Crater Details */}
            <div className="absolute top-3 left-4 w-4 h-4 rounded-full bg-[#6EE7B7]/45 blur-[0.8px]" />
            <div className="absolute top-10 left-3 w-7 h-7 rounded-full bg-[#A7F3D0]/40 blur-[1.2px]" />
            <div className="absolute top-7 left-12 w-5 h-5 rounded-full bg-[#6EE7B7]/45 blur-[0.8px]" />
            <div className="absolute bottom-4 left-7 w-8 h-8 rounded-full bg-[#A7F3D0]/35 blur-[1.8px]" />
            <div className="absolute bottom-8 left-14 w-4 h-4 rounded-full bg-[#6EE7B7]/30 blur-[1px]" />

            {/* Glowing Moon Shadow to form the Sharp 3D Crescent */}
            <div className="absolute -inset-1 rounded-full bg-[#020705]/90 transform translate-x-4 sm:translate-x-6 -translate-y-2 sm:-translate-y-2.5 blur-[1.8px]" />
          </div>

          {/* Moonlight Crown Ring Flare */}
          <div className="absolute -inset-1.5 rounded-full border border-[#F0FDF4]/60 blur-[0.5px]" />
          <div className="absolute -inset-3 rounded-full border border-[#00FFA3]/30 blur-[2px]" />
        </div>
      </div>

      {/* 3. SHOOTING STARS / METEORS (Diagonal Animated Streaks) */}
      <div
        className="absolute top-14 left-1/4 w-[160px] h-[2px] bg-gradient-to-r from-transparent via-[#00FFA3] to-white rounded-full opacity-70 blur-[0.5px] apex-shooting-star"
        style={{
          ['--shoot-duration' as string]: '6.5s',
          ['--shoot-delay' as string]: '0.5s',
        }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-[130px] h-[1.8px] bg-gradient-to-r from-transparent via-[#E6FFFA] to-[#00FFA3] rounded-full opacity-60 blur-[0.5px] apex-shooting-star"
        style={{
          ['--shoot-duration' as string]: '8.2s',
          ['--shoot-delay' as string]: '3.8s',
        }}
      />
      <div
        className="absolute top-2/3 left-1/6 w-[140px] h-[1.8px] bg-gradient-to-r from-transparent via-[#38BDF8] to-white rounded-full opacity-55 blur-[0.5px] apex-shooting-star"
        style={{
          ['--shoot-duration' as string]: '9.5s',
          ['--shoot-delay' as string]: '6.2s',
        }}
      />

      {/* 4. DYNAMIC TWINKLING STARLIGHT FIELD */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full apex-star-twinkle"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: Number(star.opacity),
              backgroundColor: '#FFFFFF',
              boxShadow: `0 0 7px ${star.glowColor}, 0 0 12px rgba(255,255,255,0.9)`,
              ['--twinkle-duration' as string]: `${star.duration}s`,
              ['--twinkle-delay' as string]: `${star.delay}s`,
            }}
          >
            {/* Cross-flare Sparkle for brighter stars */}
            {star.isCrossStar && (
              <span
                className="absolute inset-0 -top-1.5 -bottom-1.5 -left-1.5 -right-1.5 block pointer-events-none opacity-90"
                style={{
                  background: `radial-gradient(circle, ${star.glowColor} 25%, transparent 75%)`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* 5. Subtle Liquid Starlight Mist on Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#020705] via-[#020705]/60 to-transparent" />
    </div>
  );
};
