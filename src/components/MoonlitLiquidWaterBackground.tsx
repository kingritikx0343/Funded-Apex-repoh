import React, { useMemo } from 'react';

interface StarPoint {
  id: number;
  top: number;
  left: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  color?: string;
}

export const MoonlitLiquidWaterBackground: React.FC = React.memo(() => {
  // Streamlined, GPU-friendly celestial star field for 60fps zero-jank scrolling
  const stars = useMemo<StarPoint[]>(() => {
    return [
      { id: 1, top: 7, left: 18, size: 3.2, opacity: 0.9, duration: 3.8, delay: 0.2, color: '#FFFFFF' },
      { id: 2, top: 12, left: 34, size: 3.6, opacity: 0.95, duration: 4.5, delay: 1.1, color: '#E0FDF4' },
      { id: 3, top: 5, left: 48, size: 3.4, opacity: 0.9, duration: 4.0, delay: 0.5, color: '#00FFA3' },
      { id: 4, top: 14, left: 62, size: 3.8, opacity: 0.95, duration: 4.8, delay: 1.6, color: '#FFFFFF' },
      { id: 5, top: 8, left: 78, size: 3.4, opacity: 0.9, duration: 3.9, delay: 0.3, color: '#38BDF8' },
      { id: 6, top: 18, left: 91, size: 3.0, opacity: 0.85, duration: 4.2, delay: 2.1, color: '#A7F3D0' },
      { id: 7, top: 22, left: 14, size: 3.4, opacity: 0.9, duration: 4.1, delay: 0.8, color: '#FEF08A' },
      { id: 8, top: 26, left: 28, size: 3.0, opacity: 0.85, duration: 3.7, delay: 1.7, color: '#FFFFFF' },
      { id: 9, top: 21, left: 45, size: 3.5, opacity: 0.92, duration: 4.6, delay: 0.4, color: '#00FFA3' },
      { id: 10, top: 28, left: 68, size: 3.2, opacity: 0.88, duration: 4.0, delay: 1.9, color: '#E0FDF4' },
      { id: 11, top: 32, left: 83, size: 3.6, opacity: 0.92, duration: 4.4, delay: 0.7, color: '#FFFFFF' },
      { id: 12, top: 36, left: 95, size: 3.0, opacity: 0.85, duration: 3.9, delay: 1.3, color: '#38BDF8' },
      { id: 13, top: 15, left: 8, size: 2.2, opacity: 0.75, duration: 4.3, delay: 0.6 },
      { id: 14, top: 30, left: 21, size: 2.2, opacity: 0.75, duration: 4.1, delay: 1.4 },
      { id: 15, top: 34, left: 54, size: 2.4, opacity: 0.78, duration: 4.4, delay: 0.9 },
      { id: 16, top: 41, left: 74, size: 2.2, opacity: 0.75, duration: 4.2, delay: 1.8 },
    ];
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
      style={{
        contain: 'strict',
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* 1. STATIC GPU-ACCELERATED DEEP ABYSSAL WATER & LUNAR DIFFUSION */}
      <div
        className="absolute inset-0 bg-[#030A07]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 95% 55% at 50% -8%, rgba(0, 255, 163, 0.20) 0%, rgba(6, 182, 212, 0.11) 42%, transparent 78%),
            radial-gradient(ellipse 65% 45% at 82% 16%, rgba(224, 255, 244, 0.09) 0%, rgba(0, 255, 163, 0.10) 35%, transparent 72%),
            radial-gradient(ellipse 65% 50% at 18% 68%, rgba(16, 185, 129, 0.10) 0%, rgba(6, 182, 212, 0.07) 45%, transparent 72%),
            linear-gradient(180deg, #020805 0%, #04140D 42%, #030F0A 72%, #020704 100%)
          `,
        }}
      />

      {/* 2. CELESTIAL MOON ORB (Hardware-composited radial gradients without heavy CSS blur filters) */}
      <div className="absolute top-6 sm:top-10 right-6 sm:right-16 md:right-28 lg:right-36 w-32 h-32 sm:w-40 sm:h-40">
        <div
          className="absolute -inset-12 sm:-inset-16 rounded-full opacity-80"
          style={{
            background:
              'radial-gradient(circle, rgba(0, 255, 163, 0.22) 0%, rgba(56, 189, 248, 0.10) 45%, transparent 72%)',
          }}
        />
        <div className="relative w-full h-full rounded-full overflow-hidden shadow-[0_0_36px_rgba(0,255,163,0.28)]">
          <div
            className="w-full h-full rounded-full"
            style={{
              background:
                'radial-gradient(circle at 38% 36%, #FFFFFF 0%, #F0FDF4 30%, #D1FAE5 55%, #6EE7B7 80%, #059669 100%)',
            }}
          />
          <div
            className="absolute -top-1 -right-1 w-[92%] h-[92%] rounded-full opacity-90"
            style={{
              background:
                'radial-gradient(circle at 62% 60%, #030D08 0%, #04150E 65%, rgba(4, 21, 14, 0.4) 88%, transparent 100%)',
            }}
          />
          <div className="absolute inset-0 rounded-full border border-white/50" />
        </div>
      </div>

      {/* 3. LIGHTWEIGHT CELESTIAL STARS */}
      <div className="absolute inset-0">
        {stars.map((star) => {
          const starColor = star.color || '#FFFFFF';
          return (
            <div
              key={`star-${star.id}`}
              className="absolute rounded-full apex-star-twinkle"
              style={{
                top: `${star.top}%`,
                left: `${star.left}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                backgroundColor: starColor,
                boxShadow: `0 0 6px ${starColor}`,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* 4. SOFT HORIZON WATER GLOW */}
      <div
        className="absolute inset-x-0 bottom-0 h-44 pointer-events-none opacity-55"
        style={{
          background:
            'radial-gradient(ellipse 85% 65% at 50% 100%, rgba(0, 255, 163, 0.14) 0%, rgba(6, 182, 212, 0.06) 50%, transparent 80%)',
        }}
      />
    </div>
  );
});
