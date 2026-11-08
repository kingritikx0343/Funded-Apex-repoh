import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  INSTRUMENTS,
  SymbolCode,
  OrderSide,
  OrderType,
  ChallengeType,
  evaluateAccountRiskMetrics,
  resolveChallengeRulesForAccount,
  exportOrdersToCsv,
  roundPrice,
  TradeOrderRecord,
} from '../engine/tradingEngine';
import { getTimeframeStepMultiplier } from '../engine/liveMarketFeed';
import { ApexLiveCandlestickChart } from './ApexLiveCandlestickChart';
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Home,
  Lock,
  Search,
  Sliders,
  X,
} from 'lucide-react';

const TIMEFRAMES = [
  { label: '1m', tv: '1', seconds: 60 },
  { label: '5m', tv: '5', seconds: 300 },
  { label: '15m', tv: '15', seconds: 900 },
  { label: '30m', tv: '30', seconds: 1800 },
  { label: '1h', tv: '60', seconds: 3600 },
  { label: '4h', tv: '240', seconds: 14400 },
  { label: '1d', tv: '1D', seconds: 86400 },
];

const LOT_PRESETS = ['0.01', '0.05', '0.10', '0.25', '0.50', '1.00', '2.00', '5.00'];

const INSTRUMENT_CATEGORIES: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All (24)' },
  { id: 'Metals', label: 'Metals & Commodities' },
  { id: 'Forex', label: 'Forex' },
  { id: 'Crypto', label: 'Crypto' },
  { id: 'Indices', label: 'Indices' },
];

export const TradingTerminalView: React.FC = () => {
  const {
    user,
    quotes,
    liveFeedStatus,
    challenges,
    accounts,
    activeAccount,
    setActiveAccountId,
    openStripeCheckout,
    orders,
    submitOrder,
    modifyOrder,
    closePosition,
    cancelPendingOrder,
    navigate,
    isTerminalUnlocked,
    unlockTerminal,
    lockTerminal,
    quotesRef,
  } = usePlatform();

  const [userIdInput, setUserIdInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');
  const [showTerminalPass, setShowTerminalPass] = useState(false);

  // Automatically sync Terminal User ID & Password inputs whenever an active challenge account is selected
  useEffect(() => {
    if (
      activeAccount &&
      (activeAccount.status === 'active' || activeAccount.status === 'passed') &&
      activeAccount.terminalPassword
    ) {
      setUserIdInput(activeAccount.terminalUserId || 'APEX-MASTER');
      setPassInput(activeAccount.terminalPassword);
      setPassError('');
    } else if (activeAccount?.status === 'failed') {
      setPassInput('');
    }
  }, [activeAccount?.id, activeAccount?.status, activeAccount?.terminalUserId, activeAccount?.terminalPassword]);

  // Terminal supports both authenticated trader accounts and instant preview simulation

  // Active Symbol & Timeframe
  const [symbol, setSymbol] = useState<SymbolCode>('XAUUSD');
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[2]); // 15m default
  const [volume, setVolume] = useState<string>('0.01');
  const [showLotDropdown, setShowLotDropdown] = useState(false);

  // Modals & Drawers
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairCategoryFilter, setPairCategoryFilter] = useState('ALL');
  const [pairSearchQuery, setPairSearchQuery] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showPositionsDrawer, setShowPositionsDrawer] = useState(false);
  const [showAdvancedOrderTicket, setShowAdvancedOrderTicket] = useState(false);

  // Fullscreen toggle
  const [isFullscreenChart, setIsFullscreenChart] = useState(false);

  // Candle countdown timer (e.g. 02:41)
  const [candleCountdown, setCandleCountdown] = useState<string>('02:41');

  // Advanced Order Ticket state
  const [advSide, setAdvSide] = useState<OrderSide>('BUY');
  const [advOrderType, setAdvOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP'>('MARKET');
  const [advEntryPrice, setAdvEntryPrice] = useState<string>('');
  const [advSl, setAdvSl] = useState<string>('');
  const [advTp, setAdvTp] = useState<string>('');

  // Modify Order state
  const [editingOrder, setEditingOrder] = useState<TradeOrderRecord | null>(null);
  const [editSl, setEditSl] = useState<string>('');
  const [editTp, setEditTp] = useState<string>('');
  const [editEntry, setEditEntry] = useState<string>('');

  // Blotter tab inside drawer
  const [blotterTab, setBlotterTab] = useState<'positions' | 'pending' | 'history'>('positions');

  // Performance Refs for 60fps Header Updates
  const balanceRef = useRef<HTMLElement>(null);
  const equityRef = useRef<HTMLElement>(null);
  const bidRef = useRef<HTMLSpanElement>(null);
  const askRef = useRef<HTMLSpanElement>(null);



  const currentQuote = quotes[symbol] || {
    symbol,
    bid: 4045.0,
    ask: 4045.16,
    high24h: 4080.0,
    low24h: 3920.0,
    change24hPct: 0.85,
    timestamp: Date.now(),
  };

  const spec = INSTRUMENTS[symbol] || INSTRUMENTS.XAUUSD;

  // Real candle countdown ticking every second (supports MM:SS and HH:MM:SS for 4h / 1d)
  useEffect(() => {
    const updateCountdown = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const tfSec = timeframe.seconds;
      const secPassed = nowSec % tfSec;
      const secRemaining = Math.max(0, tfSec - secPassed);
      const hrs = Math.floor(secRemaining / 3600);
      const mins = Math.floor((secRemaining % 3600) / 60);
      const secs = secRemaining % 60;
      if (hrs > 0) {
        setCandleCountdown(
          `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
            .toString()
            .padStart(2, '0')}`
        );
      } else {
        setCandleCountdown(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timeframe.seconds]);

  const [previewChallengeType, setPreviewChallengeType] = useState<ChallengeType>('instant');
  const [previewAccountSize, setPreviewAccountSize] = useState<number>(3000);
  const [lastExecutedTrade, setLastExecutedTrade] = useState<{
    id: string;
    side: OrderSide;
    symbol: SymbolCode;
    volume: number;
    price: number;
    timestamp: number;
  } | null>(null);
  const [lastExecutedExiting, setLastExecutedExiting] = useState(false);

  // Auto-dismiss trade execution popup in 5 seconds (5000ms) with smooth exit animation
  useEffect(() => {
    if (!lastExecutedTrade) {
      setLastExecutedExiting(false);
      return;
    }
    setLastExecutedExiting(false);
    const exitTimer = setTimeout(() => setLastExecutedExiting(true), 4550);
    const clearTimer = setTimeout(() => setLastExecutedTrade(null), 5000);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(clearTimer);
    };
  }, [lastExecutedTrade]);

  const effectiveAccount = useMemo(() => {
    const ownedAcc = activeAccount || (accounts.length > 0 ? accounts[0] : null);
    if (ownedAcc) {
      const rules = resolveChallengeRulesForAccount(ownedAcc);
      return {
        ...ownedAcc,
        dailyDrawdownPct: rules.dailyDrawdownPct,
        maxDrawdownPct: rules.maxDrawdownPct,
        profitTargetPct: rules.profitTargetPct,
        leverage: rules.leverage,
        profitSplitPct: rules.profitSplitPct,
        minTradingDays: rules.minTradingDays,
        currentStep: rules.currentStep,
        totalSteps: rules.totalSteps,
      };
    }

    const matchedChallenge =
      challenges.find(
        (c) => c.type === previewChallengeType && c.accountSize === previewAccountSize
      ) ||
      challenges.find((c) => c.accountSize === previewAccountSize);

    const resolvedSize = previewAccountSize || matchedChallenge?.accountSize || 3000;
    const resolvedType = matchedChallenge?.type || previewChallengeType || 'instant';
    const challengeSlug =
      matchedChallenge?.id ||
      `${resolvedType.replace('_', '-')}-${resolvedSize}`;
    const previewId = `preview-${challengeSlug}`;

    const realizedPnl = orders
      .filter((o) => o.accountId === previewId && o.status === 'CLOSED')
      .reduce((sum, o) => sum + (o.netPnl || 0), 0);
    const computedBal = Math.round((resolvedSize + realizedPnl) * 100) / 100;

    const rules = resolveChallengeRulesForAccount({
      challengeId: challengeSlug,
      challengeType: resolvedType,
      currentStep: 1,
    });

    const typeLabel =
      resolvedType === 'instant'
        ? 'Instant Funded'
        : resolvedType === 'one_step'
        ? '1-Step Evaluation'
        : resolvedType === 'two_step'
        ? '2-Step Evaluation'
        : '3-Step Evaluation';

    return {
      id: previewId,
      accountNumber: `APEX-${resolvedSize >= 1000 ? `${resolvedSize / 1000}K` : resolvedSize}`,
      userId: user?.uid || 'guest-trader',
      challengeId: challengeSlug,
      challengeTitle:
        matchedChallenge?.title || `${typeLabel} ($${resolvedSize.toLocaleString()})`,
      challengeType: resolvedType,
      accountSize: resolvedSize,
      startingBalance: resolvedSize,
      balance: computedBal,
      equity: computedBal,
      usedMargin: 0,
      freeMargin: computedBal,
      profitTargetPct: rules.profitTargetPct,
      dailyDrawdownPct: rules.dailyDrawdownPct,
      maxDrawdownPct: rules.maxDrawdownPct,
      minTradingDays: rules.minTradingDays,
      tradingDaysCount: 1,
      leverage: rules.leverage,
      profitSplitPct: rules.profitSplitPct,
      currentStep: rules.currentStep,
      totalSteps: rules.totalSteps,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [activeAccount, accounts, challenges, user, previewChallengeType, previewAccountSize, orders]);

  const accountOrders = useMemo(
    () => orders.filter((o) => o.accountId === effectiveAccount.id),
    [orders, effectiveAccount.id]
  );

  const openPositions = useMemo(
    () => accountOrders.filter((o) => o.status === 'OPEN'),
    [accountOrders]
  );

  const currentSymbolPositions = useMemo(
    () => openPositions.filter((p) => p.symbol === symbol),
    [openPositions, symbol]
  );

  const pendingOrders = useMemo(
    () => accountOrders.filter((o) => o.status === 'PENDING'),
    [accountOrders]
  );

  const tradeHistory = useMemo(
    () => accountOrders.filter((o) => o.status === 'CLOSED' || o.status === 'CANCELLED'),
    [accountOrders]
  );

  const riskMetrics = useMemo(
    () => evaluateAccountRiskMetrics(effectiveAccount, openPositions),
    [effectiveAccount, openPositions]
  );

  // Immediately lock terminal and close open positions if the active/effective account hits Maximum or Daily Drawdown
  useEffect(() => {
    if (!isTerminalUnlocked) return;
    if (effectiveAccount.status === 'failed' || riskMetrics.nextStatus === 'failed') {
      openPositions.forEach((pos) => {
        closePosition(pos.id);
      });
      lockTerminal();
    }
  }, [
    isTerminalUnlocked,
    effectiveAccount.status,
    riskMetrics.nextStatus,
    openPositions,
    closePosition,
    lockTerminal,
  ]);

  const phaseLabel = useMemo(() => {
    if (effectiveAccount.status === 'failed' || riskMetrics.nextStatus === 'failed') return 'BREACHED';
    if (riskMetrics.nextStatus === 'passed') return 'FUNDED • PASSED';
    if (effectiveAccount.challengeType === 'instant') return 'INSTANT FUNDED';
    const total = effectiveAccount.totalSteps ?? 2;
    const curr = effectiveAccount.currentStep ?? 1;
    if (total <= 1) return '1-STEP EVAL';
    return `PHASE ${curr} OF ${total}`;
  }, [
    effectiveAccount.status,
    riskMetrics.nextStatus,
    effectiveAccount.challengeType,
    effectiveAccount.totalSteps,
    effectiveAccount.currentStep,
  ]);

  // Filtered symbols for Pair Selector Modal
  const allSymbols = useMemo(() => Object.keys(INSTRUMENTS) as SymbolCode[], []);
  const filteredSymbols = useMemo(() => {
    return allSymbols.filter((sym) => {
      const instr = INSTRUMENTS[sym];
      const matchesCategory =
        pairCategoryFilter === 'ALL' ||
        instr.category === pairCategoryFilter ||
        (pairCategoryFilter === 'Metals' && instr.category === 'Commodities');
      const matchesQuery =
        pairSearchQuery.trim() === '' ||
        sym.toLowerCase().includes(pairSearchQuery.toLowerCase()) ||
        instr.name.toLowerCase().includes(pairSearchQuery.toLowerCase()) ||
        instr.shortName.toLowerCase().includes(pairSearchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [allSymbols, pairCategoryFilter, pairSearchQuery]);

  const parsedVolume = parseFloat(volume) || 0.01;

  // 1-Click Fast Market Order Execution with Automatic SL & TP + On-Chart Execution Feedback
  const handleQuickTrade = (orderSide: OrderSide) => {
    const baseExecPrice = orderSide === 'BUY' ? currentQuote.ask : currentQuote.bid;
    const tfScale = getTimeframeStepMultiplier(timeframe.label);
    const unitDist = Math.max(spec.spread * 6, spec.volatility * tfScale * 2.2);
    const slDist = unitDist * 1.15;
    const tpDist = unitDist * 1.85;

    const autoSl = roundPrice(
      orderSide === 'BUY' ? baseExecPrice - slDist : baseExecPrice + slDist,
      symbol
    );
    const autoTp = roundPrice(
      orderSide === 'BUY' ? baseExecPrice + tpDist : baseExecPrice - tpDist,
      symbol
    );

    const res = submitOrder({
      accountId: effectiveAccount.id,
      symbol,
      side: orderSide,
      orderType: 'MARKET',
      volume: parsedVolume > 0 ? parsedVolume : 0.01,
      stopLoss: autoSl > 0 ? autoSl : undefined,
      takeProfit: autoTp > 0 ? autoTp : undefined,
    });
    if (res.ok && res.order) {
      setLastExecutedTrade({
        id: res.order.id,
        side: res.order.side,
        symbol: res.order.symbol,
        volume: res.order.volume,
        price: res.order.entryPrice,
        timestamp: Date.now(),
      });
    }
  };

  // Advanced Order Execution with accurate OrderType mapping
  const handleAdvOrder = () => {
    const entry = parseFloat(advEntryPrice) || undefined;
    const sl = parseFloat(advSl) || undefined;
    const tp = parseFloat(advTp) || undefined;
    const resolvedOrderType: OrderType =
      advOrderType === 'MARKET'
        ? 'MARKET'
        : advOrderType === 'LIMIT'
        ? advSide === 'BUY'
          ? 'BUY_LIMIT'
          : 'SELL_LIMIT'
        : advSide === 'BUY'
        ? 'BUY_STOP'
        : 'SELL_STOP';

    const res = submitOrder({
      accountId: effectiveAccount.id,
      symbol,
      side: advSide,
      orderType: resolvedOrderType,
      volume: parsedVolume > 0 ? parsedVolume : 0.01,
      entryPrice: resolvedOrderType === 'MARKET' ? undefined : entry,
      stopLoss: sl,
      takeProfit: tp,
    });
    if (res.ok && res.order) {
      setLastExecutedTrade({
        id: res.order.id,
        side: res.order.side,
        symbol: res.order.symbol,
        volume: res.order.volume,
        price: res.order.entryPrice,
        timestamp: Date.now(),
      });
      setShowAdvancedOrderTicket(false);
      setAdvSl('');
      setAdvTp('');
      setAdvEntryPrice('');
    }
  };

  const handleExportCsv = () => {
    const csvContent = exportOrdersToCsv(tradeHistory);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `APEX_Trades_${effectiveAccount.accountNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isFundedAccount =
    effectiveAccount.challengeType === 'instant' ||
    effectiveAccount.status === 'passed' ||
    riskMetrics.nextStatus === 'passed';

  const ddUsedUsd = riskMetrics.overallDropUsd;
  const ddLimitUsd =
    effectiveAccount.accountSize === 3000
      ? 120
      : riskMetrics.maxLossLimitUsd > 0
      ? riskMetrics.maxLossLimitUsd
      : Math.round(effectiveAccount.startingBalance * 0.06);
  const ddUsedPct =
    ddLimitUsd > 0 ? Math.min(100, Math.max(0, (ddUsedUsd / ddLimitUsd) * 100)) : 0;

  const liveMidPrice = (currentQuote.bid + currentQuote.ask) / 2;
  const rawSpread = Math.max(
    Math.pow(10, -spec.decimals),
    Math.abs(currentQuote.ask - currentQuote.bid)
  );

  // Sync Balance & Equity at 60fps using rAF
  useEffect(() => {
    let rafId: number;
    const updateHeader = () => {
      if (!balanceRef.current || !equityRef.current || !effectiveAccount) return;

      // 1. Update static balance
      balanceRef.current.textContent = `$${effectiveAccount.balance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      // 2. Calculate real-time floating PnL and Equity at 60fps
      const latestQuotes = quotesRef.current;
      let totalFloatingPnl = 0;
      
      openPositions.forEach((pos) => {
        const quote = latestQuotes[pos.symbol];
        if (quote) {
          const markPrice = pos.side === 'BUY' ? quote.bid : quote.ask;
          const priceDiff = pos.side === 'BUY' ? markPrice - pos.entryPrice : pos.entryPrice - markPrice;
          const posSpec = INSTRUMENTS[pos.symbol];
          if (posSpec) {
            const grossPnl = priceDiff * posSpec.contractSize * pos.volume;
            totalFloatingPnl += (grossPnl - pos.commission);
          }
        }
      });

      const liveEquity = Math.round((effectiveAccount.balance + totalFloatingPnl) * 100) / 100;
      equityRef.current.textContent = `$${liveEquity.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      // 3. Update execution prices at 60fps
      const symbolQuote = latestQuotes[symbol];
      if (symbolQuote) {
        if (bidRef.current) {
          bidRef.current.textContent = symbolQuote.bid.toLocaleString('en-US', {
            minimumFractionDigits: spec.decimals,
            maximumFractionDigits: spec.decimals,
          });
        }
        if (askRef.current) {
          askRef.current.textContent = symbolQuote.ask.toLocaleString('en-US', {
            minimumFractionDigits: spec.decimals,
            maximumFractionDigits: spec.decimals,
          });
        }
      }

      rafId = requestAnimationFrame(updateHeader);
    };
    rafId = requestAnimationFrame(updateHeader);
    return () => cancelAnimationFrame(rafId);
  }, [effectiveAccount.id, effectiveAccount.balance, openPositions, quotesRef, symbol, spec.decimals]);


  // Single unconditional return with clean branching for Auth / Lock / Live Terminal
  if (!user) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center space-y-6 apex-fade-up">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="flex items-center gap-2 text-xs font-display font-extrabold text-[#00FFA3] hover:text-white bg-[#04100B] border border-emerald-500/30 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-[0_0_12px_rgba(0,255,163,0.2)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>

        <div className="apex-glass-card rounded-3xl p-8 space-y-6 border-2 border-[#00FFA3]/40 shadow-[0_0_80px_rgba(0,255,163,0.3)]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-[#00FFA3] text-[#030A07] flex items-center justify-center mx-auto shadow-[0_0_28px_rgba(0,255,163,0.5)]">
            <Lock className="w-8 h-8 stroke-[2.8]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00FFA3]/15 border border-[#00FFA3]/40 text-xs font-mono font-bold text-[#00FFA3]">
              AUTHENTICATION REQUIRED
            </div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Sign In to Access Terminal
            </h1>
            <p className="text-xs text-[#94B8AA] leading-relaxed">
              Trading Terminal order execution and live price feeds are strictly restricted to logged-in traders.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('login')}
              className="w-full py-4 rounded-2xl apex-glow-btn text-xs font-display font-extrabold cursor-pointer shadow-[0_0_24px_rgba(0,255,163,0.35)]"
            >
              Sign In to Trader Account →
            </button>
            <button
              type="button"
              onClick={() => navigate('register')}
              className="w-full py-3.5 rounded-2xl bg-[#04100B] border border-emerald-500/30 text-[#94B8AA] hover:text-white font-display font-bold text-xs cursor-pointer"
            >
              Create Free Account
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!isTerminalUnlocked) {
    const isSelectedAccountBreached =
      activeAccount?.status === 'failed' || riskMetrics.nextStatus === 'failed';

    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center space-y-6 apex-fade-up">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('dashboard')}
            className="flex items-center gap-2 text-xs font-display font-extrabold text-[#00FFA3] hover:text-white bg-[#04100B] border border-emerald-500/30 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-[0_0_12px_rgba(0,255,163,0.2)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <span className="text-[11px] font-mono font-bold text-[#00FFA3]">fundedapex.com</span>
        </div>

        <div className="apex-glass-card rounded-3xl p-8 space-y-6 border-2 border-[#00FFA3]/40 shadow-[0_0_80px_rgba(0,255,163,0.3)]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-[#00FFA3] text-[#030A07] flex items-center justify-center mx-auto shadow-[0_0_28px_rgba(0,255,163,0.5)]">
            <Lock className="w-8 h-8 stroke-[2.8]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00FFA3]/15 border border-[#00FFA3]/40 text-xs font-mono font-bold text-[#00FFA3]">
              TERMINAL SECURITY • 2-FACTOR LOGIN
            </div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Terminal User ID &amp; Password
            </h1>
            <p className="text-xs text-[#94B8AA] leading-relaxed">
              Enter your unique <strong className="text-white">Terminal User ID</strong> and <strong className="text-white">Terminal Password</strong> assigned by Admin to unlock live order execution.
            </p>
          </div>

          {activeAccount && (
            <div
              className={`p-3.5 rounded-2xl text-left space-y-2 border ${
                isSelectedAccountBreached
                  ? 'bg-rose-950/50 border-rose-500/60'
                  : 'bg-[#04110C] border-[#00FFA3]/30'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#94B8AA] font-bold uppercase tracking-wider">
                  Selected Account: <strong className="text-white font-mono">#{activeAccount.accountNumber}</strong>
                </span>
                {isSelectedAccountBreached ? (
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/25 border border-rose-500/50 text-[10px] font-mono font-extrabold text-rose-300">
                    BREACHED • PASSWORD REMOVED
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setUserIdInput(activeAccount.terminalUserId || 'APEX-MASTER');
                      setPassInput(activeAccount.terminalPassword || 'APEX2026');
                      setPassError('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#00FFA3]/15 border border-[#00FFA3]/40 text-[10px] font-display font-extrabold text-[#00FFA3] hover:bg-[#00FFA3] hover:text-[#030A07] transition-all cursor-pointer"
                  >
                    Auto-Fill My Credentials
                  </button>
                )}
              </div>

              {isSelectedAccountBreached && (
                <div className="text-[11px] font-bold text-rose-300 leading-relaxed">
                  ⚠ {activeAccount.breachReason || riskMetrics.breachReason || 'Maximum Drawdown Limit Breached'}. Terminal Password has been permanently removed for this breached account.
                </div>
              )}

               <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-[#94B8AA] block text-[9px] uppercase">Terminal User ID</span>
                  <span className="text-[#00FFA3] font-bold">{activeAccount.terminalUserId || 'APEX-MASTER'}</span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-[#94B8AA] block text-[9px] uppercase">Terminal Password</span>
                  {isSelectedAccountBreached || !activeAccount.terminalPassword ? (
                    <span className="text-rose-400 font-bold">REMOVED (BREACHED)</span>
                  ) : (
                    <span className="text-[#00FFA3] font-bold">{activeAccount.terminalPassword}</span>
                  )}
                </div>
              </div>

              {accounts.length > 1 && (
                <div className="pt-1.5 border-t border-white/10">
                  <span className="text-[9.5px] font-mono uppercase text-[#94B8AA] block mb-1.5">
                    Switch Challenge Account:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {accounts.map((acc) => {
                      const isCurr = acc.id === activeAccount.id;
                      const isBreached = acc.status === 'failed';
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setActiveAccountId(acc.id);
                            setPassError('');
                            if (!isBreached && acc.terminalPassword) {
                              unlockTerminal(acc.terminalUserId || 'APEX-MASTER', acc.terminalPassword);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                            isCurr
                              ? isBreached
                                ? 'bg-rose-500/25 border-rose-500 text-rose-200'
                                : 'bg-[#00FFA3] border-[#00FFA3] text-[#030A07]'
                              : isBreached
                              ? 'bg-black/40 border-rose-500/30 text-rose-400'
                              : 'bg-black/40 border-emerald-500/30 text-[#00FFA3] hover:bg-emerald-500/15'
                          }`}
                        >
                          #{acc.accountNumber} ({isBreached ? 'BREACHED' : 'ACTIVE'})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {passError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs font-bold text-rose-300">
              {passError}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPassError('');
              const ok = unlockTerminal(userIdInput, passInput);
              if (!ok) {
                setPassError(
                  isSelectedAccountBreached
                    ? 'Account is Breached — Terminal Password has been removed. Please select an active account or buy a new evaluation.'
                    : 'Invalid Terminal User ID or Password. Check your Dashboard or Admin email notification.'
                );
              }
            }}
            className="space-y-4 text-left"
          >
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#94B8AA] font-bold block">
                1. Terminal User ID
              </label>
              <input
                type="text"
                required
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="e.g. APEX-ID-4821"
                className="w-full px-4 py-3.5 rounded-2xl bg-[#040E0A] border border-[#00FFA3]/40 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#00FFA3]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#94B8AA] font-bold block">
                2. Terminal Password
              </label>
              <div className="relative">
                <input
                  type={showTerminalPass ? 'text' : 'password'}
                  required
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  placeholder="e.g. APEX-7392"
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#040E0A] border border-[#00FFA3]/40 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#00FFA3]"
                />
                <button
                  type="button"
                  onClick={() => setShowTerminalPass(!showTerminalPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94B8AA] hover:text-white p-1"
                >
                  {showTerminalPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('dashboard')}
                className="py-3.5 px-4 rounded-2xl bg-[#04100B] border border-emerald-500/40 text-[#94B8AA] hover:text-white font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 rounded-2xl apex-glow-btn text-xs font-display font-extrabold cursor-pointer shadow-[0_0_24px_rgba(0,255,163,0.35)]"
              >
                Login to Terminal →
              </button>
            </div>
          </form>

          <div className="pt-3 border-t border-emerald-500/20 text-[11px] text-[#94B8AA] space-y-1">
            <div>
              Master Fallback ID: <strong className="text-[#00FFA3] font-mono">APEX-MASTER</strong> • Pass: <strong className="text-[#00FFA3] font-mono">APEX2026</strong>
            </div>
            <div className="text-[10px]">
              Need credentials help? Email <strong className="text-white">fundedapexsupport@gmail.com</strong>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-white text-[#0F172A] flex flex-col justify-between overflow-hidden selection:bg-[#00B574] selection:text-white relative z-10">
      {/* 1. CLEAN WHITE TOP HEADER BAR MATCHING SCREENSHOT (Account Switch ▼ / Balance / Equity / LIVE / Logout) */}
      <header className="shrink-0 bg-white px-3.5 pt-2 pb-1 sm:px-6 select-none relative">
        <div className="w-full max-w-[1800px] mx-auto flex items-start justify-between gap-2">
          {/* Left: Account Switch ▼ + Tight Balance & Equity */}
          <div className="flex flex-col">
            <button
              type="button"
              data-testid="terminal-account-switch-btn"
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#1E293B] hover:text-[#00B574] transition-colors cursor-pointer w-fit leading-tight"
            >
              <span>Account Switch</span>
              <span className="text-[11px] text-slate-500">▼</span>
            </button>

            <div className="flex items-baseline gap-2 sm:gap-2.5 mt-0 flex-wrap leading-tight">
              <span className="text-xs sm:text-sm text-[#1E293B] font-normal">
                Balance{' '}
                <strong 
                  ref={balanceRef}
                  className="text-[#0F172A] font-semibold tabular-nums text-sm sm:text-base"
                >
                  $
                  {effectiveAccount.balance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </span>
              <span className="text-xs sm:text-sm text-[#1E293B] font-normal">
                Equity{' '}
                <strong 
                  ref={equityRef}
                  className="text-[#0F172A] font-semibold tabular-nums text-sm sm:text-base"
                >
                  $
                  {riskMetrics.equity.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </span>
            </div>
          </div>

          {/* Right: Green Outlined LIVE Pill & Logout Button */}
          <div className="flex items-center gap-3 sm:gap-4 pt-0.5">
            <div className="px-3.5 py-1 rounded-full border border-[#00B574] bg-white text-[#009E65] font-semibold text-xs tracking-wide">
              LIVE
            </div>

            <button
              type="button"
              data-testid="terminal-back-btn"
              onClick={() => {
                lockTerminal();
                navigate('dashboard');
              }}
              className="text-xs sm:text-sm text-slate-600 hover:text-[#0F172A] font-medium transition-colors cursor-pointer px-1 py-0.5"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Account Switcher Dropdown */}
        {showAccountDropdown && (
          <div className="absolute left-3 right-3 sm:left-5 sm:right-auto sm:w-[420px] top-14 z-50 bg-white border border-slate-200 rounded-2xl p-4 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <span className="text-xs font-display font-extrabold text-[#009E65] uppercase tracking-wider block">
                  Select Challenge Account ({phaseLabel})
                </span>
                <span className="text-[11px] text-slate-500">
                  Switch active evaluation or configure challenge rules
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountDropdown(false)}
                className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Owned Accounts List */}
            <div className="py-2.5 space-y-1.5 max-h-52 overflow-y-auto">
              <div className="text-[10px] font-bold text-slate-400 uppercase px-1">
                Your Active Accounts ({accounts.length})
              </div>
              {accounts.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No purchased accounts yet. Select a Challenge Type &amp; Capital below to trade with exact prop rules.
                </div>
              ) : (
                accounts.map((acc) => {
                  const isCurrent = acc.id === effectiveAccount.id;
                  const accRules = resolveChallengeRulesForAccount(acc);
                  const isAccBreached = acc.status === 'failed';
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setActiveAccountId(acc.id);
                        setShowAccountDropdown(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        isAccBreached
                          ? 'bg-rose-50 border-rose-300 text-rose-900'
                          : isCurrent
                          ? 'bg-emerald-50 border-[#00B574] text-[#0F172A]'
                          : 'bg-slate-50 border-slate-200 hover:border-[#00B574]/50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span>#{acc.accountNumber}</span>
                        <span className={isAccBreached ? 'text-rose-600 font-extrabold' : 'text-[#009E65] font-extrabold'}>
                          ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">
                        {acc.challengeTitle} • {isAccBreached ? 'BREACHED (PASSWORD REMOVED)' : acc.status.toUpperCase()}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        Daily DD {accRules.dailyDrawdownPct}% • Max DD {accRules.maxDrawdownPct}% • Target +{accRules.profitTargetPct}%
                        {acc.challengeType === 'instant' ? ' • 15% Consistency' : ''}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Challenge Type Selector */}
            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <div className="text-[10px] font-bold text-[#009E65] uppercase px-1">
                Challenge Model Rules
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'instant', label: 'Funded / Instant (4% DD)' },
                    { id: 'two_step', label: '2-Step (5% DD / 8% Target)' },
                    { id: 'one_step', label: '1-Step (4% DD / 10% Target)' },
                    { id: 'three_step', label: '3-Step (5% DD / 6% Target)' },
                  ] as { id: ChallengeType; label: string }[]
                ).map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => {
                      setActiveAccountId('');
                      setPreviewChallengeType(ct.id);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-display font-bold border text-left transition-all cursor-pointer ${
                      previewChallengeType === ct.id && !activeAccount
                        ? 'bg-[#00B574] text-white border-[#00B574]'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#00B574]'
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>

              <div className="text-[10px] font-bold text-[#009E65] uppercase px-1 pt-1">
                Challenge Account Capital
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[3000, 5000, 10000, 25000, 50000, 100000, 200000].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      setActiveAccountId('');
                      setPreviewAccountSize(sz);
                      setShowAccountDropdown(false);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      previewAccountSize === sz && !activeAccount
                        ? 'bg-[#00B574] text-white border-[#00B574] font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#00B574]'
                    }`}
                  >
                    ${(sz / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAccountDropdown(false);
                  setShowAdvancedOrderTicket(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#0F172A] cursor-pointer transition-all"
              >
                SL / TP Order Ticket
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAccountDropdown(false);
                  openStripeCheckout(effectiveAccount.challengeId || 'two-step-5000');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#00B574] hover:bg-[#009E65] text-xs font-display font-extrabold text-white cursor-pointer transition-all"
              >
                + Buy Challenge
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. ONE-TAP FAST EXECUTION STRIP (SELL / BUY / GOLD ▼ SELECTOR MATCHING SCREENSHOT) */}
      <section className="shrink-0 bg-white px-3.5 py-1 sm:px-6 select-none">
        <div className="w-full max-w-[1800px] mx-auto grid grid-cols-12 gap-2 sm:gap-3 items-stretch">
          {/* Crimson Red SELL Box (#EF134C) */}
          <button
            type="button"
            data-testid="terminal-sell-btn"
            onClick={() => handleQuickTrade('SELL')}
            className="col-span-5 bg-[#EF134C] hover:bg-[#D91144] active:scale-[0.99] transition-all rounded-[16px] py-2 sm:py-2.5 px-3 flex flex-col items-center justify-center text-white shadow-[0_4px_12px_rgba(239,19,76,0.2)] cursor-pointer"
          >
            <span className="text-[11px] sm:text-xs font-medium tracking-wide uppercase opacity-95 leading-none">
              SELL
            </span>
            <span 
              ref={bidRef}
              className="text-lg sm:text-xl font-semibold tracking-tight mt-0.5 tabular-nums leading-tight"
            >
              {currentQuote.bid.toLocaleString('en-US', {
                minimumFractionDigits: spec.decimals,
                maximumFractionDigits: spec.decimals,
              })}
            </span>
          </button>

          {/* Emerald Green BUY Box (#00B574) */}
          <button
            type="button"
            data-testid="terminal-buy-btn"
            onClick={() => handleQuickTrade('BUY')}
            className="col-span-5 bg-[#00B574] hover:bg-[#009E65] active:scale-[0.99] transition-all rounded-[16px] py-2 sm:py-2.5 px-3 flex flex-col items-center justify-center text-white shadow-[0_4px_12px_rgba(0,181,116,0.2)] cursor-pointer"
          >
            <span className="text-[11px] sm:text-xs font-medium tracking-wide uppercase opacity-95 leading-none">
              BUY
            </span>
            <span 
              ref={askRef}
              className="text-lg sm:text-xl font-semibold tracking-tight mt-0.5 tabular-nums leading-tight"
            >
              {currentQuote.ask.toLocaleString('en-US', {
                minimumFractionDigits: spec.decimals,
                maximumFractionDigits: spec.decimals,
              })}
            </span>
          </button>

          {/* Right Soft Off-White Instrument Selector Button (GOLD ▼) */}
          <button
            type="button"
            data-testid="terminal-pair-selector-btn"
            onClick={() => setShowPairModal(true)}
            className="col-span-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200/90 active:scale-[0.99] transition-all rounded-[16px] py-2 px-2 flex items-center justify-center gap-1 text-[#0F172A] font-semibold text-xs sm:text-sm cursor-pointer"
          >
            <span className="truncate">{spec.shortName}</span>
            <span className="text-[10px] text-slate-600">▼</span>
          </button>
        </div>
      </section>

      {/* 3. COMPACT LOT PILL + DD BAR + TARGET BAR + LIVE MARKET SUBLINE MATCHING SCREENSHOT */}
      <section className="shrink-0 bg-white px-3.5 py-1 sm:px-6 select-none">
        <div className="w-full max-w-[1800px] mx-auto space-y-1">
          <div className="grid grid-cols-12 gap-2.5 sm:gap-3 items-center">
            {/* Left: Lot Pill (Lot  0.01  ⌄) */}
            <div className="col-span-4 relative">
              <div className="w-full bg-[#F8FAFC] border border-slate-200/90 rounded-full px-3 py-1.5 flex items-center justify-between gap-1">
                <span className="text-xs text-slate-700 font-medium">Lot</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  aria-label="Trading Lot Size"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-12 bg-transparent text-center font-semibold text-[#0F172A] text-xs outline-none tabular-nums"
                />
                <button
                  type="button"
                  aria-label="Lot presets"
                  onClick={() => setShowLotDropdown(!showLotDropdown)}
                  className="text-slate-600 hover:text-slate-900 cursor-pointer p-0.5 shrink-0"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {showLotDropdown && (
                <div className="absolute left-0 top-10 z-40 bg-white border border-slate-200 rounded-2xl p-2 w-48 shadow-xl space-y-2">
                  <div className="flex items-center justify-between gap-1 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0.01, Math.round((parsedVolume - 0.01) * 100) / 100);
                        setVolume(next.toFixed(2));
                      }}
                      className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-xs cursor-pointer"
                    >
                      -0.01
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(100, Math.round((parsedVolume + 0.01) * 100) / 100);
                        setVolume(next.toFixed(2));
                      }}
                      className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-xs cursor-pointer"
                    >
                      +0.01
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LOT_PRESETS.map((lp) => (
                      <button
                        key={lp}
                        type="button"
                        onClick={() => {
                          setVolume(lp);
                          setShowLotDropdown(false);
                        }}
                        className="py-1.5 px-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-[#00B574] hover:text-white text-slate-800 cursor-pointer transition-colors"
                      >
                        {lp}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Middle: DD Progress Column */}
            <div data-testid="terminal-daily-dd-card" className="col-span-4 space-y-0.5">
              <div className="flex items-center justify-between text-[11px] leading-tight">
                <span className="text-[#EF134C] font-semibold uppercase">DD</span>
                <span className="text-[#EF134C] font-semibold tabular-nums">
                  {Math.round(ddUsedPct)}%
                </span>
              </div>
              <div className="w-full bg-slate-200/90 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#EF134C] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, ddUsedPct)}%` }}
                />
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-normal tabular-nums truncate leading-tight">
                ${ddUsedUsd.toFixed(0)} / ${ddLimitUsd.toFixed(0)}
              </div>
            </div>

            {/* Right: TARGET Progress Column */}
            <div data-testid="terminal-profit-target-card" className="col-span-4 space-y-0.5">
              <div className="flex items-center justify-between text-[11px] leading-tight">
                <span className="text-[#009E65] font-semibold uppercase">TARGET</span>
                <span className="text-[#009E65] font-semibold tabular-nums">
                  {isFundedAccount ? 'N/A' : `${Math.round(riskMetrics.profitProgressPct)}%`}
                </span>
              </div>
              <div className="w-full bg-slate-200/90 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#00B574] h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      isFundedAccount
                        ? 0
                        : Math.min(100, Math.max(0, riskMetrics.profitProgressPct))
                    }%`,
                  }}
                />
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-normal truncate leading-tight">
                {isFundedAccount
                  ? 'Funded account'
                  : `$${riskMetrics.netGainUsd.toFixed(0)} / $${riskMetrics.profitTargetUsd.toFixed(0)}`}
              </div>
            </div>
          </div>

          {/* Green Live Market Subline: Live market • 4,045.08 • spread 0.16800 */}
          <div className="text-[11px] sm:text-xs text-[#009E65] font-semibold tracking-tight tabular-nums leading-tight">
            Live market •{' '}
            {liveMidPrice.toLocaleString('en-US', {
              minimumFractionDigits: spec.decimals,
              maximumFractionDigits: spec.decimals,
            })}{' '}
            • spread {rawSpread.toFixed(5)}
          </div>
        </div>
      </section>

      {/* 4. WHITE TIMEFRAME & CANDLE COUNTDOWN BAR MATCHING SCREENSHOT (WITH 1d TIMEFRAME) */}
      <section className="shrink-0 bg-white px-3.5 py-1 sm:px-6 border-b border-slate-200/80 select-none">
        <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          {/* Timeframe Chips + Countdown Box */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {TIMEFRAMES.map((tf) => {
              const isActive = timeframe.label === tf.label;
              return (
                <button
                  key={tf.label}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#F1F5F9] text-[#0F172A] font-bold'
                      : 'bg-transparent text-slate-600 hover:text-[#0F172A] font-medium'
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}

            {/* Bordered Countdown Pill (02:41) */}
            <div className="ml-1 px-2.5 py-1 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-[#0F172A] tabular-nums shrink-0">
              {candleCountdown}
            </div>
          </div>

          {/* Right • LIVE Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-[#009E65] font-semibold shrink-0">
            <span className="h-2 w-2 rounded-full bg-[#00B574] animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>
      </section>

      {/* 5. SINGLE-SCREEN FLEX-1 LIVE CANDLESTICK CHART VIEWPORT WITH ON-CHART EXECUTED TRADES */}
      <section
        className={`flex-1 min-h-0 relative bg-white w-full overflow-hidden ${
          isFullscreenChart ? 'fixed inset-0 z-50 p-2 bg-white' : ''
        }`}
      >
        {/* Instant Execution Banner when a trade is placed (Auto-dismisses in 5s with animation) */}
        {lastExecutedTrade && (
          <div
            className={`absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#0F172A] text-white px-4 py-2 rounded-full font-bold text-xs font-mono shadow-xl flex items-center gap-2 transition-all duration-400 ${
              lastExecutedExiting
                ? 'opacity-0 -translate-y-2 scale-95'
                : 'opacity-100 translate-y-0 scale-100 apex-scale-in'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                lastExecutedTrade.side === 'BUY' ? 'bg-[#00B574]' : 'bg-[#EF154A]'
              }`}
            />
            <span>
              Executed {lastExecutedTrade.side} {lastExecutedTrade.volume.toFixed(2)} Lot{' '}
              {lastExecutedTrade.symbol} @ {lastExecutedTrade.price.toFixed(spec.decimals)}
            </span>
          </div>
        )}

        <ApexLiveCandlestickChart
          symbol={symbol}
          timeframeLabel={timeframe.label}
          timeframeSeconds={timeframe.seconds}
          currentBid={currentQuote.bid}
          currentAsk={currentQuote.ask}
          openPositions={currentSymbolPositions}
          pendingOrders={pendingOrders.filter((o) => o.symbol === symbol)}
          onClosePosition={closePosition}
          onCancelPendingOrder={cancelPendingOrder}
          onModifyPositionSlTp={(orderId, sl, tp) =>
            modifyOrder(orderId, { stopLoss: sl, takeProfit: tp })
          }
          onEditPositionModal={(pos) => {
            setEditingOrder(pos);
            setEditSl(pos.stopLoss ? String(pos.stopLoss) : '');
            setEditTp(pos.takeProfit ? String(pos.takeProfit) : '');
          }}
        />
      </section>

      {/* 6. WHITE BOTTOM NAVIGATION BAR (MATCHING SCREENSHOT: Home | Charts | Position) */}
      <nav className="shrink-0 bg-white border-t border-slate-200 px-6 py-1.5 select-none z-30">
        <div className="max-w-[1200px] mx-auto flex items-center justify-around">
          {/* Home button -> Opens Trader Dashboard */}
          <button
            type="button"
            data-testid="terminal-bottom-home"
            onClick={() => navigate('dashboard')}
            className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#0F172A] transition-colors cursor-pointer py-0.5"
          >
            <Home className="w-5 h-5" />
            <span className="text-[11px] font-medium">Home</span>
          </button>

          {/* Charts button (active) */}
          <button
            type="button"
            data-testid="terminal-bottom-charts"
            onClick={() => setShowPositionsDrawer(false)}
            className="flex flex-col items-center gap-0.5 text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer py-0.5"
          >
            <div className="w-6 h-3 border-2 border-[#475569] -skew-x-12 my-1" />
            <span className="text-[11px] font-medium">Charts</span>
          </button>

          {/* Position button with badge */}
          <button
            type="button"
            data-testid="terminal-bottom-position"
            onClick={() => setShowPositionsDrawer(true)}
            className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-[#0F172A] transition-colors cursor-pointer py-0.5 relative"
          >
            <div className="relative flex items-center justify-center h-5">
              <svg className="w-5 h-5 text-[#475569]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
                <path d="M9 8h6v8H9z" />
              </svg>
              {openPositions.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full bg-[#00B574] text-white font-mono text-[10px] font-extrabold">
                  {openPositions.length}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium">Position</span>
          </button>
        </div>
      </nav>

      {/* 7. ALL PAIRS SELECTOR MODAL (CLEAN WHITE INSTITUTIONAL MODAL) */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-base sm:text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
                  <span>Select Market Instrument</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#009E65] font-mono">
                    24 Live Pairs
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time market feed with instant chart trade execution
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search GOLD, BTCUSD, EURUSD, NAS100..."
                value={pairSearchQuery}
                onChange={(e) => setPairSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-[#0F172A] placeholder-slate-400 focus:border-[#00B574] outline-none"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {INSTRUMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPairCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    pairCategoryFilter === cat.id
                      ? 'bg-[#00B574] text-white font-extrabold'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Instruments List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredSymbols.map((sym) => {
                const itemSpec = INSTRUMENTS[sym];
                const q = quotes[sym] || {
                  bid: 0,
                  ask: 0,
                  change24hPct: 0,
                };
                const isSelected = symbol === sym;
                const isPositive = q.change24hPct >= 0;

                return (
                  <button
                    key={sym}
                    type="button"
                    data-testid={`pair-item-${sym}`}
                    onClick={() => {
                      setSymbol(sym);
                      setShowPairModal(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/80 border-[#00B574]'
                        : 'bg-white border-slate-200 hover:border-[#00B574]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold font-mono text-xs text-[#009E65]">
                        {itemSpec.shortName.slice(0, 4)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[#0F172A]">
                            {itemSpec.shortName}
                          </span>
                          <span className="text-xs font-mono text-slate-500">({sym})</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {itemSpec.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{itemSpec.name}</div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-sm font-extrabold text-[#0F172A] tabular-nums">
                        {q.bid.toFixed(itemSpec.decimals)}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 text-[11px] mt-0.5">
                        <span className="text-slate-500">
                          Ask: {q.ask.toFixed(itemSpec.decimals)}
                        </span>
                        <span
                          className={`font-bold ${
                            isPositive ? 'text-[#00B574]' : 'text-[#EF154A]'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {q.change24hPct}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 8. POSITIONS & TRADING BLOTTER DRAWER (CLEAN WHITE THEME) */}
      {showPositionsDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center">
          <div className="w-full sm:max-w-4xl bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-base sm:text-lg font-extrabold text-[#0F172A]">
                  Positions &amp; Orders Blotter
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 font-mono font-bold text-[#009E65]">
                  #{effectiveAccount.accountNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPositionsDrawer(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Blotter Tabs & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBlotterTab('positions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    blotterTab === 'positions'
                      ? 'bg-[#00B574] text-white font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Open Positions ({openPositions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBlotterTab('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    blotterTab === 'pending'
                      ? 'bg-[#00B574] text-white font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending Orders ({pendingOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBlotterTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    blotterTab === 'history'
                      ? 'bg-[#00B574] text-white font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  History ({tradeHistory.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOrderTicket(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-extrabold text-[#009E65] flex items-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Limit / Stop Order</span>
                </button>

                {blotterTab === 'history' && (
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#009E65]" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {blotterTab === 'positions' &&
                (openPositions.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">
                      No open positions on #{effectiveAccount.accountNumber}.
                    </p>
                    <p>Tap the red SELL or green BUY button to execute a live trade on the chart.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {openPositions.map((pos) => (
                      <div
                        key={pos.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-extrabold text-white ${
                              pos.side === 'BUY' ? 'bg-[#00B574]' : 'bg-[#EF154A]'
                            }`}
                          >
                            {pos.side} {pos.volume}
                          </span>
                          <div>
                            <div className="font-bold text-[#0F172A]">{pos.symbol}</div>
                            <div className="text-[11px] text-slate-500">
                              Entry: {pos.entryPrice} → Current: {pos.currentPrice}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span className="text-amber-700 font-semibold">
                                SL: {pos.stopLoss > 0 ? pos.stopLoss : 'None'}
                              </span>
                              <span>•</span>
                              <span className="text-teal-700 font-semibold">
                                TP: {pos.takeProfit > 0 ? pos.takeProfit : 'None'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-extrabold ${
                              pos.netPnl >= 0 ? 'text-[#00B574]' : 'text-[#EF154A]'
                            }`}
                          >
                            {pos.netPnl >= 0 ? '+' : ''}${pos.netPnl.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingOrder(pos);
                              setEditSl(pos.stopLoss ? String(pos.stopLoss) : '');
                              setEditTp(pos.takeProfit ? String(pos.takeProfit) : '');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold cursor-pointer hover:border-[#00B574]"
                          >
                            Edit SL/TP
                          </button>

                          {(pos.stopLoss > 0 || pos.takeProfit > 0) && (
                            <button
                              type="button"
                              onClick={() => modifyOrder(pos.id, { stopLoss: 0, takeProfit: 0 })}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-500 border border-amber-300 text-amber-800 hover:text-white font-bold cursor-pointer transition-colors"
                            >
                              Remove SL/TP
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => closePosition(pos.id)}
                            className="px-3 py-1 rounded-lg bg-[#EF154A] text-white font-bold cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

              {blotterTab === 'pending' &&
                (pendingOrders.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500">
                    No pending limit or stop orders.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono"
                      >
                        <div>
                          <span className="font-bold text-[#0F172A]">
                            {ord.symbol} · {ord.orderType} {ord.side} ({ord.volume} Lot)
                          </span>
                          <div className="text-slate-500">Trigger @ {ord.entryPrice}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => cancelPendingOrder(ord.id)}
                          className="px-3 py-1 rounded-lg bg-rose-100 text-[#EF154A] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

              {blotterTab === 'history' &&
                (tradeHistory.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500">
                    No closed trades recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tradeHistory.map((h) => (
                      <div
                        key={h.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono"
                      >
                        <div>
                          <span className="font-bold text-[#0F172A]">
                            {h.symbol} {h.side} {h.volume} Lot
                          </span>
                          <div className="text-[11px] text-slate-500">
                            {h.entryPrice} → {h.exitPrice || h.currentPrice}
                          </div>
                        </div>
                        <span
                          className={`font-extrabold ${
                            h.netPnl >= 0 ? 'text-[#00B574]' : 'text-[#EF154A]'
                          }`}
                        >
                          {h.netPnl >= 0 ? '+' : ''}${h.netPnl.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. MODIFY SL/TP MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-extrabold text-[#0F172A]">
                Modify Stop Loss / Take Profit ({editingOrder.symbol})
              </h3>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600">Stop Loss (SL)</label>
                  {editSl && (
                    <button
                      type="button"
                      onClick={() => setEditSl('')}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear SL
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={editSl}
                  onChange={(e) => setEditSl(e.target.value)}
                  placeholder="None (0)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-[#0F172A]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600">Take Profit (TP)</label>
                  {editTp && (
                    <button
                      type="button"
                      onClick={() => setEditTp('')}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear TP
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={editTp}
                  onChange={(e) => setEditTp(e.target.value)}
                  placeholder="None (0)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-[#0F172A]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  modifyOrder(editingOrder.id, {
                    stopLoss: 0,
                    takeProfit: 0,
                  });
                  setEditingOrder(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 border border-rose-200 text-rose-700 hover:text-white font-display font-bold text-xs cursor-pointer transition-colors"
              >
                Remove Both SL &amp; TP
              </button>

              <button
                type="button"
                onClick={() => {
                  modifyOrder(editingOrder.id, {
                    stopLoss: editSl ? parseFloat(editSl) : 0,
                    takeProfit: editTp ? parseFloat(editTp) : 0,
                    entryPrice: editEntry ? parseFloat(editEntry) : undefined,
                  });
                  setEditingOrder(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#00B574] text-white font-display font-extrabold text-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. ADVANCED ORDER TICKET MODAL */}
      {showAdvancedOrderTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-extrabold text-[#0F172A]">
                Advanced Order Ticket ({symbol})
              </h3>
              <button
                type="button"
                onClick={() => setShowAdvancedOrderTicket(false)}
                className="text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdvSide('BUY')}
                className={`py-2.5 rounded-xl font-mono text-xs font-extrabold cursor-pointer ${
                  advSide === 'BUY' ? 'bg-[#00B574] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setAdvSide('SELL')}
                className={`py-2.5 rounded-xl font-mono text-xs font-extrabold cursor-pointer ${
                  advSide === 'SELL' ? 'bg-[#EF154A] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                SELL
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['MARKET', 'LIMIT', 'STOP'] as const).map((ot) => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => setAdvOrderType(ot)}
                  className={`py-2 rounded-xl font-mono text-xs font-bold cursor-pointer ${
                    advOrderType === ot
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {ot}
                </button>
              ))}
            </div>

            {advOrderType !== 'MARKET' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Trigger Entry Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={advEntryPrice}
                  onChange={(e) => setAdvEntryPrice(e.target.value)}
                  placeholder={String(currentQuote.bid)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-[#0F172A]"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  value={advSl}
                  onChange={(e) => setAdvSl(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Take Profit</label>
                <input
                  type="number"
                  step="any"
                  value={advTp}
                  onChange={(e) => setAdvTp(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-[#0F172A]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAdvOrder}
              className={`w-full py-3 rounded-xl font-display font-extrabold text-xs text-white cursor-pointer ${
                advSide === 'BUY' ? 'bg-[#00B574]' : 'bg-[#EF154A]'
              }`}
            >
              Submit {advOrderType} {advSide} Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
