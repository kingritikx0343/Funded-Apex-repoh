/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PublicPages } from './components/PublicPages';
import { DashboardView } from './components/DashboardView';
import { TradingTerminalView } from './components/TradingTerminalView';
import { AdminPanelView } from './components/AdminPanelView';
import { StripeCheckoutModal } from './components/StripeCheckoutModal';
import { MoonlitLiquidWaterBackground } from './components/MoonlitLiquidWaterBackground';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

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
        <div className="min-h-screen bg-[#030A07] text-[#FFFFFF] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#091B14] border border-emerald-500/35 rounded-2xl p-6 space-y-4 text-center shadow-2xl">
            <div className="text-lg font-display font-bold text-[#FFFFFF]">FUNDED APEX</div>
            <p className="text-xs text-[#94B8AA]">
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
              className="px-5 py-2.5 rounded-xl apex-glow-btn text-xs cursor-pointer"
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
    // Start smooth fade/slide-out animation at 4.55s so it finishes right at 5.00s
    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, 4550);
    const removeTimer = setTimeout(() => {
      clearToast();
    }, 5000);
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
      className={`fixed bottom-16 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-auto bg-[#06150F]/96 backdrop-blur-xl border ${
        isError
          ? 'border-rose-500/50'
          : isWarning
          ? 'border-amber-400/50'
          : 'border-[#14F195]/45'
      } shadow-[0_22px_55px_rgba(0,0,0,0.88)] rounded-2xl p-4 overflow-hidden transition-all duration-400 ease-out ${
        exiting
          ? 'opacity-0 translate-y-3 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100 apex-scale-in'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isError || isWarning ? (
            <AlertTriangle
              className={`w-4 h-4 ${isError ? 'text-rose-400' : 'text-amber-400'}`}
            />
          ) : toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#14F195]" />
          ) : (
            <Info className="w-4 h-4 text-[#00E5B0]" />
          )}
        </div>
        <div className="flex-1 space-y-1 pr-1">
          <div
            className={`text-xs font-display font-bold ${
              isError ? 'text-rose-400' : isWarning ? 'text-amber-300' : 'text-[#14F195]'
            }`}
          >
            {toastMessage.title}
          </div>
          <div className="text-xs text-[#F8FAFC] leading-relaxed">{toastMessage.message}</div>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => {
            setExiting(true);
            setTimeout(clearToast, 220);
          }}
          className="text-[#94B8AA] hover:text-[#FFFFFF] p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 5-Second Animated Auto-Dismiss Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-950/60 overflow-hidden">
        <div
          className={`h-full ${
            isError
              ? 'bg-rose-500'
              : isWarning
              ? 'bg-amber-400'
              : 'bg-gradient-to-r from-[#14F195] to-[#00E5B0]'
          } apex-toast-countdown`}
        />
      </div>
    </div>
  );
};

const AppRouter: React.FC = () => {
  const { route, user } = usePlatform();

  const isTerminal = route === 'terminal';

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#F8FAFC] relative overflow-x-hidden">
      {/* Subtle Animated Moon & Star Light Reflection on Liquid Water Canvas */}
      {!isTerminal && <MoonlitLiquidWaterBackground />}

      {!isTerminal && <Navbar />}
      <StripeCheckoutModal />

      {/* Global 5-Second Animated Toast Notification Banner */}
      <AnimatedToastPopup />

      <div key={route} className="flex-1 relative z-10 apex-page-enter">
        {route === 'terminal' ? (
          <TradingTerminalView />
        ) : route === 'dashboard' && user ? (
          <DashboardView />
        ) : (route === 'admin' || route === 'support') && user ? (
          <AdminPanelView />
        ) : (
          <PublicPages />
        )}
      </div>

      {!isTerminal && <Footer />}
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
