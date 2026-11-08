import { SymbolCode, TradeOrderRecord, TradingAccountRecord } from './tradingEngine';

export interface TradePerformancePoint {
  index: number;
  tradeLabel: string;
  ticketId: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'START';
  volume: number;
  netPnl: number;
  grossPnl: number;
  commission: number;
  cumulativePnl: number;
  balance: number;
  equity: number;
  profitTargetLevel: number;
  maxDrawdownLevel: number;
  timestamp: string;
  status: 'START' | 'OPEN' | 'CLOSED';
}

export interface SymbolPerformanceItem {
  symbol: SymbolCode;
  tradesCount: number;
  wins: number;
  losses: number;
  winRatePct: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  volumeLots: number;
}

export interface TradeAnalyticsSummary {
  totalTrades: number;
  closedTradesCount: number;
  openTradesCount: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  averageWinUsd: number;
  averageLossUsd: number;
  bestTradeUsd: number;
  worstTradeUsd: number;
  expectancyUsd: number;
  cumulativeNetPnlUsd: number;
  startingBalanceUsd: number;
  currentEquityUsd: number;
}

export interface TradePerformanceAnalyticsResult {
  series: TradePerformancePoint[];
  bySymbol: SymbolPerformanceItem[];
  summary: TradeAnalyticsSummary;
}

/**
 * Builds deterministic Recharts-ready time-series, per-trade P&L bars,
 * symbol breakdowns, and institutional KPI metrics from a trader's past orders.
 */
export function buildTradePerformanceAnalytics(
  account: Pick<
    TradingAccountRecord,
    'startingBalance' | 'balance' | 'profitTargetPct' | 'maxDrawdownPct'
  > | null,
  orders: TradeOrderRecord[],
  options?: {
    symbolFilter?: string;
    includeOpenPositions?: boolean;
  }
): TradePerformanceAnalyticsResult {
  const startingBalance = account?.startingBalance ?? 0;
  const profitTargetPct = account?.profitTargetPct ?? 8;
  const maxDrawdownPct = account?.maxDrawdownPct ?? 10;

  const profitTargetLevel = Number(
    (startingBalance * (1 + profitTargetPct / 100)).toFixed(2)
  );
  const maxDrawdownLevel = Number(
    (startingBalance * (1 - maxDrawdownPct / 100)).toFixed(2)
  );

  const includeOpen = options?.includeOpenPositions ?? true;
  const symbolFilter = options?.symbolFilter && options.symbolFilter !== 'ALL'
    ? options.symbolFilter
    : null;

  // Filter relevant executed trades (CLOSED and optionally OPEN positions)
  const relevantOrders = orders
    .filter((o) => {
      if (o.status === 'CLOSED') return true;
      if (includeOpen && o.status === 'OPEN') return true;
      return false;
    })
    .filter((o) => (symbolFilter ? o.symbol === symbolFilter : true))
    .slice()
    .sort((a, b) => {
      const aRec = a as unknown as Record<string, string | undefined>;
      const bRec = b as unknown as Record<string, string | undefined>;
      const tA = new Date(a.closeTime || aRec.closedAt || a.openTime || aRec.openedAt || '').getTime() || 0;
      const tB = new Date(b.closeTime || bRec.closedAt || b.openTime || bRec.openedAt || '').getTime() || 0;
      return tA - tB;
    });

  const series: TradePerformancePoint[] = [
    {
      index: 0,
      tradeLabel: 'Initial',
      ticketId: 'BASELINE',
      symbol: 'ALLOCATION',
      side: 'START',
      volume: 0,
      netPnl: 0,
      grossPnl: 0,
      commission: 0,
      cumulativePnl: 0,
      balance: startingBalance,
      equity: startingBalance,
      profitTargetLevel,
      maxDrawdownLevel,
      timestamp: 'Initial Balance',
      status: 'START',
    },
  ];

  let runningPnl = 0;
  let runningClosedBalance = startingBalance;

  relevantOrders.forEach((ord, idx) => {
    const raw = ord as unknown as Record<string, unknown>;
    const rawNet = Number(ord.netPnl ?? 0);
    const rawGross = Number(ord.grossPnl ?? rawNet);
    const rawComm = Number(ord.commission ?? 0);
    const rawVol = Number(ord.volume ?? raw.lots ?? 0.1);
    const rawTicket = String(ord.ticketId ?? raw.id ?? `ORD-${idx + 1}`);
    const net = Number(rawNet.toFixed(2));
    runningPnl = Number((runningPnl + net).toFixed(2));
    if (ord.status === 'CLOSED') {
      runningClosedBalance = Number((runningClosedBalance + net).toFixed(2));
    }
    const pointEquity = Number((startingBalance + runningPnl).toFixed(2));
    const timeRaw = String(ord.closeTime || raw.closedAt || ord.openTime || raw.openedAt || '');
    const shortTime = timeRaw.includes('T')
      ? timeRaw.slice(5, 16).replace('T', ' ')
      : timeRaw || `Trade #${idx + 1}`;

    series.push({
      index: idx + 1,
      tradeLabel: `#${idx + 1} ${ord.symbol}`,
      ticketId: rawTicket,
      symbol: ord.symbol,
      side: ord.side === 'SELL' ? 'SELL' : 'BUY',
      volume: Number(rawVol.toFixed(2)),
      netPnl: net,
      grossPnl: Number(rawGross.toFixed(2)),
      commission: Number(rawComm.toFixed(2)),
      cumulativePnl: runningPnl,
      balance: runningClosedBalance,
      equity: pointEquity,
      profitTargetLevel,
      maxDrawdownLevel,
      timestamp: shortTime,
      status: ord.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
    });
  });

  // Aggregate by symbol
  const symMap = new Map<SymbolCode, SymbolPerformanceItem>();
  relevantOrders.forEach((ord) => {
    const raw = ord as unknown as Record<string, unknown>;
    const vol = Number(ord.volume ?? raw.lots ?? 0.1);
    const net = Number(ord.netPnl ?? 0);
    const existing = symMap.get(ord.symbol) || {
      symbol: ord.symbol,
      tradesCount: 0,
      wins: 0,
      losses: 0,
      winRatePct: 0,
      netPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
      volumeLots: 0,
    };
    existing.tradesCount += 1;
    existing.volumeLots = Number((existing.volumeLots + vol).toFixed(2));
    existing.netPnl = Number((existing.netPnl + net).toFixed(2));
    if (net > 0) {
      existing.wins += 1;
      existing.grossProfit = Number((existing.grossProfit + net).toFixed(2));
    } else if (net < 0) {
      existing.losses += 1;
      existing.grossLoss = Number((existing.grossLoss + Math.abs(net)).toFixed(2));
    }
    existing.winRatePct = Number(
      ((existing.wins / Math.max(1, existing.tradesCount)) * 100).toFixed(1)
    );
    symMap.set(ord.symbol, existing);
  });

  const bySymbol = Array.from(symMap.values()).sort((a, b) => b.netPnl - a.netPnl);

  // Compute KPI summary
  const winningList = relevantOrders.filter((o) => o.netPnl > 0);
  const losingList = relevantOrders.filter((o) => o.netPnl < 0);
  const totalGrossWin = winningList.reduce((acc, o) => acc + o.netPnl, 0);
  const totalGrossLossAbs = losingList.reduce((acc, o) => acc + Math.abs(o.netPnl), 0);

  const totalTrades = relevantOrders.length;
  const closedTradesCount = relevantOrders.filter((o) => o.status === 'CLOSED').length;
  const openTradesCount = relevantOrders.filter((o) => o.status === 'OPEN').length;
  const winningTrades = winningList.length;
  const losingTrades = losingList.length;

  const winRatePct =
    totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;

  const profitFactor =
    totalGrossLossAbs > 0
      ? Number((totalGrossWin / totalGrossLossAbs).toFixed(2))
      : totalGrossWin > 0
      ? Number(totalGrossWin.toFixed(2))
      : 0;

  const averageWinUsd =
    winningTrades > 0 ? Number((totalGrossWin / winningTrades).toFixed(2)) : 0;
  const averageLossUsd =
    losingTrades > 0 ? Number((totalGrossLossAbs / losingTrades).toFixed(2)) : 0;

  const bestTradeUsd =
    totalTrades > 0
      ? Number(Math.max(...relevantOrders.map((o) => o.netPnl)).toFixed(2))
      : 0;
  const worstTradeUsd =
    totalTrades > 0
      ? Number(Math.min(...relevantOrders.map((o) => o.netPnl)).toFixed(2))
      : 0;

  const expectancyUsd =
    totalTrades > 0 ? Number((runningPnl / totalTrades).toFixed(2)) : 0;

  return {
    series,
    bySymbol,
    summary: {
      totalTrades,
      closedTradesCount,
      openTradesCount,
      winningTrades,
      losingTrades,
      winRatePct,
      profitFactor,
      averageWinUsd,
      averageLossUsd,
      bestTradeUsd,
      worstTradeUsd,
      expectancyUsd,
      cumulativeNetPnlUsd: runningPnl,
      startingBalanceUsd: startingBalance,
      currentEquityUsd: Number((startingBalance + runningPnl).toFixed(2)),
    },
  };
}
