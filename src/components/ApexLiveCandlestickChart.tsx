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
  timeframeLabel: string; // '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'
  timeframeSeconds: number;
  bid?: number;
  ask?: number;
  currentBid?: number;
  currentAsk?: number;
  openPositions?: TradeOrderRecord[];
  pendingOrders?: TradeOrderRecord[];
  lastExecutedTrade?: ExecutedTradeNotice | null;
  onClosePosition?: (orderId: string) => void;
  onCancelPendingOrder?: (orderId: string) => void;
  onModifyPositionSlTp?: (orderId: string, nextSl: number, nextTp: number) => void;
  onEditPositionModal?: (pos: TradeOrderRecord) => void;
}

const PRICE_AXIS_WIDTH = 68;
const TIME_AXIS_HEIGHT = 24;

interface DraggingSlTpState {
  orderId: string;
  type: 'SL' | 'TP';
  price: number;
}

export const ApexLiveCandlestickChart: React.FC<ApexLiveCandlestickChartProps> = ({
  symbol,
  timeframeLabel,
  timeframeSeconds,
  bid,
  ask,
  currentBid,
  currentAsk,
  openPositions = [],
  onClosePosition,
  onModifyPositionSlTp,
  onEditPositionModal,
}) => {
  const spec = INSTRUMENTS[symbol] || INSTRUMENTS.XAUUSD;
  const effectiveBid = currentBid ?? bid ?? 0;
  const effectiveAsk = currentAsk ?? ask ?? 0;
  const activePrice =
    effectiveBid > 0 ? effectiveBid : effectiveAsk > 0 ? effectiveAsk - spec.spread : 4045.0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 390,
    height: 460,
  });

  // Historical + live candle series
  const [candles, setCandles] = useState<LiveCandle[]>(() =>
    buildSpotAnchoredCandles(symbol, timeframeLabel, activePrice)
  );

  // Smooth zoom & horizontal pan state
  const [visibleCount, setVisibleCount] = useState<number>(48);
  const [panOffset, setPanOffset] = useState<number>(0);

  // Interactive Analysis Overlays (EMA 20, EMA 50, Bollinger Bands)
  const [showEma20, setShowEma20] = useState<boolean>(true);
  const [showEma50, setShowEma50] = useState<boolean>(false);
  const [showBBands, setShowBBands] = useState<boolean>(false);

  // Crosshair & Hovered Candle Analysis
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  // Interactive Draggable SL / TP state
  const [draggingSlTp, setDraggingSlTp] = useState<DraggingSlTpState | null>(null);
  const draggingSlTpRef = useRef<DraggingSlTpState | null>(null);

  // Panning & Pinch state refs
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartPanRef = useRef<number>(0);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartCountRef = useRef<number>(48);
  const rafPanRef = useRef<number | null>(null);

  // Keep latest activePrice in a ref so async kline loads always anchor to the newest live tick
  const latestPriceRef = useRef<number>(activePrice);
  latestPriceRef.current = activePrice;

  const openPositionsRef = useRef<ChartPositionLine[]>(openPositions);
  openPositionsRef.current = openPositions;

  // Measure container size with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 20 && rect.height > 20) {
        setDimensions({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    };

    updateSize();
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateSize);
    });
    observer.observe(el);
    window.addEventListener('resize', updateSize, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const showEma20Ref = useRef(showEma20);
  useEffect(() => { showEma20Ref.current = showEma20; }, [showEma20]);
  const showEma50Ref = useRef(showEma50);
  useEffect(() => { showEma50Ref.current = showEma50; }, [showEma50]);
  const showBBandsRef = useRef(showBBands);
  useEffect(() => { showBBandsRef.current = showBBands; }, [showBBands]);

  // Load real multi-timeframe OHLCV candles whenever symbol or timeframe changes
  useEffect(() => {
    let cancelled = false;
    setPanOffset(0);
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
            // Preserve live intra-bar high/low excursion accumulated on the current candle
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

  // Real-time tick update on the active (right-most) candle — preserves live upper & lower wicks!
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
        if (next.length > 130) next.shift();
      } else {
        // If series was anchored to a stale spot level (>6x step away), smoothly shift entire series
        const jump = Math.abs(activePrice - last.close);
        if (jump > step * 6) {
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

        // True live candle update: track real intra-candle high and low so live wicks remain visible!
        const nextClose = roundPrice(activePrice, symbol);
        const bodyTop = Math.max(last.open, nextClose);
        const bodyBot = Math.min(last.open, nextClose);
        const maxLiveWick = Math.max(step * 1.85, (bodyTop - bodyBot) * 2.1);

        const candidateHigh = Math.max(last.high, nextClose, bodyTop + minPip);
        const candidateLow = Math.min(last.low, nextClose, bodyBot - minPip);

        last.close = nextClose;
        last.high = roundPrice(Math.min(candidateHigh, bodyTop + maxLiveWick), symbol);
        last.low = roundPrice(Math.max(candidateLow, bodyBot - maxLiveWick), symbol);
        last.volume = (last.volume || 20) + 1;
        next[lastIdx] = last;
      }

      return next;
    });
  }, [activePrice, symbol, timeframeLabel, timeframeSeconds, spec.decimals, spec.spread, spec.volatility]);

  // Precompute technical indicators (EMA 20, EMA 50, Bollinger Bands 20,2)
  const indicators = useMemo(() => {
    const len = candles.length;
    const ema20: number[] = new Array(len);
    const ema50: number[] = new Array(len);
    const bbUpper: number[] = new Array(len);
    const bbLower: number[] = new Array(len);

    const k20 = 2 / (20 + 1);
    const k50 = 2 / (50 + 1);

    for (let i = 0; i < len; i++) {
      const close = candles[i].close;
      ema20[i] = i === 0 ? close : close * k20 + ema20[i - 1] * (1 - k20);
      ema50[i] = i === 0 ? close : close * k50 + ema50[i - 1] * (1 - k50);

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
    }

    return { ema20, ema50, bbUpper, bbLower };
  }, [candles]);

  // Slice visible candles based on zoom (visibleCount) & panOffset
  const visibleSliceInfo = useMemo(() => {
    if (candles.length === 0) return { slice: [] as LiveCandle[], startIndex: 0 };
    const count = Math.min(candles.length, Math.max(18, visibleCount));
    const maxOffset = Math.max(0, candles.length - count);
    const clampedOffset = Math.min(maxOffset, Math.max(0, panOffset));
    const endIdx = candles.length - clampedOffset;
    const startIdx = Math.max(0, endIdx - count);
    return {
      slice: candles.slice(startIdx, endIdx),
      startIndex: startIdx,
    };
  }, [candles, visibleCount, panOffset]);

  const visibleCandles = visibleSliceInfo.slice;

  // Compute Y-axis price bounds (minPrice, maxPrice) tightly fitted to visible candles + nearby position lines
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

    // Include open position entry / SL / TP if within reasonable range (or currently being dragged)
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

    const span = Math.max(maxP - minP, step * 5, minPip * 20);
    const padTop = span * 0.14;
    const padBottom = span * 0.14;

    return {
      minPrice: minP - padBottom,
      maxPrice: maxP + padTop,
    };
  }, [
    visibleCandles,
    activePrice,
    panOffset,
    openPositions,
    draggingSlTp,
    spec.decimals,
    spec.spread,
    spec.volatility,
    timeframeLabel,
  ]);

  const plotWidth = Math.max(120, dimensions.width - PRICE_AXIS_WIDTH);
  const plotHeight = Math.max(120, dimensions.height - TIME_AXIS_HEIGHT);
  const totalSlots = Math.max(visibleCount + 4, visibleCandles.length + 4);

  // Performance Refs for 60fps Render Loop
  const candlesRef = useRef<LiveCandle[]>([]);
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  const visibleCountRef = useRef(visibleCount);
  useEffect(() => {
    visibleCountRef.current = visibleCount;
  }, [visibleCount]);

  const panOffsetRef = useRef(panOffset);
  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  const indicatorsRef = useRef(indicators);
  useEffect(() => {
    indicatorsRef.current = indicators;
  }, [indicators]);

  const crosshairRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    crosshairRef.current = crosshair;
  }, [crosshair]);

  const priceBoundsRef = useRef(priceBounds);
  useEffect(() => {
    priceBoundsRef.current = priceBounds;
  }, [priceBounds]);
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

  // Determine inspected candle (either hovered via crosshair or the live right-most candle)
  const inspectedCandle = useMemo(() => {
    if (visibleCandles.length === 0) return null;
    if (crosshair && crosshair.x >= 0 && crosshair.x <= plotWidth) {
      const idx = Math.floor(crosshair.x / slotWidth);
      if (idx >= 0 && idx < visibleCandles.length) {
        return visibleCandles[idx];
      }
    }
    return visibleCandles[visibleCandles.length - 1];
  }, [visibleCandles, crosshair, plotWidth, slotWidth]);

  // Global window mousemove / touchmove / mouseup / touchend listeners for smooth SL/TP dragging
  useEffect(() => {
    if (!draggingSlTp) return;

    const updateDragFromClientY = (clientY: number) => {
      const container = containerRef.current;
      if (!container || !draggingSlTpRef.current) return;
      const rect = container.getBoundingClientRect();
      const relY = clientY - rect.top;
      const nextPrice = yToPrice(relY);
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
          const nextSl = current.type === 'SL' ? current.price : pos.stopLoss;
          const nextTp = current.type === 'TP' ? current.price : pos.takeProfit;
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
  }, [draggingSlTp, yToPrice, onModifyPositionSlTp]);

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

  // Format bottom time axis labels cleanly across 1m -> 1d
  const formatAxisTime = useCallback(
    (tsMs: number) => {
      const d = new Date(tsMs);
      if (timeframeSeconds >= 86400) {
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      if (timeframeSeconds >= 14400) {
        return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d
          .getHours()
          .toString()
          .padStart(2, '0')}:00`;
      }
      return `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    },
    [timeframeSeconds]
  );

  // Draw crisp 60fps institutional chart on HTML5 Canvas using a continuous rAF loop
  useEffect(() => {
    let rafId: number;
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = requestAnimationFrame(render);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = dimensions;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Clean White Institutional Chart Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      const pb = priceBoundsRef.current;
      const plotW = Math.max(120, width - PRICE_AXIS_WIDTH);
      const plotH = Math.max(120, height - TIME_AXIS_HEIGHT);
      const priceSpan = pb.maxPrice - pb.minPrice;

      const pToY = (price: number) => {
        const ratio = (pb.maxPrice - price) / Math.max(1e-9, priceSpan);
        return ratio * plotH;
      };

      // 2. Price Axis Grid Lines & Right Axis Labels
      const gridRows = 7;
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

      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#475569';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      for (let tick = firstTick; tick <= pb.maxPrice; tick += niceStep) {
        const y = Math.round(pToY(tick)) + 0.5;
        if (y < 10 || y > plotH - 10) continue;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotW, y);
        ctx.stroke();
        ctx.fillText(formatAxisPrice(tick), plotW + 6, y);
      }

      // 3. Vertical Time Grid Lines & Time Axis Labels
      const currentCandles = candlesRef.current;
      const visCount = visibleCountRef.current;
      const pOffset = panOffsetRef.current;
      const sWidth = plotW / Math.max(visCount + 4, currentCandles.length + 4);

      if (currentCandles.length > 0) {
        const maxOff = Math.max(0, currentCandles.length - visCount);
        const clampedOff = Math.min(maxOff, Math.max(0, pOffset));
        const endIdx = currentCandles.length - clampedOff;
        const startIdx = Math.max(0, endIdx - visCount);
        const visibleSlice = currentCandles.slice(startIdx, endIdx);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748B';
        ctx.font = '500 10px "JetBrains Mono", monospace';
        const timeStepSlots = Math.max(6, Math.round(visibleSlice.length / 5));

        for (let i = 0; i < visibleSlice.length; i += timeStepSlots) {
          const c = visibleSlice[i];
          const cx = Math.round((i + 0.5) * sWidth) + 0.5;
          if (cx < 20 || cx > plotW - 20) continue;
          ctx.strokeStyle = '#F1F5F9';
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, plotH);
          ctx.stroke();
          ctx.fillText(formatAxisTime(c.time), cx, plotH + TIME_AXIS_HEIGHT / 2);
        }

        // Separators
        ctx.strokeStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(plotW + 0.5, 0);
        ctx.lineTo(plotW + 0.5, height);
        ctx.moveTo(0, plotH + 0.5);
        ctx.lineTo(width, plotH + 0.5);
        ctx.stroke();

        // 4. Overlays
        const ind = indicatorsRef.current;
        if (showBBandsRef.current && visibleSlice.length > 1) {
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i < visibleSlice.length; i++) {
            const cx = (i + 0.5) * sWidth;
            const y = pToY(ind.bbUpper[startIdx + i]);
            if (i === 0) ctx.moveTo(cx, y); else ctx.lineTo(cx, y);
          }
          for (let i = visibleSlice.length - 1; i >= 0; i--) {
            const cx = (i + 0.5) * sWidth;
            const y = pToY(ind.bbLower[startIdx + i]);
            ctx.lineTo(cx, y);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(14, 165, 233, 0.06)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(14, 165, 233, 0.35)';
          ctx.stroke();
          ctx.restore();
        }
        if (showEma50Ref.current && visibleSlice.length > 1) {
          ctx.save(); ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1.5; ctx.beginPath();
          for (let i = 0; i < visibleSlice.length; i++) {
            const cx = (i + 0.5) * sWidth;
            const y = pToY(ind.ema50[startIdx + i]);
            if (i === 0) ctx.moveTo(cx, y); else ctx.lineTo(cx, y);
          }
          ctx.stroke(); ctx.restore();
        }
        if (showEma20Ref.current && visibleSlice.length > 1) {
          ctx.save(); ctx.strokeStyle = '#0284C7'; ctx.lineWidth = 1.5; ctx.beginPath();
          for (let i = 0; i < visibleSlice.length; i++) {
            const cx = (i + 0.5) * sWidth;
            const y = pToY(ind.ema20[startIdx + i]);
            if (i === 0) ctx.moveTo(cx, y); else ctx.lineTo(cx, y);
          }
          ctx.stroke(); ctx.restore();
        }

        // 5. Candlesticks
        const bWidth = Math.max(3, Math.min(14, sWidth * 0.68));
        const tfMultiplier = getTimeframeStepMultiplier(timeframeLabel);
        const tfStep = Math.max(spec.spread * 1.8, spec.volatility * tfMultiplier);

        for (let i = 0; i < visibleSlice.length; i++) {
          const c = visibleSlice[i];
          const isBull = c.close >= c.open;
          const color = isBull ? '#0B9E6D' : '#E11D48';
          const cx = Math.round((i + 0.5) * sWidth) + 0.5;
          const openY = pToY(c.open);
          const closeY = pToY(c.close);
          const bTopP = Math.max(c.open, c.close);
          const bBotP = Math.min(c.open, c.close);
          const bSpan = Math.max(Math.pow(10, -spec.decimals) * 2, bTopP - bBotP);
          const maxV = Math.max(tfStep * 1.85, bSpan * 2.1);
          const effH = Math.min(Math.max(c.high, bTopP), bTopP + maxV);
          const effL = Math.max(Math.min(c.low, bBotP), bBotP - maxV);
          const hY = pToY(effH);
          const lY = pToY(effL);

          ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.beginPath();
          ctx.moveTo(cx, Math.floor(hY)); ctx.lineTo(cx, Math.ceil(lY)); ctx.stroke();
          const bTop = Math.min(openY, closeY);
          const rH = Math.abs(closeY - openY);
          const bH = Math.max(2, rH);
          const bx = Math.round(cx - bWidth / 2);
          ctx.fillStyle = color; ctx.fillRect(bx, bTop, Math.round(bWidth), bH);
        }
      }

      // 6. Positions
      const curPositions = openPositionsRef.current;
      for (const pos of curPositions) {
        if (pos.entryPrice >= pb.minPrice && pos.entryPrice <= pb.maxPrice) {
          const py = Math.round(pToY(pos.entryPrice)) + 0.5;
          ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = pos.side === 'BUY' ? '#0B9E6D' : '#E11D48';
          ctx.lineWidth = 1.25; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(plotW, py); ctx.stroke(); ctx.restore();
        }
        const drag = draggingSlTpRef.current;
        const eSlP = (drag && drag.orderId === pos.id && drag.type === 'SL') ? drag.price : pos.stopLoss;
        if (eSlP > 0 && eSlP >= pb.minPrice && eSlP <= pb.maxPrice) {
          const sY = Math.round(pToY(eSlP)) + 0.5;
          const isD = drag?.orderId === pos.id && drag?.type === 'SL';
          ctx.save(); ctx.setLineDash(isD ? [] : [3, 3]); ctx.strokeStyle = '#E11D48';
          ctx.lineWidth = isD ? 2.2 : 1.3; ctx.beginPath(); ctx.moveTo(0, sY); ctx.lineTo(plotW, sY); ctx.stroke();
          ctx.fillStyle = '#E11D48'; ctx.fillRect(plotW, sY - 9, PRICE_AXIS_WIDTH, 18);
          ctx.fillStyle = '#FFFFFF'; ctx.font = '700 9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
          ctx.fillText(formatAxisPrice(eSlP), plotW + PRICE_AXIS_WIDTH / 2, sY + 0.5); ctx.restore();
        }
        const eTpP = (drag && drag.orderId === pos.id && drag.type === 'TP') ? drag.price : pos.takeProfit;
        if (eTpP > 0 && eTpP >= pb.minPrice && eTpP <= pb.maxPrice) {
          const tY = Math.round(pToY(eTpP)) + 0.5;
          const isD = drag?.orderId === pos.id && drag?.type === 'TP';
          ctx.save(); ctx.setLineDash(isD ? [] : [3, 3]); ctx.strokeStyle = '#0D9488';
          ctx.lineWidth = isD ? 2.2 : 1.3; ctx.beginPath(); ctx.moveTo(0, tY); ctx.lineTo(plotW, tY); ctx.stroke();
          ctx.fillStyle = '#0D9488'; ctx.fillRect(plotW, tY - 9, PRICE_AXIS_WIDTH, 18);
          ctx.fillStyle = '#FFFFFF'; ctx.font = '700 9.5px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
          ctx.fillText(formatAxisPrice(eTpP), plotW + PRICE_AXIS_WIDTH / 2, tY + 0.5); ctx.restore();
        }
      }

      // 7. Live Price
      const lY = Math.max(11, Math.min(plotH - 11, Math.round(pToY(latestPriceRef.current)) + 0.5));
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#0B9E6D'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, lY); ctx.lineTo(plotW, lY); ctx.stroke(); ctx.restore();
      const pillH = 22; ctx.fillStyle = '#0B9E6D'; ctx.fillRect(plotW, lY - pillH / 2, PRICE_AXIS_WIDTH, pillH);
      ctx.fillStyle = '#FFFFFF'; ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText(formatAxisPrice(latestPriceRef.current), plotW + PRICE_AXIS_WIDTH / 2, lY + 0.5);

      // 8. Crosshair
      const ch = crosshairRef.current;
      const dSlTp = draggingSlTpRef.current;
      if (!dSlTp && ch && ch.x >= 0 && ch.x <= plotW && ch.y >= 0 && ch.y <= plotH) {
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ch.x, 0); ctx.lineTo(ch.x, plotH); ctx.moveTo(0, ch.y); ctx.lineTo(plotW, ch.y); ctx.stroke();
        const hP = pb.maxPrice - (ch.y / plotH) * priceSpan;
        ctx.fillStyle = '#1E293B'; ctx.fillRect(plotW, ch.y - 10, PRICE_AXIS_WIDTH, 20);
        ctx.fillStyle = '#FFFFFF'; ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(formatAxisPrice(hP), plotW + PRICE_AXIS_WIDTH / 2, ch.y + 0.5); ctx.restore();
      }

      ctx.restore();
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [dimensions, formatAxisPrice, formatAxisTime, spec.decimals, spec.spread, spec.volatility, timeframeLabel]);

  // Check if a pointer Y is close to an existing SL or TP line on canvas so user can drag line anywhere
  const findNearbySlTpLine = useCallback(
    (relY: number): { orderId: string; type: 'SL' | 'TP'; price: number } | null => {
      const hitTolerancePx = 11;
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

  // Mouse & Touch Panning + Pinch-to-Zoom + Direct SL/TP Line Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const hitLine = findNearbySlTpLine(relY);
    if (hitLine) {
      startSlTpDrag(hitLine.orderId, hitLine.type, hitLine.price, e);
      return;
    }

    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartPanRef.current = panOffset;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingSlTpRef.current) return;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartXRef.current;
      const barsMoved = Math.round(deltaX / Math.max(4, slotWidth));
      const maxOffset = Math.max(0, candles.length - visibleCount);
      const nextPan = Math.min(maxOffset, Math.max(0, dragStartPanRef.current + barsMoved));
      if (rafPanRef.current) cancelAnimationFrame(rafPanRef.current);
      rafPanRef.current = requestAnimationFrame(() => {
        setPanOffset(nextPan);
      });
    } else {
      setCrosshair({ x, y });
    }
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setCrosshair(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 6 : -6;
    setVisibleCount((prev) => Math.min(95, Math.max(20, prev + delta)));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const relY = e.touches[0].clientY - rect.top;
      const hitLine = findNearbySlTpLine(relY);
      if (hitLine) {
        startSlTpDrag(hitLine.orderId, hitLine.type, hitLine.price, e);
        return;
      }

      isDraggingRef.current = true;
      dragStartXRef.current = e.touches[0].clientX;
      dragStartPanRef.current = panOffset;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartCountRef.current = visibleCount;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (draggingSlTpRef.current) return;

    if (e.touches.length === 1 && isDraggingRef.current) {
      const deltaX = e.touches[0].clientX - dragStartXRef.current;
      const barsMoved = Math.round(deltaX / Math.max(4, slotWidth));
      const maxOffset = Math.max(0, candles.length - visibleCount);
      const nextPan = Math.min(maxOffset, Math.max(0, dragStartPanRef.current + barsMoved));
      if (rafPanRef.current) cancelAnimationFrame(rafPanRef.current);
      rafPanRef.current = requestAnimationFrame(() => {
        setPanOffset(nextPan);
      });
    } else if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (dist > 10) {
        const scale = pinchStartDistRef.current / dist;
        const nextCount = Math.round(pinchStartCountRef.current * scale);
        setVisibleCount(Math.min(95, Math.max(20, nextCount)));
      }
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    pinchStartDistRef.current = null;
  };

  // Helper to quickly re-add SL or TP if it was removed
  const handleQuickAddSlOrTp = (pos: ChartPositionLine, type: 'SL' | 'TP') => {
    if (!onModifyPositionSlTp) return;
    const tfScale = getTimeframeStepMultiplier(timeframeLabel);
    const unitDist = Math.max(spec.spread * 6, spec.volatility * tfScale * 2.2);
    if (type === 'SL') {
      const dist = unitDist * 1.15;
      const newSl = roundPrice(
        pos.side === 'BUY' ? activePrice - dist : activePrice + dist,
        symbol
      );
      onModifyPositionSlTp(pos.id, newSl, pos.takeProfit);
    } else {
      const dist = unitDist * 1.85;
      const newTp = roundPrice(
        pos.side === 'BUY' ? activePrice + dist : activePrice - dist,
        symbol
      );
      onModifyPositionSlTp(pos.id, pos.stopLoss, newTp);
    }
  };

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
      className={`relative w-full h-full bg-white select-none overflow-hidden touch-none ${
        draggingSlTp ? 'cursor-ns-resize' : 'cursor-crosshair'
      }`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Smooth Chart Analysis & Indicator Toolbar + Live OHLCV Wick Readout */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="absolute top-1.5 left-2 right-[72px] z-10 flex flex-wrap items-center justify-between gap-1.5 pointer-events-auto"
      >
        {/* OHLC + Live Wick Range HUD */}
        {inspectedCandle && (
          <div className="inline-flex flex-wrap items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/92 backdrop-blur-sm border border-slate-200/90 shadow-xs text-[9.5px] font-mono text-slate-600">
            <span className="font-extrabold text-slate-900">{spec.shortName}</span>
            <span>
              O:<strong className="text-slate-800">{formatAxisPrice(inspectedCandle.open)}</strong>
            </span>
            <span>
              H:<strong className="text-[#0B9E6D]">{formatAxisPrice(inspectedCandle.high)}</strong>
            </span>
            <span>
              L:<strong className="text-[#E11D48]">{formatAxisPrice(inspectedCandle.low)}</strong>
            </span>
            <span>
              C:
              <strong
                className={
                  inspectedCandle.close >= inspectedCandle.open
                    ? 'text-[#0B9E6D]'
                    : 'text-[#E11D48]'
                }
              >
                {formatAxisPrice(inspectedCandle.close)}
              </strong>
            </span>
          </div>
        )}

        {/* Analysis Indicator Toggles */}
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowEma20((v) => !v)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
              showEma20
                ? 'bg-sky-500/15 border-sky-500/50 text-sky-700'
                : 'bg-white/90 border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            EMA20
          </button>
          <button
            type="button"
            onClick={() => setShowEma50((v) => !v)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
              showEma50
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-700'
                : 'bg-white/90 border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            EMA50
          </button>
          <button
            type="button"
            onClick={() => setShowBBands((v) => !v)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
              showBBands
                ? 'bg-teal-500/15 border-teal-500/50 text-teal-700'
                : 'bg-white/90 border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            BB
          </button>
          {panOffset > 0 && (
            <button
              type="button"
              onClick={() => setPanOffset(0)}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#0B9E6D] text-white shadow-xs cursor-pointer"
            >
              LIVE →
            </button>
          )}
        </div>
      </div>

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

        // Projected PnL when dragging SL or TP
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
            {/* Entry Pill with Quick +SL / +TP if removed & 1-Click Close */}
            {showEntry && (
              <div
                style={{ top: `${entryY - 12}px` }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="absolute left-2.5 z-10 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/95 border border-slate-300 shadow-sm text-[10px] font-mono pointer-events-auto"
              >
                <span
                  className={`font-extrabold ${
                    pos.side === 'BUY' ? 'text-[#0B9E6D]' : 'text-[#E11D48]'
                  }`}
                >
                  {pos.side} {pos.volume.toFixed(2)}
                </span>
                <span
                  className={`font-bold ${
                    isPositive ? 'text-[#0B9E6D]' : 'text-[#E11D48]'
                  }`}
                >
                  {isPositive ? '+' : ''}${pos.netPnl.toFixed(2)}
                </span>
                {pos.stopLoss <= 0 && onModifyPositionSlTp && (
                  <button
                    type="button"
                    onClick={() => handleQuickAddSlOrTp(pos, 'SL')}
                    className="px-1 py-0.2 rounded bg-rose-50 border border-rose-300 text-[#E11D48] hover:bg-rose-600 hover:text-white font-bold text-[9px] cursor-pointer"
                    title="Add Stop Loss to Chart"
                  >
                    +SL
                  </button>
                )}
                {pos.takeProfit <= 0 && onModifyPositionSlTp && (
                  <button
                    type="button"
                    onClick={() => handleQuickAddSlOrTp(pos, 'TP')}
                    className="px-1 py-0.2 rounded bg-teal-50 border border-teal-300 text-[#0D9488] hover:bg-teal-600 hover:text-white font-bold text-[9px] cursor-pointer"
                    title="Add Take Profit to Chart"
                  >
                    +TP
                  </button>
                )}
                {onEditPositionModal && (
                  <button
                    type="button"
                    onClick={() => onEditPositionModal(pos)}
                    className="px-1 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-800 hover:text-white font-bold text-[9px] cursor-pointer"
                    title="Edit Stop Loss & Take Profit"
                  >
                    SL/TP
                  </button>
                )}
                {onClosePosition && (
                  <button
                    type="button"
                    onClick={() => onClosePosition(pos.id)}
                    className="ml-0.5 px-1 rounded bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white font-bold transition-colors cursor-pointer"
                    title="Close Position"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Moveable / Draggable Stop Loss (SL) Pill with 1-Click Remove (×) */}
            {showSl && (
              <div
                style={{ top: `${slY - 12}px` }}
                data-testid={`chart-sl-line-${pos.id}`}
                onMouseDown={(e) => startSlTpDrag(pos.id, 'SL', effectiveSlPrice, e)}
                onTouchStart={(e) => startSlTpDrag(pos.id, 'SL', effectiveSlPrice, e)}
                className={`absolute right-[74px] z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50/95 border shadow-sm text-[9.5px] font-mono text-[#E11D48] pointer-events-auto cursor-ns-resize select-none transition-shadow ${
                  draggingSlTp?.orderId === pos.id && draggingSlTp?.type === 'SL'
                    ? 'border-[#E11D48] ring-2 ring-rose-400/50 shadow-md scale-[1.03]'
                    : 'border-rose-300 hover:border-[#E11D48]'
                }`}
                title="Drag Up/Down to Move Stop Loss"
              >
                <span className="font-extrabold">⇅ SL {formatAxisPrice(effectiveSlPrice)}</span>
                <span className="text-[8.5px] opacity-85">
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
                    className="ml-0.5 px-1 rounded bg-rose-500/15 hover:bg-rose-600 text-[#E11D48] hover:text-white font-extrabold transition-colors cursor-pointer"
                    title="Remove Stop Loss (SL)"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Moveable / Draggable Take Profit (TP) Pill with 1-Click Remove (×) */}
            {showTp && (
              <div
                style={{ top: `${tpY - 12}px` }}
                data-testid={`chart-tp-line-${pos.id}`}
                onMouseDown={(e) => startSlTpDrag(pos.id, 'TP', effectiveTpPrice, e)}
                onTouchStart={(e) => startSlTpDrag(pos.id, 'TP', effectiveTpPrice, e)}
                className={`absolute right-[74px] z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50/95 border shadow-sm text-[9.5px] font-mono text-[#0D9488] pointer-events-auto cursor-ns-resize select-none transition-shadow ${
                  draggingSlTp?.orderId === pos.id && draggingSlTp?.type === 'TP'
                    ? 'border-[#0D9488] ring-2 ring-teal-400/50 shadow-md scale-[1.03]'
                    : 'border-teal-300 hover:border-[#0D9488]'
                }`}
                title="Drag Up/Down to Move Take Profit"
              >
                <span className="font-extrabold">⇅ TP {formatAxisPrice(effectiveTpPrice)}</span>
                <span className="text-[8.5px] opacity-85">
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
                    className="ml-0.5 px-1 rounded bg-teal-500/15 hover:bg-teal-600 text-[#0D9488] hover:text-white font-extrabold transition-colors cursor-pointer"
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
};
