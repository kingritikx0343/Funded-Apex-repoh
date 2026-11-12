/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, memo } from 'react';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PublicPages } from './components/PublicPages';
import { DashboardView } from './components/DashboardView';
import { TradingTerminalView } from './components/TradingTerminalView';
import { AdminPanelView } from './components/AdminPanelView';
import { StripeCheckoutModal } from './components/StripeCheckoutModal';
import { MoonlitLiquidWaterBackground } from './components/MoonlitLiquidWaterBackground';
import { SmoothScrollManager } from './components/SmoothScrollManager';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

const MemoNavbar = memo(Navbar);
const MemoFooter = memo(Footer);
const MemoPublicPages = memo(PublicPages);
const MemoDashboardView = memo(DashboardView);
const MemoTradingTerminalView = memo(TradingTerminalView);
const MemoAdminPanelView = memo(AdminPanelView);

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#090D0A] border border-[#00E676]/25 rounded-[14px] p-6 space-y-4 text-center shadow-2xl">
            <div className="text-lg font-display font-bold text-[#FFFFFF]">FUNDED APEX</div>
            <p className="text-xs text-[#A7B1AA]">
              {this.state.errorMessage || 'A temporary rendering issue occurred.'}
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.clear();
                } catch {}
                window.location.href = '/';
              }}
              className="px-5 py-2.5 rounded-[9px] apex-glow-btn text-xs cursor-pointer"
            >
              Reload FUNDED APEX
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AnimatedToastPopup: React.FC = () => {
  const { toastMessage, clearToast } = usePlatform();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!toastMessage) {
      setExiting(false);
      return;
    }
    setExiting(false);
    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, 2680);
    const removeTimer = setTimeout(() => {
      clearToast();
    }, 3000);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  const isError = toastMessage.type === 'error';
  const isWarning = toastMessage.type === 'warning';

  return (
    <div
      key={toastMessage.id}
      role="status"
      aria-live="polite"
      data-testid="global-toast-popup"
      className={`fixed bottom-16 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-auto bg-[#050806]/95 backdrop-blur-xl border ${
        isError
          ? 'border-red-500/45'
          : isWarning
          ? 'border-amber-400/45'
          : 'border-[#00E676]/35'
      } shadow-[0_22px_55px_rgba(0,0,0,0.95)] rounded-[12px] p-4 overflow-hidden transition-all duration-300 ease-out ${
        exiting
          ? 'opacity-0 translate-y-3 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100 apex-scale-in'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isError || isWarning ? (
            <AlertTriangle
              className={`w-4 h-4 ${isError ? 'text-red-400' : 'text-amber-400'}`}
            />
          ) : toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
          ) : (
            <Info className="w-4 h-4 text-[#69F0AE]" />
          )}
        </div>
        <div className="flex-1 space-y-1 pr-1">
          <div
            className={`text-xs font-display font-bold ${
              isError ? 'text-red-400' : isWarning ? 'text-amber-300' : 'text-[#00E676]'
            }`}
          >
            {toastMessage.title}
          </div>
          <div className="text-xs text-[#FFFFFF] leading-relaxed">{toastMessage.message}</div>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => {
            setExiting(true);
            setTimeout(clearToast, 200);
          }}
          className="text-[#77837B] hover:text-[#FFFFFF] p-1 rounded-[7px] hover:bg-white/5 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0D130F] overflow-hidden">
        <div
          className={`h-full ${
            isError
              ? 'bg-red-500'
              : isWarning
              ? 'bg-amber-400'
              : 'bg-[#00E676]'
          } apex-toast-countdown`}
        />
      </div>
    </div>
  );
};

const AppRouter: React.FC = () => {
  const { route, user } = usePlatform();

  const isTerminal = route === 'terminal';
  const isDashboardOrAdmin = route === 'dashboard' || route === 'admin';

  // Ensure page scroll resets cleanly on top-level route switches
  useEffect(() => {
    if (typeof window !== 'undefined' && !isTerminal) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [route, isTerminal]);

  return (
    <div
      className={`min-h-screen flex flex-col bg-transparent text-[#FFFFFF] relative ${
        isTerminal ? 'h-[100dvh] w-screen overflow-hidden' : 'overflow-x-hidden'
      }`}
    >
      {/* Butter-Smooth Physics Momentum Scroll & Staggered Reveal Engine */}
      {!isTerminal && <SmoothScrollManager />}

      {/* Zero-Lag GPU 3D Aqua-Water Background Motion */}
      {!isTerminal && <MoonlitLiquidWaterBackground />}

      {!isTerminal && <MemoNavbar />}
      <StripeCheckoutModal />

      {/* Global 3-Second Animated Toast Notification Banner */}
      <AnimatedToastPopup />

      <div
        className={
          isTerminal
            ? 'flex-1 w-full h-full relative z-10 flex flex-col'
            : 'flex-1 relative z-10 apex-layout-transition'
        }
      >
        {route === 'terminal' ? (
          <MemoTradingTerminalView />
        ) : route === 'dashboard' && user ? (
          <MemoDashboardView />
        ) : route === 'admin' && user ? (
          <MemoAdminPanelView />
        ) : (
          <MemoPublicPages />
        )}
      </div>

      {!isTerminal && !isDashboardOrAdmin && <MemoFooter />}
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <PlatformProvider>
        <AppRouter />
      </PlatformProvider>
    </AppErrorBoundary>
  );
}
