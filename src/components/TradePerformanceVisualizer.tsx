import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  INSTRUMENTS,
  SymbolCode,
  TradeOrderRecord,
  TradingAccountRecord,
} from '../engine/tradingEngine';
import {
  buildTradePerformanceAnalytics,
  TradePerformancePoint,
} from '../engine/performanceAnalytics';
import { ArrowUpRight, BarChart3, Layers, TrendingUp } from 'lucide-react';

interface TradePerformanceVisualizerProps {
  activeAccount: TradingAccountRecord | null;
  orders: TradeOrderRecord[];
  onOpenTerminal: () => void;
}

type ChartMode = 'equity_curve' | 'trade_pnl' | 'symbol_breakdown';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TradePerformancePoint }>;
}

const CustomTradeTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;
  if (!pt) return null;

  return (
    <div className="bg-[#050806]/95 border border-[#00E676]/30 rounded-[12px] p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.95)] backdrop-blur-md space-y-2 min-w-[230px]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
        <span className="text-xs font-extrabold text-[#FFFFFF] font-mono">
          {pt.status === 'START' ? 'Initial Allocation' : `${pt.ticketId} · ${pt.symbol}`}
        </span>
        <span className="text-[11px] font-mono text-[#A7B1AA]">
          {pt.status === 'START' ? 'Baseline' : `${pt.side} ${pt.volume.toFixed(2)}L`}
        </span>
      </div>

      <div className="space-y-1 text-xs font-mono">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#A7B1AA] font-sans">Account Equity</span>
          <span className="font-extrabold text-[#FFFFFF] tabular-nums">
            ${pt.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#A7B1AA] font-sans">Realized Balance</span>
          <span className="font-bold text-[#00E676] tabular-nums">
            ${pt.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        {pt.status !== 'START' && (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#A7B1AA] font-sans">Trade Net P&amp;L</span>
              <span
                className={`font-extrabold tabular-nums ${
                  pt.netPnl >= 0 ? 'text-[#00E676]' : 'text-red-400'
                }`}
              >
                {pt.netPnl >= 0 ? '+' : ''}${pt.netPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#A7B1AA] font-sans">Cumulative P&amp;L</span>
              <span
                className={`font-bold tabular-nums ${
                  pt.cumulativePnl >= 0 ? 'text-[#69F0AE]' : 'text-red-300'
                }`}
              >
                {pt.cumulativePnl >= 0 ? '+' : ''}${pt.cumulativePnl.toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="text-[10px] font-mono text-[#77837B] pt-1 border-t border-white/10 flex items-center justify-between">
        <span>{pt.timestamp}</span>
        <span>{pt.status}</span>
      </div>
    </div>
  );
};

export const TradePerformanceVisualizer: React.FC<TradePerformanceVisualizerProps> = ({
  activeAccount,
  orders,
  onOpenTerminal,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('equity_curve');
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [includeOpenPositions, setIncludeOpenPositions] = useState<boolean>(true);

  const analytics = useMemo(
    () =>
      buildTradePerformanceAnalytics(activeAccount, orders, {
        symbolFilter,
        includeOpenPositions,
      }),
    [activeAccount, orders, symbolFilter, includeOpenPositions]
  );

  const { series, bySymbol, summary } = analytics;
  const symbolOptions = useMemo(() => ['ALL', ...(Object.keys(INSTRUMENTS) as SymbolCode[])], []);

  const equityDomain = useMemo(() => {
    if (series.length === 0) return [0, 100];
    const values = series.flatMap((p) => [p.equity, p.balance]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const pad = Math.max(25, (maxVal - minVal) * 0.15);
    return [Math.max(0, Math.floor(minVal - pad)), Math.ceil(maxVal + pad)];
  }, [series]);

  return (
    <section
      data-testid="recharts-performance-section"
      aria-label="Past Trades Performance Analytics"
      className="scroll-mt-24 bg-[#090D0A] border border-[#00E676]/15 rounded-[14px] p-5 sm:p-6 space-y-6"
    >
      {/* Header & Interactive Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-semibold text-[#00E676] uppercase tracking-wider">
            Interactive Trade Performance Telemetry
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-[#FFFFFF] tracking-tight">
            Equity Curve, Daily Performance &amp; Profit Distribution
          </h2>
          <p className="text-xs text-[#A7B1AA]">
            {activeAccount
              ? `Account #${activeAccount.accountNumber} (${
                  activeAccount.challengeTitle ||
                  (activeAccount as unknown as { challengeName?: string }).challengeName ||
                  'Simulated Evaluation'
                }) · ${summary.totalTrades} Executed Trades Analyzed`
              : `Portfolio Trade History · ${summary.totalTrades} Executed Trades Analyzed`}
          </p>
        </div>

        {/* Chart Mode Segmented Selector + Symbol & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Performance chart view mode"
            className="inline-flex items-center p-1 rounded-[10px] bg-[#030504] border border-white/10"
          >
            <button
              type="button"
              data-testid="chart-mode-equity"
              onClick={() => setChartMode('equity_curve')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'equity_curve'
                  ? 'bg-[#00E676] text-[#000000] font-bold'
                  : 'text-[#A7B1AA] hover:text-[#FFFFFF]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Equity Curve</span>
            </button>
            <button
              type="button"
              data-testid="chart-mode-pnl"
              onClick={() => setChartMode('trade_pnl')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'trade_pnl'
                  ? 'bg-[#00E676] text-[#000000] font-bold'
                  : 'text-[#A7B1AA] hover:text-[#FFFFFF]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Daily / Trade P&amp;L</span>
            </button>
            <button
              type="button"
              data-testid="chart-mode-symbols"
              onClick={() => setChartMode('symbol_breakdown')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'symbol_breakdown'
                  ? 'bg-[#00E676] text-[#000000] font-bold'
                  : 'text-[#A7B1AA] hover:text-[#FFFFFF]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Profit Distribution</span>
            </button>
          </div>

          <select
            aria-label="Filter performance graph by instrument"
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="px-3 py-2 rounded-[9px] bg-[#030504] border border-white/15 text-xs font-mono font-bold text-[#FFFFFF] focus:outline-none focus:border-[#00E676]"
          >
            {symbolOptions.map((sym) => (
              <option key={sym} value={sym}>
                {sym === 'ALL' ? 'All Instruments' : sym}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIncludeOpenPositions((prev) => !prev)}
            className={`px-3 py-2 rounded-[9px] border text-xs font-medium transition-colors cursor-pointer ${
              includeOpenPositions
                ? 'bg-[#0D130F] border-[#00E676]/40 text-[#FFFFFF]'
                : 'bg-[#030504] border-white/15 text-[#A7B1AA]'
            }`}
          >
            {includeOpenPositions ? 'Closed + Open Trades' : 'Closed Trades Only'}
          </button>
        </div>
      </div>

      {/* 6 Quantitative Trade Performance KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-[12px] bg-[#0D130F] border border-[#00E676]/15">
          <div className="text-[12px] font-medium text-[#A7B1AA]">Cumulative Net P&amp;L</div>
          <div
            data-testid="perf-kpi-net-pnl"
            className={`text-lg font-extrabold font-mono mt-1 tabular-nums ${
              summary.cumulativeNetPnlUsd >= 0 ? 'text-[#00E676]' : 'text-red-400'
            }`}
          >
            {summary.cumulativeNetPnlUsd >= 0 ? '+' : ''}$
            {summary.cumulativeNetPnlUsd.toLocaleString('en-US', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-[#77837B] mt-0.5">
            {summary.closedTradesCount} Closed · {summary.openTradesCount} Open
          </div>
        </div>

        <div className="p-3.5 rounded-[12px] bg-[#0D130F] border border-[#00E676]/15">
          <div className="text-[12px] font-medium text-[#A7B1AA]">Win Rate</div>
          <div
            data-testid="perf-kpi-win-rate"
            className="text-lg font-extrabold font-mono text-[#FFFFFF] mt-1 tabular-nums"
          >
            {summary.winRatePct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[#77837B] mt-0.5">
            {summary.winningTrades}W / {summary.losingTrades}L ({summary.totalTrades} Total)
          </div>
        </div>

        <div className="p-3.5 rounded-[12px] bg-[#0D130F] border border-[#00E676]/15">
          <div className="text-[12px] font-medium text-[#A7B1AA]">Profit Factor</div>
          <div className="text-lg font-extrabold font-mono text-[#00E676] mt-1 tabular-nums">
            {summary.profitFactor.toFixed(2)}
          </div>
          <div className="text-[11px] text-[#77837B] mt-0.5">Gross Win / Gross Loss</div>
        </div>

        <div className="p-3.5 rounded-[12px] bg-[#0D130F] border border-[#00E676]/15">
          <div className="text-[12px] font-medium text-[#A7B1AA]">Trade Expectancy</div>
          <div
            className={`text-lg font-extrabold font-mono mt-1 tabular-nums ${
              summary.expectancyUsd >= 0 ? 'text-[#69F0AE]' : 'text-red-300'
            }`}
          >
            {summary.expectancyUsd >= 0 ? '+' : ''}${summary.expectancyUsd.toFixed(2)}
          </div>
          <div className="text-[11px] text-[#77837B] mt-0.5">Avg Net P&amp;L per Trade</div>
        </div>

        <div className="p-3.5 rounded-[12px] bg-[#0D130F] border border-[#00E676]/15">
          <div className="text-[12px] font-medium text-[#A7B1AA]">Avg Win / Avg Loss</div>
          <div className="text-sm font-extrabold font-mono text-[#FFFFFF] mt-1.5 tabular-nums">
            <span className="text-[#00E676]">+${summary.averageWinUsd.toFixed(0)}</span>
            <span className="text-[#77837B] mx-1">/</span>
            <span className="text-red-400">-${summary.averageLossUsd.toFixed(0)}</span>
          </div>
          <div className="text-[11px] text-[#77837B] mt-0.5">Reward-to-Risk Ratio</div>
        </div>

        <div className="p-3.5 rounded-[12px] bg-[#0D130F] border border-[#00E676]/15">
          <div className="text-[12px] font-medium text-[#A7B1AA]">Best / Worst Trade</div>
          <div className="text-sm font-extrabold font-mono text-[#FFFFFF] mt-1.5 tabular-nums">
            <span className="text-[#00E676]">
              +${Math.max(0, summary.bestTradeUsd).toFixed(0)}
            </span>
            <span className="text-[#77837B] mx-1">/</span>
            <span className="text-red-400">
              ${Math.min(0, summary.worstTradeUsd).toFixed(0)}
            </span>
          </div>
          <div className="text-[11px] text-[#77837B] mt-0.5">Single-Trade Extremes</div>
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div
        data-testid="recharts-graph-container"
        className="w-full rounded-[12px] bg-[#030504] border border-white/10 p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 text-[#A7B1AA] font-medium">
            {chartMode === 'equity_curve' && (
              <>
                <span className="flex items-center gap-1.5 text-[#FFFFFF]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E676]" />
                  <span>Account Equity ($)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00C853]" />
                  <span>Realized Balance ($)</span>
                </span>
              </>
            )}
            {chartMode === 'trade_pnl' && (
              <>
                <span className="flex items-center gap-1.5 text-[#00E676]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#00E676]" />
                  <span>Winning Trade P&amp;L</span>
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                  <span>Losing Trade P&amp;L</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#69F0AE]">
                  <span className="w-2.5 h-0.5 bg-[#69F0AE]" />
                  <span>Cumulative Net P&amp;L ($)</span>
                </span>
              </>
            )}
            {chartMode === 'symbol_breakdown' && (
              <span className="text-[#FFFFFF]">
                Net P&amp;L ($) &amp; Profit Distribution by Instrument
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenTerminal}
            className="text-xs font-bold text-[#00E676] hover:text-[#FFFFFF] flex items-center gap-1 cursor-pointer"
          >
            <span>Execute Trade in Terminal</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-[320px] w-full">
          {chartMode === 'equity_curve' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series}
                margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="apexRechartsEquityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E676" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00E676" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="apexRechartsBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C853" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00C853" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#00E676" strokeOpacity={0.08} strokeDasharray="3 3" />
                <XAxis
                  dataKey="tradeLabel"
                  stroke="#77837B"
                  tick={{ fill: '#A7B1AA', fontSize: 11, fontFamily: 'Space Grotesk, monospace' }}
                  tickLine={false}
                />
                <YAxis
                  domain={equityDomain}
                  stroke="#77837B"
                  tick={{ fill: '#A7B1AA', fontSize: 11, fontFamily: 'Space Grotesk, monospace' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                  width={76}
                />
                <Tooltip content={<CustomTradeTooltip />} />
                {summary.startingBalanceUsd > 0 && (
                  <ReferenceLine
                    y={summary.startingBalanceUsd}
                    stroke="#77837B"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                  />
                )}
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="balance"
                  name="Realized Balance"
                  stroke="#00C853"
                  strokeWidth={2}
                  fill="url(#apexRechartsBalanceGrad)"
                  dot={{ r: 3, fill: '#00C853', strokeWidth: 0 }}
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="equity"
                  name="Account Equity"
                  stroke="#00E676"
                  strokeWidth={2.5}
                  fill="url(#apexRechartsEquityGrad)"
                  dot={{ r: 3.5, fill: '#00E676', stroke: '#030504', strokeWidth: 1.5 }}
                  activeDot={{ r: 5.5, fill: '#FFFFFF', stroke: '#00E676', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartMode === 'trade_pnl' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={series}
                margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="#00E676" strokeOpacity={0.08} strokeDasharray="3 3" />
                <XAxis
                  dataKey="tradeLabel"
                  stroke="#77837B"
                  tick={{ fill: '#A7B1AA', fontSize: 11, fontFamily: 'Space Grotesk, monospace' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#77837B"
                  tick={{ fill: '#A7B1AA', fontSize: 11, fontFamily: 'Space Grotesk, monospace' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                  width={76}
                />
                <Tooltip content={<CustomTradeTooltip />} />
                <ReferenceLine y={0} stroke="#77837B" strokeOpacity={0.45} />
                <Bar isAnimationActive={false} dataKey="netPnl" name="Trade Net P&L" radius={[5, 5, 0, 0]} maxBarSize={44}>
                  {series.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.netPnl >= 0 ? '#00E676' : '#EF4444'}
                    />
                  ))}
                </Bar>
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="cumulativePnl"
                  name="Cumulative Net P&L"
                  stroke="#69F0AE"
                  strokeWidth={2.2}
                  dot={{ r: 3.5, fill: '#69F0AE', stroke: '#030504', strokeWidth: 1.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {chartMode === 'symbol_breakdown' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  bySymbol.length > 0
                    ? bySymbol
                    : [
                        {
                          symbol: 'XAUUSD' as SymbolCode,
                          tradesCount: 0,
                          wins: 0,
                          losses: 0,
                          winRatePct: 0,
                          netPnl: 0,
                          grossProfit: 0,
                          grossLoss: 0,
                          volumeLots: 0,
                        },
                      ]
                }
                margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="#00E676" strokeOpacity={0.08} strokeDasharray="3 3" />
                <XAxis
                  dataKey="symbol"
                  stroke="#77837B"
                  tick={{ fill: '#FFFFFF', fontSize: 11, fontFamily: 'Space Grotesk, monospace' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#77837B"
                  tick={{ fill: '#A7B1AA', fontSize: 11, fontFamily: 'Space Grotesk, monospace' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                  width={76}
                />
                <Tooltip
                  formatter={(value: unknown) => [
                    `$${Number(value).toFixed(2)} USD`,
                    'Net Realized/Floating P&L',
                  ]}
                  contentStyle={{
                    backgroundColor: '#050806',
                    borderColor: 'rgba(0,230,118,0.3)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontFamily: 'Space Grotesk, monospace',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine y={0} stroke="#77837B" strokeOpacity={0.45} />
                <Bar isAnimationActive={false} dataKey="netPnl" radius={[5, 5, 0, 0]} maxBarSize={54}>
                  {(bySymbol.length > 0 ? bySymbol : [{ netPnl: 0 }]).map((item, idx) => (
                    <Cell
                      key={`sym-cell-${idx}`}
                      fill={item.netPnl >= 0 ? '#00E676' : '#EF4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Past Trades Execution Log Summary Strip */}
        {summary.totalTrades === 0 ? (
          <div className="p-4 rounded-[10px] bg-[#090D0A] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[#FFFFFF]">
                No Executed Trades Recorded Yet on This Filter
              </div>
              <p className="text-xs text-[#A7B1AA]">
                Execute Market, Limit, or Stop orders in the FUNDED APEX Trading Terminal to populate your live equity curve and profit distribution.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenTerminal}
              className="px-4 py-2.5 rounded-[9px] apex-glow-btn text-xs whitespace-nowrap cursor-pointer shrink-0"
            >
              Open Terminal to Trade →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-white/10 pt-3">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[#77837B] border-b border-white/10 font-medium">
                  <th className="py-2 pr-4">Ticket</th>
                  <th className="py-2 pr-4">Instrument</th>
                  <th className="py-2 pr-4">Side &amp; Lots</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Trade Net P&amp;L</th>
                  <th className="py-2 pr-4 text-right">Cumulative P&amp;L</th>
                  <th className="py-2 text-right">Resulting Equity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {series
                  .filter((pt) => pt.status !== 'START')
                  .slice(-6)
                  .reverse()
                  .map((pt) => (
                    <tr key={pt.ticketId + pt.index} className="hover:bg-[#0D130F]">
                      <td className="py-2 pr-4 font-bold text-[#00E676]">{pt.ticketId}</td>
                      <td className="py-2 pr-4 font-bold text-[#FFFFFF]">{pt.symbol}</td>
                      <td className="py-2 pr-4 text-[#A7B1AA]">
                        <span
                          className={
                            pt.side === 'BUY' ? 'text-[#00E676] font-bold' : 'text-red-400 font-bold'
                          }
                        >
                          {pt.side}
                        </span>{' '}
                        · {pt.volume.toFixed(2)}L
                      </td>
                      <td className="py-2 pr-4 text-[#A7B1AA]">{pt.status}</td>
                      <td
                        className={`py-2 pr-4 text-right font-extrabold tabular-nums ${
                          pt.netPnl >= 0 ? 'text-[#00E676]' : 'text-red-400'
                        }`}
                      >
                        {pt.netPnl >= 0 ? '+' : ''}${pt.netPnl.toFixed(2)}
                      </td>
                      <td
                        className={`py-2 pr-4 text-right font-bold tabular-nums ${
                          pt.cumulativePnl >= 0 ? 'text-[#69F0AE]' : 'text-red-300'
                        }`}
                      >
                        {pt.cumulativePnl >= 0 ? '+' : ''}${pt.cumulativePnl.toFixed(2)}
                      </td>
                      <td className="py-2 text-right font-extrabold text-[#FFFFFF] tabular-nums">
                        ${pt.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
