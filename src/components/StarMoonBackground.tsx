import React, { useEffect, useState } from 'react';

interface Star {
  id: number;
  top: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export const StarMoonBackground: React.FC = () => {
  const [stars, setStars] = useState<Star[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 50, y: 30 });

  useEffect(() => {
    // Generate 65 deterministic star points
    const generatedStars: Star[] = Array.from({ length: 65 }, (_, i) => ({
      id: i,
      top: Math.floor(Math.random() * 95),
      left: Math.floor(Math.random() * 98),
      size: Math.random() < 0.25 ? 2.5 : Math.random() < 0.6 ? 1.5 : 1,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 5,
      opacity: 0.35 + Math.random() * 0.55,
    }));
    setStars(generatedStars);

    const handleMouseMove = (e: MouseEvent) => {
      const xPct = (e.clientX / window.innerWidth) * 100;
      const yPct = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x: xPct, y: yPct });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      {/* Dynamic Ambient Moonlight & Cosmic Emerald Reflection following cursor gently */}
      <div
        className="absolute inset-0 transition-transform duration-1000 ease-out"
        style={{
          background: `
            radial-gradient(circle 650px at ${mousePos.x}% ${mousePos.y}%, rgba(0, 255, 163, 0.08) 0%, rgba(6, 182, 212, 0.04) 45%, transparent 75%),
            radial-gradient(ellipse 90% 50% at 85% 10%, rgba(186, 230, 253, 0.12) 0%, rgba(0, 255, 163, 0.14) 35%, rgba(6, 182, 212, 0.06) 65%, transparent 85%),
            radial-gradient(ellipse 70% 45% at 15% 75%, rgba(16, 185, 129, 0.10) 0%, transparent 75%),
            linear-gradient(180deg, #030A07 0%, #05140E 45%, #030A07 100%)
          `,
        }}
      />

      {/* Celestial Moon Sphere & Glowing Crescent Light Reflection */}
      <div className="absolute top-[3%] right-[5%] sm:right-[10%] w-48 h-48 sm:w-72 sm:h-72 pointer-events-none">
        {/* Soft Moonlight Aura Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#00FFA3]/20 via-[#38BDF8]/15 to-[#F0F9FF]/25 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        
        {/* Stylized Moon Crescent & Star Light Disc */}
        <div className="absolute top-6 right-6 w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-[#F0F9FF]/40 via-[#80EEB6]/20 to-transparent p-[1px] shadow-[0_0_50px_rgba(0,255,163,0.25)] backdrop-blur-sm">
          <div className="w-full h-full rounded-full bg-[#04130D]/80 relative overflow-hidden flex items-center justify-center">
            {/* Moon Crater Details / Soft Texture */}
            <div className="absolute top-3 left-4 w-6 h-6 rounded-full bg-emerald-400/10 blur-[1px]" />
            <div className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-cyan-400/10 blur-[2px]" />
            {/* Glowing Moon Rim */}
            <div className="absolute -inset-1 rounded-full border border-emerald-400/30 bg-gradient-to-tr from-transparent via-emerald-300/20 to-sky-200/40" />
          </div>
        </div>

        {/* Ambient Moonlight Beams radiating downwards */}
        <div className="absolute top-20 right-12 w-96 h-[500px] bg-gradient-to-b from-emerald-400/10 via-cyan-400/05 to-transparent blur-2xl transform rotate-[25deg] origin-top-right pointer-events-none" />
      </div>

      {/* Twinkling Stars & Floating Celestial Dust Layer */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animation: `apexStarTwinkle ${star.duration}s ease-in-out infinite alternate`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Cosmic Shooting Star Streak Effects */}
      <div className="absolute top-[12%] left-[20%] w-40 h-[1.5px] bg-gradient-to-r from-transparent via-[#00FFA3] to-transparent transform -rotate-[35deg] opacity-70 animate-[apexShootingStar_7s_ease-in-out_infinite]" />
      <div className="absolute top-[40%] right-[30%] w-32 h-[1px] bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent transform -rotate-[35deg] opacity-60 animate-[apexShootingStar_11s_ease-in-out_infinite_3s]" />
    </div>
  );
};
