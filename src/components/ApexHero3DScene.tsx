import React, { useEffect, useRef, useState } from 'react';
import { Activity, ShieldCheck, TrendingUp, Layers } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

interface ApexHero3DSceneProps {
  onSelectExplore?: () => void;
}

/**
 * Hardware-Accelerated 3D Architectural Hero Showcase for FUNDED APEX
 * - Uses GPU-composited 3D perspective transforms & live market telemetry (eliminates competing second WebGL context)
 * - Displays live Gold (XAUUSD), EURUSD, and GBPUSD spot quotes directly from the platform feed
 */
export const ApexHero3DScene: React.FC<ApexHero3DSceneProps> = React.memo(({ onSelectExplore }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const inner3DRef = useRef<HTMLDivElement>(null);
  const { quotes } = usePlatform();
  const [activePairIdx, setActivePairIdx] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePairIdx((prev) => (prev + 1) % 3);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const container = cardRef.current;
    const target = inner3DRef.current;
    if (!container || !target) return;

    target.style.willChange = 'transform, opacity';
    target.style.transform = 'translate3d(0, 0, 0)';
    target.style.backfaceVisibility = 'hidden';

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isAnimating = false;

    const requestTick = () => {
      if (!isAnimating) {
        isAnimating = true;
        rafId = requestAnimationFrame(animate);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      targetX = nx * 7;
      targetY = -ny * 5;
      requestTick();
    };

    const handlePointerLeave = () => {
      targetX = 0;
      targetY = 0;
      requestTick();
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      const diff = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
      if (diff > 0.02) {
        target.style.transform = `perspective(1000px) rotateY(${currentX.toFixed(2)}deg) rotateX(${currentY.toFixed(2)}deg) scale3d(1.03, 1.03, 1)`;
        rafId = requestAnimationFrame(animate);
      } else {
        currentX = targetX;
        currentY = targetY;
        if (targetX === 0 && targetY === 0) {
          target.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1.02, 1.02, 1)';
        } else {
          target.style.transform = `perspective(1000px) rotateY(${currentX.toFixed(2)}deg) rotateX(${currentY.toFixed(2)}deg) scale3d(1.03, 1.03, 1)`;
        }
        isAnimating = false;
      }
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  const xauBid = quotes?.XAUUSD?.bid || 3038.45;
  const eurBid = quotes?.EURUSD?.bid || 1.08642;
  const gbpBid = quotes?.GBPUSD?.bid || 1.2941;

  const telemetryPairs = [
    {
      symbol: 'XAUUSD',
      name: 'Gold Spot / USD',
      price: xauBid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      change: `${(quotes?.XAUUSD?.change24hPct ?? 1.48) >= 0 ? '+' : ''}${(quotes?.XAUUSD?.change24hPct ?? 1.48).toFixed(2)}%`,
      spread: '0.16',
    },
    {
      symbol: 'EURUSD',
      name: 'Euro / US Dollar',
      price: eurBid.toFixed(5),
      change: `${(quotes?.EURUSD?.change24hPct ?? 0.64) >= 0 ? '+' : ''}${(quotes?.EURUSD?.change24hPct ?? 0.64).toFixed(2)}%`,
      spread: '0.08',
    },
    {
      symbol: 'GBPUSD',
      name: 'British Pound / USD',
      price: gbpBid.toFixed(5),
      change: `${(quotes?.GBPUSD?.change24hPct ?? 0.82) >= 0 ? '+' : ''}${(quotes?.GBPUSD?.change24hPct ?? 0.82).toFixed(2)}%`,
      spread: '0.10',
    },
  ];

  const currentPair = telemetryPairs[activePairIdx];

  return (
    <div
      ref={cardRef}
      className="relative w-full h-[420px] sm:h-[500px] lg:h-[560px] rounded-[28px] bg-[#061015]/88 border border-[#00E5B0]/28 overflow-hidden shadow-[0_28px_80px_rgba(0,0,0,0.92)] select-none"
    >
      {/* Controlled Subtle Radial Aqua-Water Backlight Behind 3D Object */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 46%, rgba(0, 229, 176, 0.18) 0%, rgba(0, 184, 148, 0.07) 40%, rgba(0, 0, 0, 0) 72%)',
        }}
      />

      {/* Architectural Technical Grid Frame inside 3D Viewport */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,229,176,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,229,176,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top Architectural Telemetry Header Bar */}
      <div className="absolute top-3.5 inset-x-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#061116]/90 border border-[#00E5B0]/28 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#00E5B0] animate-pulse" />
          <span className="font-mono text-[11px] font-semibold tracking-wider text-[#FFFFFF] uppercase">
            APEX-3D ENGINE • LIVE XAUUSD SPOT
          </span>
        </div>
        <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#061116]/90 border border-white/10 font-mono text-[11px] text-[#A3BDB8]">
          <Layers className="w-3.5 h-3.5 text-[#00E5B0]" />
          <span>LATENCY: 1.2ms</span>
        </div>
      </div>

      {/* User Uploaded Master 3D Architecture Visual with Smooth 60fps 3D Parallax & Gentle Float */}
      <div className="relative z-[1] w-full h-full flex items-center justify-center overflow-hidden">
        <div
          ref={inner3DRef}
          className="w-full h-full flex items-center justify-center will-change-transform apex-float-gentle"
        >
          <img
            src="/images/apex-hero-master-3d.png"
            alt="FUNDED APEX Master 3D Architecture"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover sm:object-contain object-center pointer-events-none select-none opacity-90"
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-[#04080A] via-transparent to-[#04080A]/45"
        />
      </div>

      {/* Bottom Floating Market Telemetry & Execution HUD Cards */}
      <div className="absolute bottom-3.5 inset-x-3.5 z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Live Symbol Card */}
        <div className="px-4 py-3 rounded-[18px] bg-[#061116]/92 border border-[#00E5B0]/28 backdrop-blur-md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00E5B0]" />
              <span className="font-mono text-xs font-bold text-white">{currentPair.symbol}</span>
              <span className="text-[11px] text-[#728F8A]">{currentPair.name}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-base font-bold text-white tabular-nums">
                {currentPair.price}
              </span>
              <span className="font-mono text-xs font-semibold text-[#00E5B0]">
                {currentPair.change}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#728F8A]">Spread</div>
            <div className="font-mono text-xs font-bold text-[#38F8D2] tabular-nums">
              {currentPair.spread} pips
            </div>
          </div>
        </div>

        {/* Capital Allocation & Profit Split Telemetry Card */}
        <button
          type="button"
          onClick={onSelectExplore}
          className="px-4 py-3 rounded-[18px] bg-[#08151C]/92 hover:bg-[#0D212B] border border-[#00E5B0]/28 hover:border-[#00E5B0]/55 backdrop-blur-md flex items-center justify-between text-left transition-all cursor-pointer group"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00E5B0]" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#A3BDB8]">
                Max Allocation
              </span>
            </div>
            <div className="mt-1 font-mono text-base font-bold text-white tabular-nums">
              $200,000 <span className="text-xs font-normal text-[#00E5B0]">• 95% Split</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-[12px] bg-[#00E5B0]/15 border border-[#00E5B0]/35 flex items-center justify-center text-[#00E5B0] group-hover:bg-[#00E5B0] group-hover:text-black transition-colors">
            <TrendingUp className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
});
