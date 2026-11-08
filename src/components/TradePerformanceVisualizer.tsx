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
    <div className="bg-[#070A0E]/95 border border-emerald-500/40 rounded-xl p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.95)] backdrop-blur-md space-y-2 min-w-[230px]">
      <div className="flex items-center justify-between gap-3 border-b border-emerald-500/20 pb-1.5">
        <span className="text-xs font-extrabold text-[#FFFFFF] font-mono">
          {pt.status === 'START' ? 'Initial Allocation' : `${pt.ticketId} · ${pt.symbol}`}
        </span>
        <span className="text-[11px] font-mono text-[#9BA4C0]">
          {pt.status === 'START' ? 'Baseline' : `${pt.side} ${pt.volume.toFixed(2)}L`}
        </span>
      </div>

      <div className="space-y-1 text-xs font-mono">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#9BA4C0] font-sans">Account Equity</span>
          <span className="font-extrabold text-[#FFFFFF]">
            ${pt.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#9BA4C0] font-sans">Realized Balance</span>
          <span className="font-bold text-emerald-400">
            ${pt.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        {pt.status !== 'START' && (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#9BA4C0] font-sans">Trade Net P&L</span>
              <span
                className={`font-extrabold ${
                  pt.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {pt.netPnl >= 0 ? '+' : ''}${pt.netPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#9BA4C0] font-sans">Cumulative P&L</span>
              <span
                className={`font-bold ${
                  pt.cumulativePnl >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {pt.cumulativePnl >= 0 ? '+' : ''}${pt.cumulativePnl.toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="text-[10px] font-mono text-[#9BA4C0] pt-1 border-t border-emerald-500/20 flex items-center justify-between">
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
      className="scroll-mt-24 apex-glass-card rounded-2xl p-6 space-y-6"
    >
      {/* Header & Interactive Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-emerald-500/20 pb-5">
        <div className="space-y-1">
          <div className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
            Interactive Trade Performance Telemetry
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#FFFFFF] tracking-tight">
            Past Trades Performance & Equity Analytics
          </h2>
          <p className="text-xs text-[#9BA4C0]">
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
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Performance chart view mode"
            className="inline-flex items-center p-1 rounded-xl bg-[#070A0E] border border-emerald-500/30"
          >
            <button
              type="button"
              data-testid="chart-mode-equity"
              onClick={() => setChartMode('equity_curve')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'equity_curve'
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'text-[#9BA4C0] hover:text-[#FFFFFF]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Equity Curve</span>
            </button>
            <button
              type="button"
              data-testid="chart-mode-pnl"
              onClick={() => setChartMode('trade_pnl')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'trade_pnl'
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'text-[#9BA4C0] hover:text-[#FFFFFF]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Per-Trade P&L</span>
            </button>
            <button
              type="button"
              data-testid="chart-mode-symbols"
              onClick={() => setChartMode('symbol_breakdown')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'symbol_breakdown'
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'text-[#9BA4C0] hover:text-[#FFFFFF]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Instrument</span>
            </button>
          </div>

          <select
            aria-label="Filter performance graph by instrument"
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#070A0E] border border-emerald-500/30 text-xs font-mono font-bold text-[#FFFFFF]"
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
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              includeOpenPositions
                ? 'bg-[#11161D] border-emerald-500/50 text-[#FFFFFF]'
                : 'bg-[#070A0E] border-emerald-500/25 text-[#9BA4C0]'
            }`}
          >
            {includeOpenPositions ? 'Closed + Open Trades' : 'Closed Trades Only'}
          </button>
        </div>
      </div>

      {/* 6 Quantitative Trade Performance KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-3.5 rounded-xl bg-[#11161D] border border-emerald-500/25">
          <div className="text-[11px] font-bold text-[#9BA4C0]">Cumulative Net P&L</div>
          <div
            data-testid="perf-kpi-net-pnl"
            className={`text-lg font-extrabold font-mono mt-1 ${
              summary.cumulativeNetPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {summary.cumulativeNetPnlUsd >= 0 ? '+' : ''}$
            {summary.cumulativeNetPnlUsd.toLocaleString('en-US', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] text-[#9BA4C0] mt-0.5">
            {summary.closedTradesCount} Closed · {summary.openTradesCount} Open
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#11161D] border border-emerald-500/25">
          <div className="text-[11px] font-bold text-[#9BA4C0]">Win Rate</div>
          <div
            data-testid="perf-kpi-win-rate"
            className="text-lg font-extrabold font-mono text-[#FFFFFF] mt-1"
          >
            {summary.winRatePct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#9BA4C0] mt-0.5">
            {summary.winningTrades}W / {summary.losingTrades}L ({summary.totalTrades} Total)
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#11161D] border border-emerald-500/25">
          <div className="text-[11px] font-bold text-[#9BA4C0]">Profit Factor</div>
          <div className="text-lg font-extrabold font-mono text-emerald-400 mt-1">
            {summary.profitFactor.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#9BA4C0] mt-0.5">Gross Win / Gross Loss</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#11161D] border border-emerald-500/25">
          <div className="text-[11px] font-bold text-[#9BA4C0]">Trade Expectancy</div>
          <div
            className={`text-lg font-extrabold font-mono mt-1 ${
              summary.expectancyUsd >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {summary.expectancyUsd >= 0 ? '+' : ''}${summary.expectancyUsd.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#9BA4C0] mt-0.5">Avg Net P&L per Trade</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#11161D] border border-emerald-500/25">
          <div className="text-[11px] font-bold text-[#9BA4C0]">Avg Win / Avg Loss</div>
          <div className="text-sm font-extrabold font-mono text-[#FFFFFF] mt-1.5">
            <span className="text-emerald-400">+${summary.averageWinUsd.toFixed(0)}</span>
            <span className="text-[#9BA4C0] mx-1">/</span>
            <span className="text-rose-400">-${summary.averageLossUsd.toFixed(0)}</span>
          </div>
          <div className="text-[10px] text-[#9BA4C0] mt-0.5">Reward-to-Risk Ratio</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#11161D] border border-emerald-500/25">
          <div className="text-[11px] font-bold text-[#9BA4C0]">Best / Worst Trade</div>
          <div className="text-sm font-extrabold font-mono text-[#FFFFFF] mt-1.5">
            <span className="text-emerald-400">
              +${Math.max(0, summary.bestTradeUsd).toFixed(0)}
            </span>
            <span className="text-[#9BA4C0] mx-1">/</span>
            <span className="text-rose-400">
              ${Math.min(0, summary.worstTradeUsd).toFixed(0)}
            </span>
          </div>
          <div className="text-[10px] text-[#9BA4C0] mt-0.5">Single-Trade Extremes</div>
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div
        data-testid="recharts-graph-container"
        className="w-full rounded-2xl bg-[#070A0E]/90 border border-emerald-500/25 p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 text-[#9BA4C0] font-semibold">
            {chartMode === 'equity_curve' && (
              <>
                <span className="flex items-center gap-1.5 text-[#FFFFFF]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Account Equity ($)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>Realized Balance ($)</span>
                </span>
              </>
            )}
            {chartMode === 'trade_pnl' && (
              <>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                  <span>Winning Trade P&L</span>
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                  <span>Losing Trade P&L</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-0.5 bg-emerald-400" />
                  <span>Cumulative Net P&L ($)</span>
                </span>
              </>
            )}
            {chartMode === 'symbol_breakdown' && (
              <span className="text-[#FFFFFF]">
                Net P&L ($) & Trade Distribution by Instrument
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenTerminal}
            className="text-xs font-extrabold text-emerald-400 hover:text-[#FFFFFF] flex items-center gap-1 cursor-pointer"
          >
            <span>Execute New Trade in Terminal</span>
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
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="apexRechartsBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#10B981" strokeOpacity={0.12} strokeDasharray="3 3" />
                <XAxis
                  dataKey="tradeLabel"
                  stroke="#9BA4C0"
                  tick={{ fill: '#9BA4C0', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={false}
                />
                <YAxis
                  domain={equityDomain}
                  stroke="#9BA4C0"
                  tick={{ fill: '#9BA4C0', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                  width={76}
                />
                <Tooltip content={<CustomTradeTooltip />} />
                {summary.startingBalanceUsd > 0 && (
                  <ReferenceLine
                    y={summary.startingBalanceUsd}
                    stroke="#9BA4C0"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                  />
                )}
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="balance"
                  name="Realized Balance"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#apexRechartsBalanceGrad)"
                  dot={{ r: 3, fill: '#059669', strokeWidth: 0 }}
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="equity"
                  name="Account Equity"
                  stroke="#10B981"
                  strokeWidth={2.75}
                  fill="url(#apexRechartsEquityGrad)"
                  dot={{ r: 4, fill: '#10B981', stroke: '#070A0E', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#10B981', strokeWidth: 2 }}
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
                <CartesianGrid stroke="#10B981" strokeOpacity={0.12} strokeDasharray="3 3" />
                <XAxis
                  dataKey="tradeLabel"
                  stroke="#9BA4C0"
                  tick={{ fill: '#9BA4C0', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#9BA4C0"
                  tick={{ fill: '#9BA4C0', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                  width={76}
                />
                <Tooltip content={<CustomTradeTooltip />} />
                <ReferenceLine y={0} stroke="#9BA4C0" strokeOpacity={0.45} />
                <Bar isAnimationActive={false} dataKey="netPnl" name="Trade Net P&L" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {series.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.netPnl >= 0 ? '#10B981' : '#FB7185'}
                    />
                  ))}
                </Bar>
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="cumulativePnl"
                  name="Cumulative Net P&L"
                  stroke="#00FFA3"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#00FFA3', stroke: '#070A0E', strokeWidth: 1.5 }}
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
                <CartesianGrid stroke="#10B981" strokeOpacity={0.12} strokeDasharray="3 3" />
                <XAxis
                  dataKey="symbol"
                  stroke="#9BA4C0"
                  tick={{ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#9BA4C0"
                  tick={{ fill: '#9BA4C0', fontSize: 11, fontFamily: 'monospace' }}
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
                    backgroundColor: '#070A0E',
                    borderColor: '#10B981',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine y={0} stroke="#9BA4C0" strokeOpacity={0.45} />
                <Bar isAnimationActive={false} dataKey="netPnl" radius={[6, 6, 0, 0]} maxBarSize={54}>
                  {(bySymbol.length > 0 ? bySymbol : [{ netPnl: 0 }]).map((item, idx) => (
                    <Cell
                      key={`sym-cell-${idx}`}
                      fill={item.netPnl >= 0 ? '#10B981' : '#FB7185'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Past Trades Execution Log Summary Strip */}
        {summary.totalTrades === 0 ? (
          <div className="p-4 rounded-xl bg-[#11161D]/80 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-[#FFFFFF]">
                No Past Trades Recorded Yet on This Filter
              </div>
              <p className="text-xs text-[#9BA4C0]">
                Execute Market, Limit, or Stop orders in the FUNDED APEX TradingView Terminal to populate your live Recharts equity curve and trade P&L distribution.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenTerminal}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold whitespace-nowrap cursor-pointer shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              Open Terminal to Trade →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-emerald-500/20 pt-3">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[#9BA4C0] border-b border-emerald-500/20 font-bold">
                  <th className="py-2 pr-4">Ticket</th>
                  <th className="py-2 pr-4">Instrument</th>
                  <th className="py-2 pr-4">Side & Lots</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Trade Net P&L</th>
                  <th className="py-2 pr-4 text-right">Cumulative P&L</th>
                  <th className="py-2 text-right">Resulting Equity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/15 font-mono">
                {series
                  .filter((pt) => pt.status !== 'START')
                  .slice(-6)
                  .reverse()
                  .map((pt) => (
                    <tr key={pt.ticketId + pt.index} className="hover:bg-[#11161D]/60">
                      <td className="py-2 pr-4 font-bold text-emerald-400">{pt.ticketId}</td>
                      <td className="py-2 pr-4 font-extrabold text-[#FFFFFF]">{pt.symbol}</td>
                      <td className="py-2 pr-4 text-[#9BA4C0]">
                        <span
                          className={
                            pt.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                          }
                        >
                          {pt.side}
                        </span>{' '}
                        · {pt.volume.toFixed(2)}L
                      </td>
                      <td className="py-2 pr-4 text-[#9BA4C0]">{pt.status}</td>
                      <td
                        className={`py-2 pr-4 text-right font-extrabold ${
                          pt.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pt.netPnl >= 0 ? '+' : ''}${pt.netPnl.toFixed(2)}
                      </td>
                      <td
                        className={`py-2 pr-4 text-right font-bold ${
                          pt.cumulativePnl >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {pt.cumulativePnl >= 0 ? '+' : ''}${pt.cumulativePnl.toFixed(2)}
                      </td>
                      <td className="py-2 text-right font-extrabold text-[#FFFFFF]">
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
