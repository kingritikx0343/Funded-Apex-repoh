import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  INSTRUMENTS,
  SymbolCode,
  OrderSide,
  TradeOrderRecord,
  roundPrice,
  calculatePositionPnl,
} from '../engine/tradingEngine';
import {
  LiveCandle,
  fetchLiveInstrumentCandles,
  buildSpotAnchoredCandles,
  getTimeframeStepMultiplier,
} from '../engine/liveMarketFeed';

export type ChartTypeMode = 'candles' | 'hollow' | 'bars' | 'line' | 'area' | 'heikin_ashi';
export type DrawingToolMode =
  | 'cursor'
  | 'trendline'
  | 'hline'
  | 'vline'
  | 'ray'
  | 'rect'
  | 'fib'
  | 'long_rr'
  | 'short_rr'
  | 'measure';

export type OscillatorMode = 'none' | 'rsi' | 'macd' | 'atr';

export interface ChartDrawingObject {
  id: string;
  symbol: SymbolCode;
  tool: Exclude<DrawingToolMode, 'cursor'>;
  t1: number;
  p1: number;
  t2: number;
  p2: number;
  color: string;
  label?: string;
}

export interface ChartPositionLine {
  id: string;
  ticketId: string;
  side: OrderSide;
  volume: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  netPnl: number;
}

export interface ExecutedTradeNotice {
  id: string;
  side: OrderSide;
  symbol: SymbolCode;
  volume: number;
  price: number;
  timestamp: number;
}

interface ApexLiveCandlestickChartProps {
  symbol: SymbolCode;
  timeframeLabel: string;
  timeframeSeconds: number;
  bid?: number;
  ask?: number;
  currentBid?: number;
  currentAsk?: number;
  openPositions?: TradeOrderRecord[];
  pendingOrders?: TradeOrderRecord[];
  lastExecutedTrade?: ExecutedTradeNotice | null;
  chartType?: ChartTypeMode;
  onChartTypeChange?: (next: ChartTypeMode) => void;
  showDrawingToolbar?: boolean;
  onClosePosition?: (orderId: string) => void;
  onCancelPendingOrder?: (orderId: string) => void;
  onModifyPositionSlTp?: (orderId: string, nextSl: number, nextTp: number) => void;
  onEditPositionModal?: (pos: TradeOrderRecord) => void;
  onQuickCreateAlert?: (price: number) => void;
}

const PRICE_AXIS_WIDTH = 72;
const TIME_AXIS_HEIGHT = 24;
const DRAWINGS_STORAGE_KEY = 'funded_apex_chart_drawings_v2';

interface DraggingSlTpState {
  orderId: string;
  type: 'SL' | 'TP';
  price: number;
}

export const ApexLiveCandlestickChart: React.FC<ApexLiveCandlestickChartProps> = React.memo(({
  symbol,
  timeframeLabel,
  timeframeSeconds,
  bid,
  ask,
  currentBid,
  currentAsk,
  openPositions = [],
  chartType: externalChartType,
  onChartTypeChange,
  showDrawingToolbar = true,
  onClosePosition,
  onModifyPositionSlTp,
  onEditPositionModal,
  onQuickCreateAlert,
}) => {
  const spec = INSTRUMENTS[symbol] || INSTRUMENTS.XAUUSD;
  const effectiveBid = currentBid ?? bid ?? 0;
  const effectiveAsk = currentAsk ?? ask ?? 0;
  const activePrice =
    effectiveBid > 0 ? effectiveBid : effectiveAsk > 0 ? effectiveAsk - spec.spread : spec.basePrice;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 390,
    height: 460,
  });

  // Chart Type state (synced with optional parent prop)
  const [internalChartType, setInternalChartType] = useState<ChartTypeMode>('candles');
  const activeChartType = externalChartType ?? internalChartType;
  const setChartType = (next: ChartTypeMode) => {
    setInternalChartType(next);
    if (onChartTypeChange) onChartTypeChange(next);
  };

  // Historical + live candle series
  const [candles, setCandles] = useState<LiveCandle[]>(() =>
    buildSpotAnchoredCandles(symbol, timeframeLabel, activePrice)
  );

  // Smooth zoom, horizontal pan, vertical price pan & price-axis scale state
  const [visibleCount, setVisibleCount] = useState<number>(48);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [pricePanOffset, setPricePanOffset] = useState<number>(0);
  const [priceScaleFactor, setPriceScaleFactor] = useState<number>(1);

  // Interactive Analysis Overlays (EMA 20, EMA 50, SMA 200, VWAP, Bollinger Bands, Supertrend)
  const [showEma20, setShowEma20] = useState<boolean>(true);
  const [showEma50, setShowEma50] = useState<boolean>(false);
  const [showSma200, setShowSma200] = useState<boolean>(false);
  const [showVwap, setShowVwap] = useState<boolean>(false);
  const [showBBands, setShowBBands] = useState<boolean>(false);
  const [showSupertrend, setShowSupertrend] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [oscillator, setOscillator] = useState<OscillatorMode>('none');
  const [showIndicatorsMenu, setShowIndicatorsMenu] = useState<boolean>(false);

  // Interactive Chart Drawing Tools state
  const [activeTool, setActiveTool] = useState<DrawingToolMode>('cursor');
  const [drawings, setDrawings] = useState<ChartDrawingObject[]>(() => {
    try {
      const raw = localStorage.getItem(DRAWINGS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [redoStack, setRedoStack] = useState<ChartDrawingObject[]>([]);
  const [draftDrawing, setDraftDrawing] = useState<ChartDrawingObject | null>(null);
  const [lockDrawings, setLockDrawings] = useState<boolean>(false);
  const [hideDrawings, setHideDrawings] = useState<boolean>(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; price: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(drawings));
    } catch {}
  }, [drawings]);

  // Crosshair & Hovered Candle Analysis
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  // Interactive Draggable SL / TP state
  const [draggingSlTp, setDraggingSlTp] = useState<DraggingSlTpState | null>(null);
  const draggingSlTpRef = useRef<DraggingSlTpState | null>(null);

  // Panning, Vertical Price Dragging & Pinch state refs
  const isDraggingRef = useRef<boolean>(false);
  const isPriceAxisDraggingRef = useRef<boolean>(false);
  const isLivePillDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartYRef = useRef<number>(0);
  const dragStartPanRef = useRef<number>(0);
  const dragStartPricePanRef = useRef<number>(0);
  const dragStartPriceScaleRef = useRef<number>(1);
  const dragStartSpanRef = useRef<number>(1);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartCountRef = useRef<number>(48);
  const rafPanRef = useRef<number | null>(null);

  const latestPriceRef = useRef<number>(activePrice);
  latestPriceRef.current = activePrice;

  const openPositionsRef = useRef<ChartPositionLine[]>(openPositions);
  openPositionsRef.current = openPositions;

  // Measure container size with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 5 && rect.height > 5) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const timer = setTimeout(() => updateSize(), 400);

    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        requestAnimationFrame(() => {
          setDimensions({ width, height });
        });
      }
    });
    observer.observe(el);
    window.addEventListener('resize', updateSize, { passive: true });
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Load real multi-timeframe OHLCV candles whenever symbol or timeframe changes
  useEffect(() => {
    let cancelled = false;
    setPanOffset(0);
    setPricePanOffset(0);
    setPriceScaleFactor(1);
    setCrosshair(null);

    const immediate = buildSpotAnchoredCandles(symbol, timeframeLabel, latestPriceRef.current);
    setCandles(immediate);

    const loadCandles = async () => {
      try {
        const fetched = await fetchLiveInstrumentCandles(
          symbol,
          timeframeLabel,
          latestPriceRef.current
        );
        if (!cancelled && fetched.length > 0) {
          setCandles((prev) => {
            const prevLast = prev[prev.length - 1];
            const next = [...fetched];
            const lastIdx = next.length - 1;
            const liveNow = roundPrice(latestPriceRef.current, symbol);
            if (prevLast && next[lastIdx] && prevLast.time === next[lastIdx].time) {
              const mergedHigh = Math.max(next[lastIdx].high, prevLast.high, liveNow);
              const mergedLow = Math.min(next[lastIdx].low, prevLast.low, liveNow);
              next[lastIdx] = {
                ...next[lastIdx],
                close: liveNow,
                high: roundPrice(mergedHigh, symbol),
                low: roundPrice(mergedLow, symbol),
              };
            } else if (next[lastIdx]) {
              next[lastIdx] = {
                ...next[lastIdx],
                close: liveNow,
                high: roundPrice(Math.max(next[lastIdx].high, liveNow), symbol),
                low: roundPrice(Math.min(next[lastIdx].low, liveNow), symbol),
              };
            }
            return next;
          });
        }
      } catch {
        // Fallback already rendered
      }
    };

    loadCandles();
    const syncTimer = setInterval(loadCandles, 18000);
    return () => {
      cancelled = true;
      clearInterval(syncTimer);
    };
  }, [symbol, timeframeLabel, timeframeSeconds]);

  // Real-time tick update on the active (right-most) candle
  useEffect(() => {
    if (!activePrice || activePrice <= 0) return;

    setCandles((prev) => {
      if (prev.length === 0) {
        return buildSpotAnchoredCandles(symbol, timeframeLabel, activePrice);
      }

      const next = [...prev];
      const lastIdx = next.length - 1;
      const last = { ...next[lastIdx] };
      const bucketMs = timeframeSeconds * 1000;
      const nowMs = Date.now();
      const activeBucketTime = Math.floor(nowMs / bucketMs) * bucketMs;
      const minPip = Math.pow(10, -spec.decimals);
      const tfScale = getTimeframeStepMultiplier(timeframeLabel);
      const step = Math.max(spec.spread * 1.8, spec.volatility * tfScale);

      if (activeBucketTime > last.time) {
        const newOpen = last.close;
        const newClose = roundPrice(activePrice, symbol);
        const bodyTop = Math.max(newOpen, newClose);
        const bodyBot = Math.min(newOpen, newClose);
        const initialWick = Math.max(minPip * 2, step * 0.08);
        next.push({
          time: activeBucketTime,
          open: newOpen,
          high: roundPrice(bodyTop + initialWick, symbol),
          low: roundPrice(bodyBot - initialWick, symbol),
          close: newClose,
          volume: 14,
          isExchangeKline: last.isExchangeKline,
        });
        if (next.length > 500) next.shift();
      } else {
        const pctDiff = Math.abs(activePrice - last.close) / (last.close || 1);
        if (pctDiff > 0.05) {
          const delta = activePrice - last.close;
          for (let i = 0; i < next.length; i++) {
            const c = next[i];
            const o = roundPrice(c.open + delta, symbol);
            const cl =
              i === lastIdx ? roundPrice(activePrice, symbol) : roundPrice(c.close + delta, symbol);
            const bTop = Math.max(o, cl);
            const bBot = Math.min(o, cl);
            const maxW = Math.max(step * 1.8, (bTop - bBot) * 1.9);
            next[i] = {
              ...c,
              open: o,
              close: cl,
              high: roundPrice(Math.min(Math.max(c.high + delta, bTop), bTop + maxW), symbol),
              low: roundPrice(Math.max(Math.min(c.low + delta, bBot), bBot - maxW), symbol),
            };
          }
          return next;
        }

        const nextClose = roundPrice(activePrice, symbol);
        last.close = nextClose;
        last.high = roundPrice(Math.max(last.high, last.open, nextClose), symbol);
        last.low = roundPrice(Math.min(last.low, last.open, nextClose), symbol);
        last.volume = (last.volume || 20) + 1;
        next[lastIdx] = last;
      }

      return next;
    });
  }, [activePrice, symbol, timeframeLabel, timeframeSeconds, spec.decimals, spec.spread, spec.volatility]);

  // Precompute technical indicators (EMA 20, EMA 50, SMA 200, VWAP, Bollinger Bands, Supertrend, RSI 14, MACD, ATR 14)
  const indicators = useMemo(() => {
    const len = candles.length;
    const ema20: number[] = new Array(len);
    const ema50: number[] = new Array(len);
    const sma200: number[] = new Array(len);
    const vwap: number[] = new Array(len);
    const bbUpper: number[] = new Array(len);
    const bbLower: number[] = new Array(len);
    const supertrend: number[] = new Array(len);
    const supertrendDir: (1 | -1)[] = new Array(len);
    const rsi14: number[] = new Array(len);
    const atr14: number[] = new Array(len);
    const macdLine: number[] = new Array(len);
    const macdSignal: number[] = new Array(len);
    const macdHist: number[] = new Array(len);

    const k20 = 2 / (20 + 1);
    const k50 = 2 / (50 + 1);
    const k12 = 2 / (12 + 1);
    const k26 = 2 / (26 + 1);
    const k9 = 2 / (9 + 1);

    let cumPV = 0;
    let cumV = 0;
    let ema12 = 0;
    let ema26 = 0;
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < len; i++) {
      const c = candles[i];
      const close = c.close;
      ema20[i] = i === 0 ? close : close * k20 + ema20[i - 1] * (1 - k20);
      ema50[i] = i === 0 ? close : close * k50 + ema50[i - 1] * (1 - k50);

      // SMA 200
      const sStart = Math.max(0, i - 199);
      let sSum = 0;
      for (let j = sStart; j <= i; j++) sSum += candles[j].close;
      sma200[i] = sSum / (i - sStart + 1);

      // VWAP
      const typPrice = (c.high + c.low + c.close) / 3;
      const vol = Math.max(1, c.volume || 15);
      cumPV += typPrice * vol;
      cumV += vol;
      vwap[i] = cumPV / cumV;

      // Bollinger Bands (20, 2)
      const start = Math.max(0, i - 19);
      const count = i - start + 1;
      let sum = 0;
      for (let j = start; j <= i; j++) sum += candles[j].close;
      const mean = sum / count;
      let variance = 0;
      for (let j = start; j <= i; j++) {
        const diff = candles[j].close - mean;
        variance += diff * diff;
      }
      const stdDev = Math.sqrt(variance / count);
      bbUpper[i] = mean + stdDev * 2;
      bbLower[i] = mean - stdDev * 2;

      // True Range & ATR (14)
      const prevClose = i > 0 ? candles[i - 1].close : c.open;
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      );
      atr14[i] = i === 0 ? tr : (atr14[i - 1] * 13 + tr) / 14;

      // Supertrend (10, 3)
      const hl2 = (c.high + c.low) / 2;
      const basicUpper = hl2 + 2.6 * atr14[i];
      const basicLower = hl2 - 2.6 * atr14[i];
      if (i === 0) {
        supertrend[i] = basicLower;
        supertrendDir[i] = 1;
      } else {
        const prevDir = supertrendDir[i - 1];
        const prevSt = supertrend[i - 1];
        if (prevDir === 1) {
          const nextLower = Math.max(basicLower, prevSt);
          if (close < nextLower) {
            supertrendDir[i] = -1;
            supertrend[i] = basicUpper;
          } else {
            supertrendDir[i] = 1;
            supertrend[i] = nextLower;
          }
        } else {
          const nextUpper = Math.min(basicUpper, prevSt);
          if (close > nextUpper) {
            supertrendDir[i] = 1;
            supertrend[i] = basicLower;
          } else {
            supertrendDir[i] = -1;
            supertrend[i] = nextUpper;
          }
        }
      }

      // RSI (14)
      if (i === 0) {
        rsi14[i] = 50;
      } else {
        const change = close - candles[i - 1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;
        avgGain = (avgGain * 13 + gain) / 14;
        avgLoss = (avgLoss * 13 + loss) / 14;
        if (avgLoss <= 1e-9) rsi14[i] = 100;
        else {
          const rs = avgGain / avgLoss;
          rsi14[i] = 100 - 100 / (1 + rs);
        }
      }

      // MACD (12, 26, 9)
      ema12 = i === 0 ? close : close * k12 + ema12 * (1 - k12);
      ema26 = i === 0 ? close : close * k26 + ema26 * (1 - k26);
      macdLine[i] = ema12 - ema26;
      macdSignal[i] = i === 0 ? macdLine[i] : macdLine[i] * k9 + macdSignal[i - 1] * (1 - k9);
      macdHist[i] = macdLine[i] - macdSignal[i];
    }

    return {
      ema20,
      ema50,
      sma200,
      vwap,
      bbUpper,
      bbLower,
      supertrend,
      supertrendDir,
      rsi14,
      atr14,
      macdLine,
      macdSignal,
      macdHist,
    };
  }, [candles]);

  // Slice visible candles based on zoom & panOffset
  const visibleSliceInfo = useMemo(() => {
    if (candles.length === 0) return { slice: [] as LiveCandle[], startIndex: 0 };
    const count = Math.max(20, visibleCount);
    const liveCenterSlot = Math.floor(count * 0.52);
    const lastIdx = candles.length - 1;
    const minOff = -Math.floor(count * 0.38);
    const maxOff = Math.max(0, candles.length - Math.floor(count * 0.2));
    const clampedOffset = Math.min(maxOff, Math.max(minOff, panOffset));
    const startIdx = Math.max(0, Math.floor(lastIdx - liveCenterSlot - clampedOffset - 1));
    const endIdx = Math.min(
      candles.length,
      Math.ceil(lastIdx + (count - liveCenterSlot) - clampedOffset + 1)
    );
    return {
      slice: candles.slice(startIdx, Math.max(startIdx + 1, endIdx)),
      startIndex: startIdx,
    };
  }, [candles, visibleCount, panOffset]);

  const visibleCandles = visibleSliceInfo.slice;

  // Compute Y-axis price bounds
  const priceBounds = useMemo(() => {
    const minPip = Math.pow(10, -spec.decimals);
    const tfScale = getTimeframeStepMultiplier(timeframeLabel);
    const step = Math.max(spec.spread * 1.8, spec.volatility * tfScale);

    if (visibleCandles.length === 0) {
      return {
        minPrice: activePrice - step * 10,
        maxPrice: activePrice + step * 10,
      };
    }

    let minP = Infinity;
    let maxP = -Infinity;
    for (const c of visibleCandles) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    }

    if (panOffset === 0 && activePrice > 0) {
      if (activePrice < minP) minP = activePrice;
      if (activePrice > maxP) maxP = activePrice;
    }

    const candleSpan = Math.max(maxP - minP, step * 5, minPip * 20);

    for (const pos of openPositions) {
      if (
        pos.entryPrice > 0 &&
        Math.abs(pos.entryPrice - activePrice) <= candleSpan * 1.6
      ) {
        if (pos.entryPrice < minP) minP = pos.entryPrice;
        if (pos.entryPrice > maxP) maxP = pos.entryPrice;
      }
      const effSl =
        draggingSlTp && draggingSlTp.orderId === pos.id && draggingSlTp.type === 'SL'
          ? draggingSlTp.price
          : pos.stopLoss;
      const effTp =
        draggingSlTp && draggingSlTp.orderId === pos.id && draggingSlTp.type === 'TP'
          ? draggingSlTp.price
          : pos.takeProfit;

      if (effSl > 0 && Math.abs(effSl - activePrice) <= candleSpan * 1.6) {
        if (effSl < minP) minP = effSl;
        if (effSl > maxP) maxP = effSl;
      }
      if (effTp > 0 && Math.abs(effTp - activePrice) <= candleSpan * 1.6) {
        if (effTp < minP) minP = effTp;
        if (effTp > maxP) maxP = effTp;
      }
    }

    const baseSpan = Math.max(maxP - minP, step * 5, minPip * 20);
    const padTop = baseSpan * 0.14;
    const padBottom = baseSpan * 0.14;
    const rawMin = minP - padBottom;
    const rawMax = maxP + padTop;
    const mid = (rawMin + rawMax) / 2 + pricePanOffset;
    const halfScaled = ((rawMax - rawMin) / 2) * priceScaleFactor;

    return {
      minPrice: mid - halfScaled,
      maxPrice: mid + halfScaled,
    };
  }, [
    visibleCandles,
    activePrice,
    panOffset,
    pricePanOffset,
    priceScaleFactor,
    openPositions,
    draggingSlTp,
    spec.decimals,
    spec.spread,
    spec.volatility,
    timeframeLabel,
  ]);

  const oscHeight = oscillator !== 'none' ? Math.min(105, Math.round(dimensions.height * 0.22)) : 0;
  const plotWidth = Math.max(120, dimensions.width - PRICE_AXIS_WIDTH);
  const plotHeight = Math.max(120, dimensions.height - TIME_AXIS_HEIGHT - oscHeight);
  const totalSlots = Math.max(20, visibleCount);

  // Refs for 60fps canvas loop
  const candlesRef = useRef<LiveCandle[]>([]);
  useEffect(() => { candlesRef.current = candles; }, [candles]);

  const visibleCountRef = useRef(visibleCount);
  useEffect(() => { visibleCountRef.current = visibleCount; }, [visibleCount]);

  const panOffsetRef = useRef(panOffset);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);

  const indicatorsRef = useRef(indicators);
  useEffect(() => { indicatorsRef.current = indicators; }, [indicators]);

  const crosshairRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { crosshairRef.current = crosshair; }, [crosshair]);

  const priceBoundsRef = useRef(priceBounds);
  useEffect(() => { priceBoundsRef.current = priceBounds; }, [priceBounds]);

  const chartTypeRef = useRef(activeChartType);
  useEffect(() => { chartTypeRef.current = activeChartType; }, [activeChartType]);

  const showEma20Ref = useRef(showEma20);
  useEffect(() => { showEma20Ref.current = showEma20; }, [showEma20]);
  const showEma50Ref = useRef(showEma50);
  useEffect(() => { showEma50Ref.current = showEma50; }, [showEma50]);
  const showSma200Ref = useRef(showSma200);
  useEffect(() => { showSma200Ref.current = showSma200; }, [showSma200]);
  const showVwapRef = useRef(showVwap);
  useEffect(() => { showVwapRef.current = showVwap; }, [showVwap]);
  const showBBandsRef = useRef(showBBands);
  useEffect(() => { showBBandsRef.current = showBBands; }, [showBBands]);
  const showSupertrendRef = useRef(showSupertrend);
  useEffect(() => { showSupertrendRef.current = showSupertrend; }, [showSupertrend]);
  const showVolumeRef = useRef(showVolume);
  useEffect(() => { showVolumeRef.current = showVolume; }, [showVolume]);
  const oscillatorRef = useRef(oscillator);
  useEffect(() => { oscillatorRef.current = oscillator; }, [oscillator]);
  const drawingsRef = useRef(drawings);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);
  const draftDrawingRef = useRef(draftDrawing);
  useEffect(() => { draftDrawingRef.current = draftDrawing; }, [draftDrawing]);
  const hideDrawingsRef = useRef(hideDrawings);
  useEffect(() => { hideDrawingsRef.current = hideDrawings; }, [hideDrawings]);

  const slotWidth = plotWidth / totalSlots;

  const priceToY = useCallback(
    (price: number) => {
      const span = Math.max(1e-9, priceBounds.maxPrice - priceBounds.minPrice);
      const ratio = (priceBounds.maxPrice - price) / span;
      return ratio * plotHeight;
    },
    [priceBounds.maxPrice, priceBounds.minPrice, plotHeight]
  );

  const yToPrice = useCallback(
    (y: number) => {
      const clampedY = Math.max(4, Math.min(plotHeight - 4, y));
      const span = Math.max(1e-9, priceBounds.maxPrice - priceBounds.minPrice);
      const raw = priceBounds.maxPrice - (clampedY / plotHeight) * span;
      return roundPrice(Math.max(spec.spread, raw), symbol);
    },
    [priceBounds.maxPrice, priceBounds.minPrice, plotHeight, spec.spread, symbol]
  );

  const xToTime = useCallback(
    (x: number) => {
      if (candles.length === 0) return Date.now();
      const liveCenterSlot = Math.floor(totalSlots * 0.52);
      const lastIdx = candles.length - 1;
      const slot = x / Math.max(1, slotWidth) - 0.5;
      const k = lastIdx + slot - liveCenterSlot - panOffset;
      const kInt = Math.round(k);
      if (kInt >= 0 && kInt < candles.length) return candles[kInt].time;
      return candles[lastIdx].time + (k - lastIdx) * timeframeSeconds * 1000;
    },
    [candles, totalSlots, slotWidth, panOffset, timeframeSeconds]
  );

  // Determine inspected candle
  const inspectedCandle = useMemo(() => {
    if (candles.length === 0) return null;
    if (crosshair && crosshair.x >= 0 && crosshair.x <= plotWidth) {
      const liveCenterSlot = Math.floor(totalSlots * 0.52);
      const lastIdx = candles.length - 1;
      const hoveredSlot = crosshair.x / slotWidth - 0.5;
      const k = Math.round(lastIdx + hoveredSlot - liveCenterSlot - panOffset);
      if (k >= 0 && k < candles.length) {
        return candles[k];
      }
    }
    return candles[candles.length - 1];
  }, [candles, crosshair, plotWidth, slotWidth, totalSlots, panOffset]);

  // Global window listeners for smooth SL/TP dragging
  useEffect(() => {
    if (!draggingSlTp) return;

    const clampSlTpPriceForPosition = (
      orderId: string,
      type: 'SL' | 'TP',
      rawPrice: number
    ): number => {
      const pos = openPositionsRef.current.find((p) => p.id === orderId);
      const liveMark = latestPriceRef.current > 0 ? latestPriceRef.current : pos?.entryPrice || rawPrice;
      const minPip = Math.pow(10, -spec.decimals);
      const minDist = Math.max(minPip * 2, spec.spread * 0.5);
      if (!pos) return roundPrice(rawPrice, symbol);

      if (pos.side === 'BUY') {
        if (type === 'SL') {
          return roundPrice(Math.min(rawPrice, liveMark - minDist), symbol);
        }
        return roundPrice(Math.max(rawPrice, liveMark + minDist), symbol);
      } else {
        if (type === 'SL') {
          return roundPrice(Math.max(rawPrice, liveMark + minDist), symbol);
        }
        return roundPrice(Math.min(rawPrice, liveMark - minDist), symbol);
      }
    };

    const updateDragFromClientY = (clientY: number) => {
      const container = containerRef.current;
      if (!container || !draggingSlTpRef.current) return;
      const rect = container.getBoundingClientRect();
      const relY = clientY - rect.top;
      const rawPrice = yToPrice(relY);
      const nextPrice = clampSlTpPriceForPosition(
        draggingSlTpRef.current.orderId,
        draggingSlTpRef.current.type,
        rawPrice
      );
      const nextState: DraggingSlTpState = {
        ...draggingSlTpRef.current,
        price: nextPrice,
      };
      draggingSlTpRef.current = nextState;
      setDraggingSlTp(nextState);
    };

    const finishDrag = () => {
      const current = draggingSlTpRef.current;
      if (current && onModifyPositionSlTp) {
        const pos = openPositionsRef.current.find((p) => p.id === current.orderId);
        if (pos) {
          const safePrice = clampSlTpPriceForPosition(current.orderId, current.type, current.price);
          const nextSl = current.type === 'SL' ? safePrice : pos.stopLoss;
          const nextTp = current.type === 'TP' ? safePrice : pos.takeProfit;
          onModifyPositionSlTp(pos.id, nextSl, nextTp);
        }
      }
      draggingSlTpRef.current = null;
      setDraggingSlTp(null);
    };

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateDragFromClientY(e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        updateDragFromClientY(e.touches[0].clientY);
      }
    };
    const onMouseUp = () => finishDrag();
    const onTouchEnd = () => finishDrag();

    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [draggingSlTp, yToPrice, onModifyPositionSlTp, spec.decimals, spec.spread, symbol]);

  const startSlTpDrag = useCallback(
    (orderId: string, type: 'SL' | 'TP', initialPrice: number, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      const state: DraggingSlTpState = { orderId, type, price: initialPrice };
      draggingSlTpRef.current = state;
      setDraggingSlTp(state);
    },
    []
  );

  // Format price ticks cleanly for right price axis
  const formatAxisPrice = useCallback(
    (p: number) => {
      if (symbol === 'XAUUSD' || symbol === 'ETHUSD' || symbol === 'US500') {
        return p.toFixed(2);
      }
      if (symbol === 'BTCUSD' || symbol === 'NAS100' || symbol === 'US30') {
        return p.toFixed(2);
      }
      return p.toFixed(spec.decimals);
    },
    [symbol, spec.decimals]
  );

  const formatAxisTime = useCallback(
    (tsMs: number) => {
      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const d = new Date(tsMs);
      const mon = MONTHS[d.getMonth()] || 'Jan';
      if (timeframeSeconds >= 2592000) {
        return `${mon} '${String(d.getFullYear()).slice(-2)}`;
      }
      if (timeframeSeconds >= 86400) {
        return `${mon} ${d.getDate()}`;
      }
      if (timeframeSeconds >= 14400) {
        return `${mon} ${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:00`;
      }
      if (timeframeSeconds < 60) {
        return `${d.getMinutes().toString().padStart(2, '0')}:${d
          .getSeconds()
          .toString()
          .padStart(2, '0')}`;
      }
      return `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    },
    [timeframeSeconds]
  );

  // Draw crisp 60fps TradingView-inspired chart on HTML5 Canvas
  useEffect(() => {
    let rafId: number;
    let smoothLivePrice = latestPriceRef.current;
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        rafId = requestAnimationFrame(render);
        return;
      }

      const targetLivePrice = latestPriceRef.current;
      if (
        !Number.isFinite(smoothLivePrice) ||
        smoothLivePrice <= 0 ||
        Math.abs(targetLivePrice - smoothLivePrice) > spec.volatility * 6
      ) {
        smoothLivePrice = targetLivePrice;
      } else {
        smoothLivePrice += (targetLivePrice - smoothLivePrice) * 0.28;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = dimensions;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Deep Aqua-Fintech Institutional Chart Background (#080D0B)
      ctx.fillStyle = '#080D0B';
      ctx.fillRect(0, 0, width, height);

      const pb = priceBoundsRef.current;
      const oscMode = oscillatorRef.current;
      const curOscH = oscMode !== 'none' ? Math.min(105, Math.round(height * 0.22)) : 0;
      const plotW = Math.max(120, width - PRICE_AXIS_WIDTH);
      const plotH = Math.max(120, height - TIME_AXIS_HEIGHT - curOscH);
      const priceSpan = pb.maxPrice - pb.minPrice;

      const pToY = (price: number) => {
        const ratio = (pb.maxPrice - price) / Math.max(1e-9, priceSpan);
        return ratio * plotH;
      };

      // 2. Price Axis Grid Lines & Right Axis Labels
      const gridRows = 8;
      const rawStep = priceSpan / gridRows;
      const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(1e-9, rawStep))));
      const residual = rawStep / magnitude;
      let niceMultiple = 1;
      if (residual > 5) niceMultiple = 10;
      else if (residual > 2.5) niceMultiple = 5;
      else if (residual > 2) niceMultiple = 2.5;
      else if (residual > 1) niceMultiple = 2;
      const niceStep = Math.max(Math.pow(10, -spec.decimals), niceMultiple * magnitude);
      const firstTick = Math.ceil(pb.minPrice / niceStep) * niceStep;

      ctx.strokeStyle = 'rgba(40, 214, 176, 0.05)';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#8B9A92';
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      for (let tick = firstTick; tick <= pb.maxPrice; tick += niceStep) {
        const y = Math.round(pToY(tick)) + 0.5;
        if (y < 12 || y > plotH - 12) continue;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotW, y);
        ctx.stroke();
        ctx.fillText(formatAxisPrice(tick), plotW + 7, y);
      }

      // 3. Vertical Time Grid Lines & Time Axis Labels + Chart Series
      const currentCandles = candlesRef.current;
      const visCount = Math.max(20, visibleCountRef.current);
      const pOffset = panOffsetRef.current;

      if (currentCandles.length > 0) {
        const liveCenterSlot = Math.floor(visCount * 0.52);
        const lastIdx = currentCandles.length - 1;
        const minOff = -Math.floor(visCount * 0.38);
        const maxOff = Math.max(0, currentCandles.length - Math.floor(visCount * 0.2));
        const clampedOff = Math.min(maxOff, Math.max(minOff, pOffset));
        const sWidth = plotW / visCount;

        const getCandleX = (k: number) =>
          (liveCenterSlot + (k - lastIdx) + clampedOff + 0.5) * sWidth;

        const timeToX = (tMs: number) => {
          const lastBarTime = currentCandles[lastIdx].time;
          const barDiff = (tMs - lastBarTime) / Math.max(1000, timeframeSeconds * 1000);
          return getCandleX(lastIdx + barDiff);
        };

        const startIdx = Math.max(0, Math.floor(lastIdx - liveCenterSlot - clampedOff - 1));
        const endIdx = Math.min(
          currentCandles.length,
          Math.ceil(lastIdx + (visCount - liveCenterSlot) - clampedOff + 1)
        );
        const visibleSlice = currentCandles.slice(startIdx, Math.max(startIdx + 1, endIdx));

        ctx.textAlign = 'center';
        ctx.fillStyle = '#8B9A92';
        ctx.font = '600 10.5px "Plus Jakarta Sans", sans-serif';
        const timeStepSlots = Math.max(6, Math.round(visCount / 6));
        const minGridK = Math.floor(lastIdx - liveCenterSlot - clampedOff - 1);
        const maxGridK = Math.ceil(lastIdx + (visCount - liveCenterSlot) - clampedOff + 1);

        for (let k = minGridK; k <= maxGridK; k++) {
          if (Math.abs(lastIdx - k) % timeStepSlots !== 0) continue;
          const cx = Math.round(getCandleX(k)) + 0.5;
          if (cx < 24 || cx > plotW - 24) continue;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.032)';
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, plotH + curOscH);
          ctx.stroke();

          const barTime =
            k >= 0 && k < currentCandles.length
              ? currentCandles[k].time
              : currentCandles[lastIdx].time + (k - lastIdx) * timeframeSeconds * 1000;
          ctx.fillText(formatAxisTime(barTime), cx, plotH + curOscH + TIME_AXIS_HEIGHT / 2);
        }

        // Separators
        ctx.strokeStyle = 'rgba(40, 214, 176, 0.14)';
        ctx.beginPath();
        ctx.moveTo(plotW + 0.5, 0);
        ctx.lineTo(plotW + 0.5, height);
        ctx.moveTo(0, plotH + 0.5);
        ctx.lineTo(width, plotH + 0.5);
        if (curOscH > 0) {
          ctx.moveTo(0, plotH + curOscH + 0.5);
          ctx.lineTo(width, plotH + curOscH + 0.5);
        }
        ctx.stroke();

        // Clip plot area
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, plotW, plotH);
        ctx.clip();

        // 4. Overlays (Bollinger Bands, SMA 200, VWAP, EMA 50, EMA 20, Supertrend)
        const ind = indicatorsRef.current;
        if (showBBandsRef.current && visibleSlice.length > 1) {
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i < visibleSlice.length; i++) {
            const k = startIdx + i;
            const cx = getCandleX(k);
            const y = pToY(ind.bbUpper[k]);
            if (i === 0) ctx.moveTo(cx, y);
            else ctx.lineTo(cx, y);
          }
          for (let i = visibleSlice.length - 1; i >= 0; i--) {
            const k = startIdx + i;
            const cx = getCandleX(k);
            const y = pToY(ind.bbLower[k]);
            ctx.lineTo(cx, y);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(40, 214, 176, 0.05)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(40, 214, 176, 0.28)';
          ctx.stroke();
          ctx.restore();
        }

        const drawOverlayLine = (arr: number[], stroke: string, widthPx = 1.5, dash: number[] = []) => {
          if (visibleSlice.length <= 1) return;
          ctx.save();
          ctx.strokeStyle = stroke;
          ctx.lineWidth = widthPx;
          if (dash.length) ctx.setLineDash(dash);
          ctx.beginPath();
          for (let i = 0; i < visibleSlice.length; i++) {
            const k = startIdx + i;
            const cx = getCandleX(k);
            const y = pToY(arr[k]);
            if (i === 0) ctx.moveTo(cx, y);
            else ctx.lineTo(cx, y);
          }
          ctx.stroke();
          ctx.restore();
        };

        if (showSma200Ref.current) drawOverlayLine(ind.sma200, '#38BDF8', 1.6);
        if (showVwapRef.current) drawOverlayLine(ind.vwap, '#A855F7', 1.5, [4, 2]);
        if (showEma50Ref.current) drawOverlayLine(ind.ema50, '#F59E0B', 1.5);
        if (showEma20Ref.current) drawOverlayLine(ind.ema20, '#28D6B0', 1.5);

        if (showSupertrendRef.current && visibleSlice.length > 1) {
          for (let i = 1; i < visibleSlice.length; i++) {
            const k = startIdx + i;
            const prevK = k - 1;
            ctx.save();
            ctx.strokeStyle = ind.supertrendDir[k] === 1 ? '#28D6B0' : '#F01650';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(getCandleX(prevK), pToY(ind.supertrend[prevK]));
            ctx.lineTo(getCandleX(k), pToY(ind.supertrend[k]));
            ctx.stroke();
            ctx.restore();
          }
        }

        // 5. Volume Histogram + Selected Chart Type (Candles / Hollow / Bars / Line / Area / Heikin Ashi)
        const bWidth = Math.max(3, Math.min(15, sWidth * 0.72));
        const maxVol = Math.max(
          1,
          ...visibleSlice.map((v) => (Number.isFinite(v.volume) && v.volume > 0 ? v.volume : 1))
        );
        const volMaxHeight = plotH * 0.11;
        const cType = chartTypeRef.current;

        if (cType === 'line' || cType === 'area') {
          if (visibleSlice.length > 1) {
            ctx.save();
            ctx.beginPath();
            for (let i = 0; i < visibleSlice.length; i++) {
              const k = startIdx + i;
              const cx = getCandleX(k);
              const cy = pToY(visibleSlice[i].close);
              if (i === 0) ctx.moveTo(cx, cy);
              else ctx.lineTo(cx, cy);
            }
            ctx.strokeStyle = '#28D6B0';
            ctx.lineWidth = 2.2;
            ctx.stroke();

            if (cType === 'area') {
              const lastX = getCandleX(startIdx + visibleSlice.length - 1);
              const firstX = getCandleX(startIdx);
              ctx.lineTo(lastX, plotH);
              ctx.lineTo(firstX, plotH);
              ctx.closePath();
              const grad = ctx.createLinearGradient(0, 0, 0, plotH);
              grad.addColorStop(0, 'rgba(40, 214, 176, 0.28)');
              grad.addColorStop(1, 'rgba(40, 214, 176, 0.0)');
              ctx.fillStyle = grad;
              ctx.fill();
            }
            ctx.restore();
          }
        } else {
          let prevHaOpen = visibleSlice[0]?.open || 0;
          let prevHaClose = visibleSlice[0]?.close || 0;

          for (let i = 0; i < visibleSlice.length; i++) {
            const k = startIdx + i;
            const rawC = visibleSlice[i];
            const isActiveBar = k === lastIdx && smoothLivePrice > 0;
            let openP = rawC.open;
            let closeP = isActiveBar ? smoothLivePrice : rawC.close;
            let highP = isActiveBar ? Math.max(rawC.high, smoothLivePrice) : rawC.high;
            let lowP = isActiveBar ? Math.min(rawC.low, smoothLivePrice) : rawC.low;

            if (cType === 'heikin_ashi') {
              const haClose = (rawC.open + rawC.high + rawC.low + rawC.close) / 4;
              const haOpen = i === 0 ? (rawC.open + rawC.close) / 2 : (prevHaOpen + prevHaClose) / 2;
              const haHigh = Math.max(rawC.high, haOpen, haClose);
              const haLow = Math.min(rawC.low, haOpen, haClose);
              openP = haOpen;
              closeP = haClose;
              highP = haHigh;
              lowP = haLow;
              prevHaOpen = haOpen;
              prevHaClose = haClose;
            }

            const isBull = closeP >= openP;
            const bodyFill = isBull ? '#00C896' : '#F01650';
            const borderStroke = isBull ? '#20F5C4' : '#FF4778';
            const wickColor = isBull ? '#00E5B0' : '#FF2E63';
            const cx = Math.floor(getCandleX(k)) + 0.5;
            if (cx < -bWidth || cx > plotW + bWidth) continue;

            if (showVolumeRef.current) {
              const vRatio = Math.min(1, Math.max(0.08, (rawC.volume || 50) / maxVol));
              const vHeight = Math.round(vRatio * volMaxHeight);
              const bx = Math.round(cx - bWidth / 2);
              ctx.fillStyle = isBull ? 'rgba(0, 200, 150, 0.15)' : 'rgba(240, 22, 80, 0.15)';
              ctx.fillRect(bx, plotH - vHeight, Math.round(bWidth), vHeight);
            }

            const openY = pToY(openP);
            const closeY = pToY(closeP);
            const bTopP = Math.max(openP, closeP);
            const bBotP = Math.min(openP, closeP);
            const effH = Math.max(highP, bTopP);
            const effL = Math.min(lowP, bBotP);
            const hY = pToY(effH);
            const lY = pToY(effL);
            const bx = Math.round(cx - bWidth / 2);
            const bw = Math.max(2, Math.round(bWidth));

            if (cType === 'bars') {
              ctx.strokeStyle = wickColor;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(cx, Math.floor(hY));
              ctx.lineTo(cx, Math.ceil(lY));
              ctx.moveTo(cx - bw / 2, openY);
              ctx.lineTo(cx, openY);
              ctx.moveTo(cx, closeY);
              ctx.lineTo(cx + bw / 2, closeY);
              ctx.stroke();
            } else {
              // Crisp Pixel-Aligned Upper & Lower Wick
              ctx.strokeStyle = wickColor;
              ctx.lineWidth = isActiveBar ? 1.65 : 1.35;
              ctx.beginPath();
              ctx.moveTo(cx, Math.floor(hY));
              ctx.lineTo(cx, Math.ceil(lY));
              ctx.stroke();

              const bTop = Math.round(Math.min(openY, closeY));
              const rH = Math.abs(closeY - openY);
              const bH = Math.max(2, Math.round(rH));

              if (cType === 'hollow' && isBull) {
                ctx.fillStyle = '#080D0B';
                ctx.fillRect(bx, bTop, bw, bH);
                ctx.strokeStyle = borderStroke;
                ctx.lineWidth = 1.3;
                ctx.strokeRect(bx + 0.5, bTop + 0.5, Math.max(1, bw - 1), Math.max(1, bH - 1));
              } else {
                ctx.fillStyle = bodyFill;
                ctx.fillRect(bx, bTop, bw, bH);
                if (bw >= 4 && bH >= 3) {
                  ctx.strokeStyle = borderStroke;
                  ctx.lineWidth = isActiveBar ? 1.2 : 0.85;
                  ctx.strokeRect(bx + 0.5, bTop + 0.5, bw - 1, bH - 1);
                }
              }
            }
          }
        }

        // 5B. Interactive User Drawings & Draft Drawing
        if (!hideDrawingsRef.current) {
          const allDraws = [
            ...drawingsRef.current.filter((d) => d.symbol === symbol),
            ...(draftDrawingRef.current ? [draftDrawingRef.current] : []),
          ];

          for (const d of allDraws) {
            const x1 = timeToX(d.t1);
            const y1 = pToY(d.p1);
            const x2 = timeToX(d.t2);
            const y2 = pToY(d.p2);

            ctx.save();
            ctx.strokeStyle = d.color || '#28D6B0';
            ctx.fillStyle = d.color || '#28D6B0';
            ctx.lineWidth = 1.6;

            if (d.tool === 'hline') {
              ctx.setLineDash([5, 3]);
              ctx.beginPath();
              ctx.moveTo(0, y1);
              ctx.lineTo(plotW, y1);
              ctx.stroke();
              ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
              ctx.fillText(`H-Line ${formatAxisPrice(d.p1)}`, 64, y1 - 6);
            } else if (d.tool === 'vline') {
              ctx.setLineDash([5, 3]);
              ctx.beginPath();
              ctx.moveTo(x1, 0);
              ctx.lineTo(x1, plotH);
              ctx.stroke();
            } else if (d.tool === 'trendline' || d.tool === 'ray') {
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              if (d.tool === 'ray' && Math.abs(x2 - x1) > 1) {
                const slope = (y2 - y1) / (x2 - x1);
                const targetX = x2 >= x1 ? plotW : 0;
                const targetY = y1 + slope * (targetX - x1);
                ctx.lineTo(targetX, targetY);
              } else {
                ctx.lineTo(x2, y2);
              }
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(x1, y1, 3.5, 0, Math.PI * 2);
              ctx.arc(x2, y2, 3.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (d.tool === 'rect' || d.tool === 'measure') {
              const rx = Math.min(x1, x2);
              const ry = Math.min(y1, y2);
              const rw = Math.abs(x2 - x1);
              const rh = Math.abs(y2 - y1);
              ctx.fillStyle =
                d.tool === 'measure' ? 'rgba(56, 189, 248, 0.14)' : 'rgba(40, 214, 176, 0.12)';
              ctx.fillRect(rx, ry, rw, rh);
              ctx.strokeStyle = d.tool === 'measure' ? '#38BDF8' : '#28D6B0';
              ctx.strokeRect(rx, ry, rw, rh);
              if (d.tool === 'measure') {
                const diff = d.p2 - d.p1;
                const pct = (diff / Math.max(1e-9, d.p1)) * 100;
                ctx.fillStyle = '#F4F8F6';
                ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
                ctx.fillText(
                  `${diff >= 0 ? '+' : ''}${formatAxisPrice(diff)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`,
                  rx + rw / 2,
                  ry + rh / 2
                );
              }
            } else if (d.tool === 'fib') {
              const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
              const minX = Math.min(x1, x2);
              const maxX = Math.max(x1, x2, minX + 120);
              for (const lv of levels) {
                const lp = d.p1 + (d.p2 - d.p1) * lv;
                const ly = pToY(lp);
                ctx.strokeStyle = lv === 0.5 || lv === 0.618 ? '#28D6B0' : 'rgba(245, 158, 11, 0.65)';
                ctx.lineWidth = 1.1;
                ctx.beginPath();
                ctx.moveTo(minX, ly);
                ctx.lineTo(maxX, ly);
                ctx.stroke();
                ctx.fillStyle = '#F4F8F6';
                ctx.font = '600 9.5px "Plus Jakarta Sans", sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(`${(lv * 100).toFixed(1)}% (${formatAxisPrice(lp)})`, minX + 4, ly - 5);
              }
            } else if (d.tool === 'long_rr' || d.tool === 'short_rr') {
              const rx = Math.min(x1, x2);
              const rw = Math.max(80, Math.abs(x2 - x1));
              const entryY = y1;
              const targetY = y2;
              const stopDistY = Math.max(18, Math.abs(targetY - entryY) * 0.5);
              const stopY = d.tool === 'long_rr' ? entryY + stopDistY : entryY - stopDistY;

              // Profit box
              ctx.fillStyle = 'rgba(0, 184, 124, 0.16)';
              ctx.fillRect(rx, Math.min(entryY, targetY), rw, Math.abs(targetY - entryY));
              // Risk box
              ctx.fillStyle = 'rgba(240, 22, 80, 0.16)';
              ctx.fillRect(rx, Math.min(entryY, stopY), rw, Math.abs(stopY - entryY));

              ctx.strokeStyle = '#28D6B0';
              ctx.beginPath();
              ctx.moveTo(rx, entryY);
              ctx.lineTo(rx + rw, entryY);
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        ctx.restore();

        // 5C. Bottom Oscillator Sub-Panel (RSI 14 / MACD / ATR 14)
        if (curOscH > 0 && visibleSlice.length > 1) {
          const oscTop = plotH;
          ctx.save();
          ctx.fillStyle = '#060A08';
          ctx.fillRect(0, oscTop, plotW, curOscH);

          ctx.fillStyle = '#28D6B0';
          ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          const lastK = startIdx + visibleSlice.length - 1;
          const labelTxt =
            oscMode === 'rsi'
              ? `RSI (14): ${ind.rsi14[lastK]?.toFixed(1) || '50.0'}`
              : oscMode === 'macd'
              ? `MACD (12,26,9): ${ind.macdHist[lastK]?.toFixed(spec.decimals) || '0.00'}`
              : `ATR (14): ${ind.atr14[lastK]?.toFixed(spec.decimals) || '0.00'}`;
          ctx.fillText(labelTxt, 10, oscTop + 13);

          if (oscMode === 'rsi') {
            const y70 = oscTop + curOscH * 0.3;
            const y30 = oscTop + curOscH * 0.7;
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(0, y70);
            ctx.lineTo(plotW, y70);
            ctx.moveTo(0, y30);
            ctx.lineTo(plotW, y30);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = '#28D6B0';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            for (let i = 0; i < visibleSlice.length; i++) {
              const k = startIdx + i;
              const cx = getCandleX(k);
              const val = Math.max(0, Math.min(100, ind.rsi14[k] || 50));
              const ry = oscTop + curOscH - (val / 100) * (curOscH - 16) - 6;
              if (i === 0) ctx.moveTo(cx, ry);
              else ctx.lineTo(cx, ry);
            }
            ctx.stroke();
          } else if (oscMode === 'macd') {
            let maxM = 1e-6;
            for (let i = 0; i < visibleSlice.length; i++) {
              const k = startIdx + i;
              maxM = Math.max(
                maxM,
                Math.abs(ind.macdLine[k] || 0),
                Math.abs(ind.macdSignal[k] || 0),
                Math.abs(ind.macdHist[k] || 0)
              );
            }
            const midY = oscTop + curOscH / 2 + 4;
            for (let i = 0; i < visibleSlice.length; i++) {
              const k = startIdx + i;
              const cx = getCandleX(k);
              const hVal = ind.macdHist[k] || 0;
              const barH = (hVal / maxM) * (curOscH * 0.36);
              ctx.fillStyle = hVal >= 0 ? 'rgba(0, 184, 124, 0.55)' : 'rgba(240, 22, 80, 0.55)';
              ctx.fillRect(cx - bWidth / 2, barH >= 0 ? midY - barH : midY, Math.max(2, bWidth), Math.abs(barH));
            }
            ctx.strokeStyle = '#28D6B0';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (let i = 0; i < visibleSlice.length; i++) {
              const k = startIdx + i;
              const cx = getCandleX(k);
              const my = midY - ((ind.macdLine[k] || 0) / maxM) * (curOscH * 0.36);
              if (i === 0) ctx.moveTo(cx, my);
              else ctx.lineTo(cx, my);
            }
            ctx.stroke();
          } else if (oscMode === 'atr') {
            let minA = Infinity;
            let maxA = -Infinity;
            for (let i = 0; i < visibleSlice.length; i++) {
              const v = ind.atr14[startIdx + i] || 0;
              if (v < minA) minA = v;
              if (v > maxA) maxA = v;
            }
            const spanA = Math.max(1e-9, maxA - minA);
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            for (let i = 0; i < visibleSlice.length; i++) {
              const k = startIdx + i;
              const cx = getCandleX(k);
              const ay = oscTop + curOscH - 8 - ((ind.atr14[k] - minA) / spanA) * (curOscH - 24);
              if (i === 0) ctx.moveTo(cx, ay);
              else ctx.lineTo(cx, ay);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // 6. Open Positions & Draggable SL / TP Lines
      const curPositions = openPositionsRef.current;
      for (const pos of curPositions) {
        if (pos.entryPrice >= pb.minPrice && pos.entryPrice <= pb.maxPrice) {
          const py = Math.round(pToY(pos.entryPrice)) + 0.5;
          ctx.save();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = pos.side === 'BUY' ? '#00B87C' : '#F01650';
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.moveTo(0, py);
          ctx.lineTo(plotW, py);
          ctx.stroke();
          ctx.restore();
        }
        const drag = draggingSlTpRef.current;
        const eSlP = drag && drag.orderId === pos.id && drag.type === 'SL' ? drag.price : pos.stopLoss;
        if (eSlP > 0 && eSlP >= pb.minPrice && eSlP <= pb.maxPrice) {
          const sY = Math.round(pToY(eSlP)) + 0.5;
          const isD = drag?.orderId === pos.id && drag?.type === 'SL';
          ctx.save();
          ctx.setLineDash(isD ? [] : [3, 3]);
          ctx.strokeStyle = '#F01650';
          ctx.lineWidth = isD ? 2.2 : 1.3;
          ctx.beginPath();
          ctx.moveTo(0, sY);
          ctx.lineTo(plotW, sY);
          ctx.stroke();
          ctx.fillStyle = '#F01650';
          ctx.fillRect(plotW, sY - 9, PRICE_AXIS_WIDTH, 18);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(formatAxisPrice(eSlP), plotW + PRICE_AXIS_WIDTH / 2, sY + 0.5);
          ctx.restore();
        }
        const eTpP = drag && drag.orderId === pos.id && drag.type === 'TP' ? drag.price : pos.takeProfit;
        if (eTpP > 0 && eTpP >= pb.minPrice && eTpP <= pb.maxPrice) {
          const tY = Math.round(pToY(eTpP)) + 0.5;
          const isD = drag?.orderId === pos.id && drag?.type === 'TP';
          ctx.save();
          ctx.setLineDash(isD ? [] : [3, 3]);
          ctx.strokeStyle = '#00B87C';
          ctx.lineWidth = isD ? 2.2 : 1.3;
          ctx.beginPath();
          ctx.moveTo(0, tY);
          ctx.lineTo(plotW, tY);
          ctx.stroke();
          ctx.fillStyle = '#00B87C';
          ctx.fillRect(plotW, tY - 9, PRICE_AXIS_WIDTH, 18);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(formatAxisPrice(eTpP), plotW + PRICE_AXIS_WIDTH / 2, tY + 0.5);
          ctx.restore();
        }
      }

      // 7. Moveable Live Price Dotted Line + Crisp Green/Red Right-Axis Tag
      const lastBar = currentCandles[currentCandles.length - 1];
      const liveRenderPrice = smoothLivePrice > 0 ? smoothLivePrice : latestPriceRef.current;
      const isLiveBull = !lastBar || liveRenderPrice >= lastBar.open;
      const liveTagColor = isLiveBull ? '#00B87C' : '#F01650';
      const lY = Math.max(14, Math.min(plotH - 22, Math.round(pToY(liveRenderPrice)) + 0.5));
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = liveTagColor;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(0, lY);
      ctx.lineTo(plotW, lY);
      ctx.stroke();
      ctx.restore();

      const pillH = 22;
      ctx.fillStyle = liveTagColor;
      ctx.beginPath();
      ctx.roundRect(plotW, lY - pillH / 2, PRICE_AXIS_WIDTH - 2, pillH, 5);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 10.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `⇅ ${formatAxisPrice(latestPriceRef.current)}`,
        plotW + (PRICE_AXIS_WIDTH - 2) / 2,
        lY + 0.5
      );

      // 8. Crosshair
      const ch = crosshairRef.current;
      const dSlTp = draggingSlTpRef.current;
      if (!dSlTp && ch && ch.x >= 0 && ch.x <= plotW && ch.y >= 0 && ch.y <= plotH) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(139, 154, 146, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ch.x, 0);
        ctx.lineTo(ch.x, plotH);
        ctx.moveTo(0, ch.y);
        ctx.lineTo(plotW, ch.y);
        ctx.stroke();
        const hP = pb.maxPrice - (ch.y / plotH) * priceSpan;
        ctx.fillStyle = '#0C1411';
        ctx.fillRect(plotW, ch.y - 10, PRICE_AXIS_WIDTH, 20);
        ctx.fillStyle = '#28D6B0';
        ctx.font = '700 10.5px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatAxisPrice(hP), plotW + PRICE_AXIS_WIDTH / 2, ch.y + 0.5);
        ctx.restore();
      }

      ctx.restore();
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [dimensions, formatAxisPrice, formatAxisTime, spec.decimals, spec.spread, spec.volatility, symbol, timeframeLabel, timeframeSeconds]);

  const findNearbySlTpLine = useCallback(
    (relY: number): { orderId: string; type: 'SL' | 'TP'; price: number } | null => {
      const hitTolerancePx = 20;
      for (const pos of openPositions) {
        if (pos.stopLoss > 0) {
          const slY = priceToY(pos.stopLoss);
          if (Math.abs(relY - slY) <= hitTolerancePx) {
            return { orderId: pos.id, type: 'SL', price: pos.stopLoss };
          }
        }
        if (pos.takeProfit > 0) {
          const tpY = priceToY(pos.takeProfit);
          if (Math.abs(relY - tpY) <= hitTolerancePx) {
            return { orderId: pos.id, type: 'TP', price: pos.takeProfit };
          }
        }
      }
      return null;
    },
    [openPositions, priceToY]
  );

  // Mouse & Touch Panning + Drawing Tools + SL/TP Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) return; // Right-click handled by onContextMenu
    setContextMenu(null);

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // If user is in a drawing mode and not locked
    if (activeTool !== 'cursor' && !lockDrawings && relX <= plotWidth && relY <= plotHeight) {
      const clickTime = xToTime(relX);
      const clickPrice = yToPrice(relY);

      if (activeTool === 'hline' || activeTool === 'vline') {
        const newObj: ChartDrawingObject = {
          id: `draw-${Date.now()}`,
          symbol,
          tool: activeTool,
          t1: clickTime,
          p1: clickPrice,
          t2: clickTime,
          p2: clickPrice,
          color: '#28D6B0',
        };
        setDrawings((prev) => [...prev, newObj]);
        setRedoStack([]);
        setActiveTool('cursor');
        return;
      }

      if (!draftDrawing) {
        setDraftDrawing({
          id: `draw-${Date.now()}`,
          symbol,
          tool: activeTool,
          t1: clickTime,
          p1: clickPrice,
          t2: clickTime,
          p2: clickPrice,
          color: '#28D6B0',
        });
      } else {
        const finalized: ChartDrawingObject = {
          ...draftDrawing,
          t2: clickTime,
          p2: clickPrice,
        };
        setDrawings((prev) => [...prev, finalized]);
        setRedoStack([]);
        setDraftDrawing(null);
        setActiveTool('cursor');
      }
      return;
    }

    const hitLine = findNearbySlTpLine(relY);
    if (hitLine) {
      startSlTpDrag(hitLine.orderId, hitLine.type, hitLine.price, e);
      return;
    }

    const currentSpan = Math.max(1e-6, priceBounds.maxPrice - priceBounds.minPrice);
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    dragStartPanRef.current = panOffset;
    dragStartPricePanRef.current = pricePanOffset;
    dragStartPriceScaleRef.current = priceScaleFactor;
    dragStartSpanRef.current = currentSpan;

    // Right price axis drag: if grabbing the live price pill, move price vertically; otherwise scale/move price axis
    if (relX >= plotWidth - 4) {
      const liveY = priceToY(latestPriceRef.current);
      if (Math.abs(relY - liveY) <= 18) {
        isLivePillDraggingRef.current = true;
      } else {
        isPriceAxisDraggingRef.current = true;
      }
      return;
    }

    isDraggingRef.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draftDrawing) {
      setDraftDrawing((prev) =>
        prev
          ? {
              ...prev,
              t2: xToTime(x),
              p2: yToPrice(y),
            }
          : null
      );
      setCrosshair({ x, y });
      return;
    }

    if (draggingSlTpRef.current) return;

    if (isLivePillDraggingRef.current) {
      const deltaY = e.clientY - dragStartYRef.current;
      const priceDelta = (deltaY / Math.max(80, plotHeight)) * dragStartSpanRef.current;
      if (rafPanRef.current) cancelAnimationFrame(rafPanRef.current);
      rafPanRef.current = requestAnimationFrame(() => {
        setPricePanOffset(dragStartPricePanRef.current + priceDelta);
      });
      return;
    }

    if (isPriceAxisDraggingRef.current) {
      const deltaY = e.clientY - dragStartYRef.current;
      const scaleMultiplier = Math.exp(deltaY * 0.0065);
      const nextScale = Math.min(4.5, Math.max(0.22, dragStartPriceScaleRef.current * scaleMultiplier));
      if (rafPanRef.current) cancelAnimationFrame(rafPanRef.current);
      rafPanRef.current = requestAnimationFrame(() => {
        setPriceScaleFactor(nextScale);
      });
      return;
    }

    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartXRef.current;
      const deltaY = e.clientY - dragStartYRef.current;
      const barsMoved = deltaX / Math.max(4, slotWidth);
      const minOffset = -Math.floor(visibleCount * 0.38);
      const maxOffset = Math.max(0, candles.length - Math.floor(visibleCount * 0.2));
      const nextPan = Math.min(maxOffset, Math.max(minOffset, dragStartPanRef.current + barsMoved));
      const priceDelta = (deltaY / Math.max(80, plotHeight)) * dragStartSpanRef.current;

      if (rafPanRef.current) cancelAnimationFrame(rafPanRef.current);
      rafPanRef.current = requestAnimationFrame(() => {
        setPanOffset(nextPan);
        setPricePanOffset(dragStartPricePanRef.current + priceDelta);
      });
    } else {
      setCrosshair({ x, y });
    }
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    isPriceAxisDraggingRef.current = false;
    isLivePillDraggingRef.current = false;
    setCrosshair(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    // Wheel over the right price axis zooms vertical price scale; wheel over chart zooms visible candle count
    if (relX >= plotWidth - 4) {
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      setPriceScaleFactor((prev) => Math.min(4.5, Math.max(0.22, prev * factor)));
      return;
    }
    const delta = e.deltaY > 0 ? 6 : -6;
    setVisibleCount((prev) => Math.min(135, Math.max(16, prev + delta)));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.touches[0].clientX - rect.left;
      const relY = e.touches[0].clientY - rect.top;
      const hitLine = findNearbySlTpLine(relY);
      if (hitLine) {
        startSlTpDrag(hitLine.orderId, hitLine.type, hitLine.price, e);
        return;
      }

      const currentSpan = Math.max(1e-6, priceBounds.maxPrice - priceBounds.minPrice);
      dragStartXRef.current = e.touches[0].clientX;
      dragStartYRef.current = e.touches[0].clientY;
      dragStartPanRef.current = panOffset;
      dragStartPricePanRef.current = pricePanOffset;
      dragStartPriceScaleRef.current = priceScaleFactor;
      dragStartSpanRef.current = currentSpan;

      if (relX >= plotWidth - 6) {
        const liveY = priceToY(latestPriceRef.current);
        if (Math.abs(relY - liveY) <= 22) {
          isLivePillDraggingRef.current = true;
        } else {
          isPriceAxisDraggingRef.current = true;
        }
        return;
      }

      isDraggingRef.current = true;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      isPriceAxisDraggingRef.current = false;
      isLivePillDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartCountRef.current = visibleCount;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (draggingSlTpRef.current) return;

    if (e.touches.length === 1) {
      if (isLivePillDraggingRef.current) {
        const deltaY = e.touches[0].clientY - dragStartYRef.current;
        const priceDelta = (deltaY / Math.max(80, plotHeight)) * dragStartSpanRef.current;
        if (rafPanRef.current) cancelAnimationFrame(rafPanRef.current);
        rafPanRef.current = requestAnimationFrame(() => {
          setPricePanOffset(dragStartPricePanRef.current + priceDelta);
        });
        return;
      }

      if (isPriceAxisDraggingRef.current) {
        const deltaY = e.touches[0].clientY - dragStartYRef.current;
        const scaleMultiplier = Math.exp(deltaY * 0.0065);
        const nextScale = Math.min(4.5, Math.max(0.22, dragStartPriceScaleRef.current * scaleMultiplier));
        if (rafPanRef.current) cancelAnimationFrame(rafPanRef.current);
        rafPanRef.current = requestAnimationFrame(() => {
          setPriceScaleFactor(nextScale);
        });
        return;
      }

      if (isDraggingRef.current) {
        const deltaX = e.touches[0].clientX - dragStartXRef.current;
        const deltaY = e.touches[0].clientY - dragStartYRef.current;
        const barsMoved = deltaX / Math.max(4, slotWidth);
        const minOffset = -Math.floor(visibleCount * 0.38);
        const maxOffset = Math.max(0, candles.length - Math.floor(visibleCount * 0.2));
        const nextPan = Math.min(maxOffset, Math.max(minOffset, dragStartPanRef.current + barsMoved));
        const priceDelta = (deltaY / Math.max(80, plotHeight)) * dragStartSpanRef.current;
        if (rafPanRef.current) cancelAnimationFrame(rafPanRef.current);
        rafPanRef.current = requestAnimationFrame(() => {
          setPanOffset(nextPan);
          setPricePanOffset(dragStartPricePanRef.current + priceDelta);
        });
      }
    } else if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (dist > 10) {
        const scale = pinchStartDistRef.current / dist;
        const nextCount = Math.round(pinchStartCountRef.current * scale);
        setVisibleCount(Math.min(135, Math.max(16, nextCount)));
      }
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    isPriceAxisDraggingRef.current = false;
    isLivePillDraggingRef.current = false;
    pinchStartDistRef.current = null;
  };

  const handleQuickAddSlOrTp = (pos: ChartPositionLine, type: 'SL' | 'TP') => {
    if (!onModifyPositionSlTp) return;
    const tfScale = getTimeframeStepMultiplier(timeframeLabel);
    const unitDist = Math.max(spec.spread * 12, spec.volatility * tfScale * 3.5);
    const refPrice = activePrice > 0 ? activePrice : pos.entryPrice;
    if (type === 'SL') {
      const dist = unitDist * 1.4;
      const newSl = roundPrice(
        pos.side === 'BUY' ? refPrice - dist : refPrice + dist,
        symbol
      );
      onModifyPositionSlTp(pos.id, newSl, pos.takeProfit);
    } else {
      const dist = unitDist * 2.0;
      const newTp = roundPrice(
        pos.side === 'BUY' ? refPrice + dist : refPrice - dist,
        symbol
      );
      onModifyPositionSlTp(pos.id, pos.stopLoss, newTp);
    }
  };

  const handleUndoDrawing = () => {
    setDrawings((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  };

  const handleRedoDrawing = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setDrawings((d) => [...d, last]);
      return prev.slice(0, -1);
    });
  };

  const symbolDrawingsCount = drawings.filter((d) => d.symbol === symbol).length;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        setContextMenu({
          x: Math.min(rect.width - 210, e.clientX - rect.left),
          y: Math.min(rect.height - 220, relY),
          price: yToPrice(relY),
        });
      }}
      style={{ width: '100%', height: '100%' }}
      className={`relative w-full h-full bg-[#080D0B] select-none overflow-hidden touch-none ${
        draggingSlTp ? 'cursor-ns-resize' : activeTool !== 'cursor' ? 'cursor-cell' : 'cursor-crosshair'
      }`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        className="block w-full h-full"
      />

      {/* Left Floating Drawing Tools Dock (Desktop & Tablet or when toggled) */}
      {showDrawingToolbar && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="hidden sm:flex flex-col items-center gap-1 p-1.5 rounded-[14px] bg-[#0C1411]/92 backdrop-blur-md border border-[#28D6B0]/20 absolute left-2.5 top-12 z-20 shadow-xl"
        >
          {(
            [
              { id: 'cursor', label: '✢', title: 'Crosshair / Pan' },
              { id: 'trendline', label: '╱', title: 'Trendline' },
              { id: 'hline', label: '━', title: 'Horizontal Line' },
              { id: 'ray', label: '↗', title: 'Ray Line' },
              { id: 'rect', label: '▭', title: 'Supply/Demand Zone' },
              { id: 'fib', label: '☰', title: 'Fibonacci Retracement' },
              { id: 'long_rr', label: 'L', title: 'Long Position R:R' },
              { id: 'short_rr', label: 'S', title: 'Short Position R:R' },
              { id: 'measure', label: '📏', title: 'Measure Price & %' },
            ] as { id: DrawingToolMode; label: string; title: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.title}
              onClick={() => {
                setDraftDrawing(null);
                setActiveTool(t.id);
              }}
              className={`w-7 h-7 rounded-[9px] text-[11px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                activeTool === t.id
                  ? 'bg-[#28D6B0] text-[#04100C]'
                  : 'text-[#8B9A92] hover:text-[#F4F8F6] hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}

          {symbolDrawingsCount > 0 && (
            <>
              <div className="w-4 h-px bg-white/10 my-0.5" />
              <button
                type="button"
                title="Undo Drawing"
                onClick={handleUndoDrawing}
                className="w-7 h-7 rounded-[9px] text-[11px] font-bold text-[#8B9A92] hover:text-[#F4F8F6] hover:bg-white/5 flex items-center justify-center cursor-pointer"
              >
                ↶
              </button>
              <button
                type="button"
                title="Clear Symbol Drawings"
                onClick={() =>
                  setDrawings((prev) => prev.filter((d) => d.symbol !== symbol))
                }
                className="w-7 h-7 rounded-[9px] text-[11px] font-bold text-[#F01650] hover:bg-[#F01650]/15 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </>
          )}
        </div>
      )}

      {/* Top Chart OHLCV Readout + Chart Type + Indicators Selector */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="absolute top-2 left-2.5 right-[76px] z-20 flex flex-wrap items-center justify-between gap-1.5 pointer-events-auto"
      >
        {/* OHLC + Live Wick Range HUD */}
        {inspectedCandle && (
          <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-[12px] bg-[#0C1411]/90 backdrop-blur-md border border-[#28D6B0]/20 text-[10.5px] font-sans font-semibold text-[#A5B5AE]">
            <span className="font-extrabold text-[#F4F8F6]">{spec.shortName}</span>
            <span>
              O:<strong className="text-[#F4F8F6] ml-0.5 tabular-nums">{formatAxisPrice(inspectedCandle.open)}</strong>
            </span>
            <span>
              H:<strong className="text-[#00B87C] ml-0.5 tabular-nums">{formatAxisPrice(inspectedCandle.high)}</strong>
            </span>
            <span>
              L:<strong className="text-[#F01650] ml-0.5 tabular-nums">{formatAxisPrice(inspectedCandle.low)}</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              C:
              <strong
                className={`ml-0.5 px-1.5 py-0.2 rounded-[6px] tabular-nums inline-flex items-center gap-0.5 transition-colors duration-150 ${
                  inspectedCandle.close >= inspectedCandle.open
                    ? 'text-[#28D6B0] bg-[#28D6B0]/14'
                    : 'text-[#F01650] bg-[#F01650]/14'
                }`}
              >
                <span className="text-[8px]">
                  {inspectedCandle.close >= inspectedCandle.open ? '▲' : '▼'}
                </span>
                <span>{formatAxisPrice(inspectedCandle.close)}</span>
              </strong>
            </span>
          </div>
        )}

        {/* Chart Type + Technical Indicators Toggles */}
        <div className="inline-flex items-center gap-1 flex-wrap">
          <select
            aria-label="Chart Type"
            value={activeChartType}
            onChange={(e) => setChartType(e.target.value as ChartTypeMode)}
            className="px-2.5 py-1 rounded-[10px] text-[10px] font-bold bg-[#0C1411]/92 border border-[#28D6B0]/25 text-[#F4F8F6] outline-none cursor-pointer"
          >
            <option value="candles">Candles</option>
            <option value="hollow">Hollow Candles</option>
            <option value="heikin_ashi">Heikin Ashi</option>
            <option value="bars">OHLC Bars</option>
            <option value="area">Area</option>
            <option value="line">Line</option>
          </select>

          <button
            type="button"
            onClick={() => setShowEma20((v) => !v)}
            className={`px-2.5 py-1 rounded-[10px] text-[10px] font-bold border transition-colors cursor-pointer ${
              showEma20
                ? 'bg-[#28D6B0]/18 border-[#28D6B0]/50 text-[#28D6B0]'
                : 'bg-[#0C1411]/90 border-white/10 text-[#8B9A92] hover:text-white'
            }`}
          >
            EMA20
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIndicatorsMenu((v) => !v)}
              className="px-2.5 py-1 rounded-[10px] text-[10px] font-bold border bg-[#0C1411]/92 border-[#28D6B0]/25 text-[#28D6B0] hover:bg-[#121F1A] cursor-pointer"
            >
              fx Indicators ▾
            </button>

            {showIndicatorsMenu && (
              <div className="absolute right-0 top-7 z-40 w-52 p-2.5 rounded-[16px] bg-[#070C0A] border border-[#28D6B0]/30 shadow-2xl space-y-1.5 text-[11px]">
                <div className="text-[10px] font-bold text-[#8B9A92] uppercase px-1">
                  Overlay Indicators
                </div>
                {[
                  { label: 'EMA 20 (Aqua)', active: showEma20, toggle: () => setShowEma20(!showEma20) },
                  { label: 'EMA 50 (Amber)', active: showEma50, toggle: () => setShowEma50(!showEma50) },
                  { label: 'SMA 200 (Sky)', active: showSma200, toggle: () => setShowSma200(!showSma200) },
                  { label: 'VWAP (Session)', active: showVwap, toggle: () => setShowVwap(!showVwap) },
                  { label: 'Bollinger Bands', active: showBBands, toggle: () => setShowBBands(!showBBands) },
                  { label: 'Supertrend (10,3)', active: showSupertrend, toggle: () => setShowSupertrend(!showSupertrend) },
                  { label: 'Volume Histogram', active: showVolume, toggle: () => setShowVolume(!showVolume) },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.toggle}
                    className={`w-full px-2.5 py-1.5 rounded-[10px] flex items-center justify-between font-semibold cursor-pointer ${
                      item.active ? 'bg-[#28D6B0]/15 text-[#28D6B0]' : 'text-[#A5B5AE] hover:bg-white/5'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span>{item.active ? 'ON' : 'OFF'}</span>
                  </button>
                ))}

                <div className="text-[10px] font-bold text-[#8B9A92] uppercase px-1 pt-1 border-t border-white/10">
                  Sub-Panel Oscillator
                </div>
                {(
                  [
                    { id: 'none', label: 'None' },
                    { id: 'rsi', label: 'RSI (14)' },
                    { id: 'macd', label: 'MACD (12, 26, 9)' },
                    { id: 'atr', label: 'ATR (14)' },
                  ] as { id: OscillatorMode; label: string }[]
                ).map((osc) => (
                  <button
                    key={osc.id}
                    type="button"
                    onClick={() => setOscillator(osc.id)}
                    className={`w-full px-2.5 py-1.5 rounded-[10px] flex items-center justify-between font-semibold cursor-pointer ${
                      oscillator === osc.id ? 'bg-[#28D6B0] text-[#04100C] font-bold' : 'text-[#A5B5AE] hover:bg-white/5'
                    }`}
                  >
                    <span>{osc.label}</span>
                    {oscillator === osc.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(Math.abs(panOffset) > 0.5 ||
            Math.abs(pricePanOffset) > 1e-6 ||
            Math.abs(priceScaleFactor - 1) > 0.03) && (
            <button
              type="button"
              onClick={() => {
                setPanOffset(0);
                setPricePanOffset(0);
                setPriceScaleFactor(1);
              }}
              className="px-2.5 py-1 rounded-[10px] text-[10px] font-bold bg-[#28D6B0] text-[#04100C] cursor-pointer"
            >
              LIVE / AUTO →
            </button>
          )}
        </div>
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute z-40 w-52 p-2 rounded-[16px] bg-[#070C0A]/95 backdrop-blur-md border border-[#28D6B0]/30 shadow-2xl space-y-1 text-xs"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-[#8B9A92] border-b border-white/10">
            Price @ {formatAxisPrice(contextMenu.price)}
          </div>
          <button
            type="button"
            onClick={() => {
              setDrawings((prev) => [
                ...prev,
                {
                  id: `draw-${Date.now()}`,
                  symbol,
                  tool: 'hline',
                  t1: Date.now(),
                  p1: contextMenu.price,
                  t2: Date.now(),
                  p2: contextMenu.price,
                  color: '#28D6B0',
                },
              ]);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-[10px] text-left text-[#F4F8F6] hover:bg-[#28D6B0]/15 hover:text-[#28D6B0] font-medium cursor-pointer"
          >
            + Draw Horizontal Line Here
          </button>
          {onQuickCreateAlert && (
            <button
              type="button"
              onClick={() => {
                onQuickCreateAlert(contextMenu.price);
                setContextMenu(null);
              }}
              className="w-full px-2.5 py-1.5 rounded-[10px] text-left text-[#F4F8F6] hover:bg-[#28D6B0]/15 hover:text-[#28D6B0] font-medium cursor-pointer"
            >
              🔔 Set Price Alert @ {formatAxisPrice(contextMenu.price)}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setPanOffset(0);
              setPricePanOffset(0);
              setPriceScaleFactor(1);
              setVisibleCount(48);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-[10px] text-left text-[#A5B5AE] hover:bg-white/5 hover:text-white font-medium cursor-pointer"
          >
            Reset Chart &amp; Auto-Scale
          </button>
          <button
            type="button"
            onClick={() => {
              setHideDrawings((v) => !v);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-[10px] text-left text-[#A5B5AE] hover:bg-white/5 hover:text-white font-medium cursor-pointer"
          >
            {hideDrawings ? 'Show Drawings' : 'Hide Drawings'}
          </button>
          <button
            type="button"
            onClick={() => {
              setLockDrawings((v) => !v);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-[10px] text-left text-[#A5B5AE] hover:bg-white/5 hover:text-white font-medium cursor-pointer"
          >
            {lockDrawings ? 'Unlock Drawings' : 'Lock Drawings'}
          </button>
          {redoStack.length > 0 && (
            <button
              type="button"
              onClick={() => {
                handleRedoDrawing();
                setContextMenu(null);
              }}
              className="w-full px-2.5 py-1.5 rounded-[10px] text-left text-[#A5B5AE] hover:bg-white/5 hover:text-white font-medium cursor-pointer"
            >
              ↷ Redo Drawing
            </button>
          )}
        </div>
      )}

      {/* Interactive On-Chart Position Pills & Moveable SL / TP Drag Lines */}
      {openPositions.map((pos) => {
        const entryY = Math.round(priceToY(pos.entryPrice));
        const showEntry =
          pos.entryPrice >= priceBounds.minPrice &&
          pos.entryPrice <= priceBounds.maxPrice &&
          entryY >= 14 &&
          entryY <= plotHeight - 14;

        const effectiveSlPrice =
          draggingSlTp && draggingSlTp.orderId === pos.id && draggingSlTp.type === 'SL'
            ? draggingSlTp.price
            : pos.stopLoss;
        const slY = effectiveSlPrice > 0 ? Math.round(priceToY(effectiveSlPrice)) : -1;
        const showSl =
          effectiveSlPrice > 0 &&
          effectiveSlPrice >= priceBounds.minPrice &&
          effectiveSlPrice <= priceBounds.maxPrice &&
          slY >= 12 &&
          slY <= plotHeight - 12;

        const effectiveTpPrice =
          draggingSlTp && draggingSlTp.orderId === pos.id && draggingSlTp.type === 'TP'
            ? draggingSlTp.price
            : pos.takeProfit;
        const tpY = effectiveTpPrice > 0 ? Math.round(priceToY(effectiveTpPrice)) : -1;
        const showTp =
          effectiveTpPrice > 0 &&
          effectiveTpPrice >= priceBounds.minPrice &&
          effectiveTpPrice <= priceBounds.maxPrice &&
          tpY >= 12 &&
          tpY <= plotHeight - 12;

        const isPositive = pos.netPnl >= 0;

        const slProjectedPnl =
          effectiveSlPrice > 0
            ? calculatePositionPnl(symbol, pos.side, pos.volume, pos.entryPrice, effectiveSlPrice)
                .netPnl
            : 0;
        const tpProjectedPnl =
          effectiveTpPrice > 0
            ? calculatePositionPnl(symbol, pos.side, pos.volume, pos.entryPrice, effectiveTpPrice)
                .netPnl
            : 0;

        return (
          <React.Fragment key={pos.id}>
            {/* Entry Pill with Quick +SL / +TP & 1-Click Close */}
            {showEntry && (
              <div
                style={{ top: `${entryY - 12}px` }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="absolute left-12 z-10 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[10px] bg-[#0C1411]/95 border border-[#28D6B0]/30 shadow-md text-[10px] font-sans font-bold pointer-events-auto"
              >
                <span
                  className={`font-extrabold ${
                    pos.side === 'BUY' ? 'text-[#28D6B0]' : 'text-[#F01650]'
                  }`}
                >
                  {pos.side} {pos.volume.toFixed(2)}
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    isPositive ? 'text-[#28D6B0]' : 'text-[#F01650]'
                  }`}
                >
                  {isPositive ? '+' : ''}${pos.netPnl.toFixed(2)}
                </span>
                {pos.stopLoss <= 0 && onModifyPositionSlTp && (
                  <button
                    type="button"
                    onClick={() => handleQuickAddSlOrTp(pos, 'SL')}
                    className="px-1.5 py-0.2 rounded-[6px] bg-[#F01650]/15 border border-[#F01650]/40 text-[#F01650] hover:bg-[#F01650] hover:text-white font-bold text-[9px] cursor-pointer"
                    title="Add Stop Loss to Chart"
                  >
                    +SL
                  </button>
                )}
                {pos.takeProfit <= 0 && onModifyPositionSlTp && (
                  <button
                    type="button"
                    onClick={() => handleQuickAddSlOrTp(pos, 'TP')}
                    className="px-1.5 py-0.2 rounded-[6px] bg-[#28D6B0]/15 border border-[#28D6B0]/40 text-[#28D6B0] hover:bg-[#28D6B0] hover:text-[#04100C] font-bold text-[9px] cursor-pointer"
                    title="Add Take Profit to Chart"
                  >
                    +TP
                  </button>
                )}
                {onEditPositionModal && (
                  <button
                    type="button"
                    onClick={() => onEditPositionModal(pos)}
                    className="px-1.5 py-0.2 rounded-[6px] bg-[#090F0D] border border-white/15 text-[#A5B5AE] hover:text-white font-bold text-[9px] cursor-pointer"
                    title="Edit Stop Loss & Take Profit"
                  >
                    SL/TP
                  </button>
                )}
                {onClosePosition && (
                  <button
                    type="button"
                    onClick={() => onClosePosition(pos.id)}
                    className="ml-0.5 px-1.5 rounded-[6px] bg-[#F01650]/20 hover:bg-[#F01650] text-[#F01650] hover:text-white font-bold transition-colors cursor-pointer"
                    title="Close Position"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Moveable / Draggable Stop Loss (SL) Pill */}
            {showSl && (
              <div
                style={{ top: `${slY - 12}px` }}
                data-testid={`chart-sl-line-${pos.id}`}
                onMouseDown={(e) => startSlTpDrag(pos.id, 'SL', effectiveSlPrice, e)}
                onTouchStart={(e) => startSlTpDrag(pos.id, 'SL', effectiveSlPrice, e)}
                className={`absolute right-[76px] z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-[9px] bg-[#0C1411]/95 border shadow-md text-[9.5px] font-sans font-bold text-[#F01650] pointer-events-auto cursor-ns-resize select-none transition-shadow ${
                  draggingSlTp?.orderId === pos.id && draggingSlTp?.type === 'SL'
                    ? 'border-[#F01650] ring-2 ring-[#F01650]/40 scale-[1.03]'
                    : 'border-[#F01650]/45 hover:border-[#F01650]'
                }`}
                title="Drag Up/Down to Move Stop Loss"
              >
                <span className="font-extrabold tabular-nums">⇅ SL {formatAxisPrice(effectiveSlPrice)}</span>
                <span className="text-[8.5px] opacity-85 tabular-nums">
                  ({slProjectedPnl >= 0 ? '+' : ''}${slProjectedPnl.toFixed(2)})
                </span>
                {onModifyPositionSlTp && (
                  <button
                    type="button"
                    data-testid={`remove-sl-btn-${pos.id}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onModifyPositionSlTp(pos.id, 0, pos.takeProfit);
                    }}
                    className="ml-0.5 px-1 rounded bg-[#F01650]/20 hover:bg-[#F01650] text-[#F01650] hover:text-white font-extrabold transition-colors cursor-pointer"
                    title="Remove Stop Loss (SL)"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Moveable / Draggable Take Profit (TP) Pill */}
            {showTp && (
              <div
                style={{ top: `${tpY - 12}px` }}
                data-testid={`chart-tp-line-${pos.id}`}
                onMouseDown={(e) => startSlTpDrag(pos.id, 'TP', effectiveTpPrice, e)}
                onTouchStart={(e) => startSlTpDrag(pos.id, 'TP', effectiveTpPrice, e)}
                className={`absolute right-[76px] z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-[9px] bg-[#0C1411]/95 border shadow-md text-[9.5px] font-sans font-bold text-[#28D6B0] pointer-events-auto cursor-ns-resize select-none transition-shadow ${
                  draggingSlTp?.orderId === pos.id && draggingSlTp?.type === 'TP'
                    ? 'border-[#28D6B0] ring-2 ring-[#28D6B0]/40 scale-[1.03]'
                    : 'border-[#28D6B0]/45 hover:border-[#28D6B0]'
                }`}
                title="Drag Up/Down to Move Take Profit"
              >
                <span className="font-extrabold tabular-nums">⇅ TP {formatAxisPrice(effectiveTpPrice)}</span>
                <span className="text-[8.5px] opacity-85 tabular-nums">
                  ({tpProjectedPnl >= 0 ? '+' : ''}${tpProjectedPnl.toFixed(2)})
                </span>
                {onModifyPositionSlTp && (
                  <button
                    type="button"
                    data-testid={`remove-tp-btn-${pos.id}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onModifyPositionSlTp(pos.id, pos.stopLoss, 0);
                    }}
                    className="ml-0.5 px-1 rounded bg-[#28D6B0]/20 hover:bg-[#28D6B0] text-[#28D6B0] hover:text-[#04100C] font-extrabold transition-colors cursor-pointer"
                    title="Remove Take Profit (TP)"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
});

ApexLiveCandlestickChart.displayName = 'ApexLiveCandlestickChart';
