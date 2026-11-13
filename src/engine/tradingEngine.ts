export type SymbolCode =
  // Metals & Commodities
  | 'XAUUSD'
  | 'XAGUSD'
  | 'USOIL'
  | 'UKOIL'
  // Forex Majors & Crosses
  | 'EURUSD'
  | 'GBPUSD'
  | 'USDJPY'
  | 'USDCHF'
  | 'AUDUSD'
  | 'USDCAD'
  | 'NZDUSD'
  | 'EURGBP'
  | 'EURJPY'
  | 'GBPJPY'
  // Indices
  | 'NAS100'
  | 'US30'
  | 'US500'
  | 'GER40'
  | 'UK100'
  // Crypto
  | 'BTCUSD'
  | 'ETHUSD'
  | 'SOLUSD'
  | 'XRPUSD'
  | 'BNBUSD';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
export type OrderStatus = 'OPEN' | 'PENDING' | 'CLOSED' | 'CANCELLED';
export type ChallengeType = 'instant' | 'one_step' | 'two_step' | 'three_step';
export type AccountStatus = 'available' | 'active' | 'passed' | 'failed' | 'suspended' | 'completed';

export interface InstrumentSpec {
  symbol: SymbolCode;
  name: string;
  shortName: string;
  category: 'Metals' | 'Forex' | 'Crypto' | 'Indices' | 'Commodities';
  tvSymbol: string;
  basePrice: number;
  spread: number;
  decimals: number;
  contractSize: number;
  commissionPerLot: number;
  volatility: number;
}

export interface MarketQuote {
  symbol: SymbolCode;
  bid: number;
  ask: number;
  last: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface TradingAccountRecord {
  id: string;
  accountNumber: string;
  userId: string;
  userEmail?: string;
  challengeId: string;
  challengeTitle: string;
  challengeType: ChallengeType;
  accountSize: number;
  startingBalance: number;
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  profitTargetPct: number;
  dailyDrawdownPct: number;
  maxDrawdownPct: number;
  minTradingDays: number;
  tradingDaysCount: number;
  leverage: number;
  profitSplitPct?: number;
  currentStep?: number;
  totalSteps?: number;
  phaseStartingBalance?: number;
  peakEquity: number;
  dailyStartingEquity: number;
  lastDailyResetDate: string;
  status: AccountStatus;
  breachReason?: string;
  terminalUserId?: string;
  terminalPassword?: string;
  certificateImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradeOrderRecord {
  id: string;
  ticketId: string;
  accountId: string;
  userId: string;
  symbol: SymbolCode;
  side: OrderSide;
  orderType: OrderType;
  volume: number;
  entryPrice: number;
  currentPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  grossPnl: number;
  commission: number;
  netPnl: number;
  status: OrderStatus;
  openTime: string;
  closeTime: string;
}

export interface OrderSubmissionInput {
  accountId: string;
  symbol: SymbolCode;
  side: OrderSide;
  orderType: OrderType;
  volume: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface OrderValidationResult {
  valid: boolean;
  error?: string;
  executionPrice: number;
  requiredMargin: number;
  estimatedCommission: number;
  estimatedRiskUsd: number;
  estimatedRiskPct: number;
}

export const INSTRUMENTS: Record<SymbolCode, InstrumentSpec> = {
  // Metals & Commodities
  XAUUSD: {
    symbol: 'XAUUSD',
    name: 'Gold Spot / US Dollar',
    shortName: 'GOLD',
    category: 'Metals',
    tvSymbol: 'OANDA:XAUUSD',
    basePrice: 4094.00,
    spread: 0.45,
    decimals: 2,
    contractSize: 100,
    commissionPerLot: 5.0,
    volatility: 1.25,
  },
  XAGUSD: {
    symbol: 'XAGUSD',
    name: 'Silver Spot / US Dollar',
    shortName: 'SILVER',
    category: 'Metals',
    tvSymbol: 'OANDA:XAGUSD',
    basePrice: 53.25,
    spread: 0.04,
    decimals: 3,
    contractSize: 5000,
    commissionPerLot: 5.0,
    volatility: 0.12,
  },
  USOIL: {
    symbol: 'USOIL',
    name: 'WTI Crude Oil',
    shortName: 'CRUDE',
    category: 'Commodities',
    tvSymbol: 'FX:USOIL',
    basePrice: 84.40,
    spread: 0.04,
    decimals: 2,
    contractSize: 1000,
    commissionPerLot: 4.5,
    volatility: 0.35,
  },
  UKOIL: {
    symbol: 'UKOIL',
    name: 'Brent Crude Oil',
    shortName: 'BRENT',
    category: 'Commodities',
    tvSymbol: 'FX:UKOIL',
    basePrice: 88.20,
    spread: 0.04,
    decimals: 2,
    contractSize: 1000,
    commissionPerLot: 4.5,
    volatility: 0.35,
  },

  // Forex Majors & Crosses
  EURUSD: {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    shortName: 'EUR/USD',
    category: 'Forex',
    tvSymbol: 'FX:EURUSD',
    basePrice: 1.1186,
    spread: 0.00012,
    decimals: 5,
    contractSize: 100000,
    commissionPerLot: 4.5,
    volatility: 0.00025,
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    name: 'British Pound / US Dollar',
    shortName: 'GBP/USD',
    category: 'Forex',
    tvSymbol: 'FX:GBPUSD',
    basePrice: 1.3416,
    spread: 0.00015,
    decimals: 5,
    contractSize: 100000,
    commissionPerLot: 4.5,
    volatility: 0.00032,
  },
  USDJPY: {
    symbol: 'USDJPY',
    name: 'US Dollar / Japanese Yen',
    shortName: 'USD/JPY',
    category: 'Forex',
    tvSymbol: 'FX:USDJPY',
    basePrice: 158.030,
    spread: 0.014,
    decimals: 3,
    contractSize: 100000,
    commissionPerLot: 4.5,
    volatility: 0.04,
  },
  USDCHF: {
    symbol: 'USDCHF',
    name: 'US Dollar / Swiss Franc',
    shortName: 'USD/CHF',
    category: 'Forex',
    tvSymbol: 'FX:USDCHF',
    basePrice: 0.81900,
    spread: 0.00014,
    decimals: 5,
    contractSize: 100000,
    commissionPerLot: 4.5,
    volatility: 0.00028,
  },
  AUDUSD: {
    symbol: 'AUDUSD',
    name: 'Australian Dollar / US Dollar',
    shortName: 'AUD/USD',
    category: 'Forex',
    tvSymbol: 'FX:AUDUSD',
    basePrice: 0.68950,
    spread: 0.00014,
    decimals: 5,
    contractSize: 100000,
    commissionPerLot: 4.5,
    volatility: 0.00026,
  },
  USDCAD: {
    symbol: 'USDCAD',
    name: 'US Dollar / Canadian Dollar',
    shortName: 'USD/CAD',
    category: 'Forex',
    tvSymbol: 'FX:USDCAD',
    basePrice: 1.40990,
    spread: 0.00016,
    decimals: 5,
    contractSize: 100000,
    commissionPerLot: 4.5,
    volatility: 0.00027,
  },
  NZDUSD: {
    symbol: 'NZDUSD',
    name: 'New Zealand Dollar / US Dollar',
    shortName: 'NZD/USD',
    category: 'Forex',
    tvSymbol: 'FX:NZDUSD',
    basePrice: 0.56110,
    spread: 0.00018,
    decimals: 5,
    contractSize: 100000,
    commissionPerLot: 4.5,
    volatility: 0.00030,
  },
  EURGBP: {
    symbol: 'EURGBP',
    name: 'Euro / British Pound',
    shortName: 'EUR/GBP',
    category: 'Forex',
    tvSymbol: 'FX:EURGBP',
    basePrice: 0.83380,
    spread: 0.00015,
    decimals: 5,
    contractSize: 100000,
    commissionPerLot: 4.5,
    volatility: 0.00022,
  },
  EURJPY: {
    symbol: 'EURJPY',
    name: 'Euro / Japanese Yen',
    shortName: 'EUR/JPY',
    category: 'Forex',
    tvSymbol: 'FX:EURJPY',
    basePrice: 176.790,
    spread: 0.018,
    decimals: 3,
    contractSize: 100000,
    commissionPerLot: 4.5,
    volatility: 0.045,
  },
  GBPJPY: {
    symbol: 'GBPJPY',
    name: 'British Pound / Japanese Yen',
    shortName: 'GBP/JPY',
    category: 'Forex',
    tvSymbol: 'FX:GBPJPY',
    basePrice: 212.020,
    spread: 0.022,
    decimals: 3,
    contractSize: 100000,
    commissionPerLot: 4.5,
    volatility: 0.055,
  },

  // Indices
  NAS100: {
    symbol: 'NAS100',
    name: 'US Tech 100 Index',
    shortName: 'NAS100',
    category: 'Indices',
    tvSymbol: 'FOREXCOM:NSXUSD',
    basePrice: 28375.00,
    spread: 2.20,
    decimals: 2,
    contractSize: 10,
    commissionPerLot: 3.5,
    volatility: 12.5,
  },
  US30: {
    symbol: 'US30',
    name: 'US Wall Street 30 Index',
    shortName: 'US30',
    category: 'Indices',
    tvSymbol: 'FOREXCOM:DJI',
    basePrice: 51525.00,
    spread: 3.80,
    decimals: 2,
    contractSize: 10,
    commissionPerLot: 3.5,
    volatility: 18.0,
  },
  US500: {
    symbol: 'US500',
    name: 'US S&P 500 Index',
    shortName: 'US500',
    category: 'Indices',
    tvSymbol: 'FOREXCOM:SPXUSD',
    basePrice: 7212.25,
    spread: 0.80,
    decimals: 2,
    contractSize: 10,
    commissionPerLot: 3.5,
    volatility: 4.4,
  },
  GER40: {
    symbol: 'GER40',
    name: 'Germany 40 (DAX)',
    shortName: 'GER40',
    category: 'Indices',
    tvSymbol: 'FOREXCOM:GER40',
    basePrice: 21450.00,
    spread: 1.50,
    decimals: 2,
    contractSize: 10,
    commissionPerLot: 3.5,
    volatility: 7.0,
  },
  UK100: {
    symbol: 'UK100',
    name: 'UK 100 (FTSE)',
    shortName: 'UK100',
    category: 'Indices',
    tvSymbol: 'FOREXCOM:UK100',
    basePrice: 8840.00,
    spread: 1.20,
    decimals: 2,
    contractSize: 10,
    commissionPerLot: 3.5,
    volatility: 3.0,
  },

  // Crypto
  BTCUSD: {
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    shortName: 'BTC/USD',
    category: 'Crypto',
    tvSymbol: 'BINANCE:BTCUSDT',
    basePrice: 75870.00,
    spread: 18.50,
    decimals: 2,
    contractSize: 1,
    commissionPerLot: 8.0,
    volatility: 55.0,
  },
  ETHUSD: {
    symbol: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    shortName: 'ETH/USD',
    category: 'Crypto',
    tvSymbol: 'BINANCE:ETHUSDT',
    basePrice: 2105.00,
    spread: 1.20,
    decimals: 2,
    contractSize: 10,
    commissionPerLot: 6.0,
    volatility: 3.2,
  },
  SOLUSD: {
    symbol: 'SOLUSD',
    name: 'Solana / US Dollar',
    shortName: 'SOL/USD',
    category: 'Crypto',
    tvSymbol: 'BINANCE:SOLUSDT',
    basePrice: 194.50,
    spread: 0.25,
    decimals: 2,
    contractSize: 10,
    commissionPerLot: 5.0,
    volatility: 1.2,
  },
  XRPUSD: {
    symbol: 'XRPUSD',
    name: 'Ripple / US Dollar',
    shortName: 'XRP/USD',
    category: 'Crypto',
    tvSymbol: 'BINANCE:XRPUSDT',
    basePrice: 0.6240,
    spread: 0.0012,
    decimals: 4,
    contractSize: 1000,
    commissionPerLot: 4.5,
    volatility: 0.005,
  },
  BNBUSD: {
    symbol: 'BNBUSD',
    name: 'Binance Coin / US Dollar',
    shortName: 'BNB/USD',
    category: 'Crypto',
    tvSymbol: 'BINANCE:BNBUSDT',
    basePrice: 624.00,
    spread: 0.40,
    decimals: 2,
    contractSize: 10,
    commissionPerLot: 5.0,
    volatility: 2.5,
  },
};

export function getSymbolDisplayName(symbol: SymbolCode): string {
  return INSTRUMENTS[symbol]?.shortName || symbol;
}

export function roundPrice(price: number, symbol: SymbolCode): number {
  const spec = INSTRUMENTS[symbol];
  const factor = Math.pow(10, spec.decimals);
  return Math.round(price * factor) / factor;
}

export function calculateRequiredMargin(
  symbol: SymbolCode,
  volume: number,
  entryPrice: number,
  leverage: number
): number {
  const spec = INSTRUMENTS[symbol];
  if (volume <= 0 || entryPrice <= 0 || leverage <= 0) return 0;
  const notional = volume * spec.contractSize * entryPrice;
  return Math.round((notional / leverage) * 100) / 100;
}

export function calculatePositionPnl(
  symbol: SymbolCode,
  side: OrderSide,
  volume: number,
  entryPrice: number,
  currentPrice: number,
  status?: OrderStatus | 'closed' | 'open',
  frozenPnl?: { grossPnl: number; commission: number; netPnl: number }
): { grossPnl: number; commission: number; netPnl: number } {
  if (
    status &&
    (status === 'CLOSED' ||
      status === 'CANCELLED' ||
      String(status).toLowerCase() === 'closed') &&
    frozenPnl
  ) {
    return {
      grossPnl: frozenPnl.grossPnl,
      commission: frozenPnl.commission,
      netPnl: frozenPnl.netPnl,
    };
  }
  const spec = INSTRUMENTS[symbol];
  const priceDiff = side === 'BUY' ? currentPrice - entryPrice : entryPrice - currentPrice;
  const grossPnl = Math.round(priceDiff * spec.contractSize * volume * 100) / 100;
  const commission = Math.round(spec.commissionPerLot * volume * 100) / 100;
  const netPnl = Math.round((grossPnl - commission) * 100) / 100;
  return { grossPnl, commission, netPnl };
}

/**
 * Evaluates a position's PnL and explicitly stops updating once the position state
 * is marked as 'CLOSED' / 'closed', returning its static frozen values.
 */
export function calculateOrderPnlSnapshot(
  order: TradeOrderRecord,
  liveQuote?: MarketQuote
): {
  currentPrice: number;
  grossPnl: number;
  commission: number;
  netPnl: number;
  isStatic: boolean;
} {
  const isClosedState =
    order.status === 'CLOSED' ||
    order.status === 'CANCELLED' ||
    String(order.status).toLowerCase() === 'closed' ||
    Boolean(order.closeTime);

  if (isClosedState || order.status !== 'OPEN') {
    const frozenPrice = order.exitPrice > 0 ? order.exitPrice : order.currentPrice;
    return {
      currentPrice: frozenPrice,
      grossPnl: order.grossPnl,
      commission: order.commission,
      netPnl: order.netPnl,
      isStatic: true,
    };
  }

  if (!liveQuote) {
    return {
      currentPrice: order.currentPrice,
      grossPnl: order.grossPnl,
      commission: order.commission,
      netPnl: order.netPnl,
      isStatic: false,
    };
  }

  const markPrice = order.side === 'BUY' ? liveQuote.bid : liveQuote.ask;
  const pnl = calculatePositionPnl(
    order.symbol,
    order.side,
    order.volume,
    order.entryPrice,
    markPrice
  );
  return {
    currentPrice: markPrice,
    grossPnl: pnl.grossPnl,
    commission: pnl.commission,
    netPnl: pnl.netPnl,
    isStatic: false,
  };
}

export function calculateOrderRisk(
  symbol: SymbolCode,
  side: OrderSide,
  volume: number,
  entryPrice: number,
  stopLoss: number | undefined,
  accountEquity: number
): { riskUsd: number; riskPct: number } {
  if (!stopLoss || stopLoss <= 0 || entryPrice <= 0 || volume <= 0 || accountEquity <= 0) {
    return { riskUsd: 0, riskPct: 0 };
  }
  const spec = INSTRUMENTS[symbol];
  const distance = Math.abs(entryPrice - stopLoss);
  const riskUsd = Math.round(distance * spec.contractSize * volume * 100) / 100;
  const riskPct = Math.round((riskUsd / accountEquity) * 10000) / 100;
  return { riskUsd, riskPct };
}

export function validateOrderRequest(
  input: OrderSubmissionInput,
  account: TradingAccountRecord,
  quote: MarketQuote
): OrderValidationResult {
  const spec = INSTRUMENTS[input.symbol];
  if (!spec) {
    return {
      valid: false,
      error: 'Unsupported trading instrument.',
      executionPrice: 0,
      requiredMargin: 0,
      estimatedCommission: 0,
      estimatedRiskUsd: 0,
      estimatedRiskPct: 0,
    };
  }

  if (account.status === 'failed' || account.status === 'suspended') {
    return {
      valid: false,
      error: `Account #${account.accountNumber} is BREACHED (${account.breachReason || 'Drawdown Limit Violated'}) and cannot place new orders.`,
      executionPrice: 0,
      requiredMargin: 0,
      estimatedCommission: 0,
      estimatedRiskUsd: 0,
      estimatedRiskPct: 0,
    };
  }

  const activeRules = resolveChallengeRulesForAccount(account);
  const maxFloor = Math.round(account.startingBalance * (1 - activeRules.maxDrawdownPct / 100) * 100) / 100;
  const dailyFloor = Math.round(account.startingBalance * (1 - activeRules.dailyDrawdownPct / 100) * 100) / 100;
  if (account.equity <= maxFloor || account.equity <= dailyFloor) {
    return {
      valid: false,
      error: `Account #${account.accountNumber} has reached its Daily/Max Drawdown breach threshold ($${Math.max(maxFloor, dailyFloor).toLocaleString()}). Trading is locked.`,
      executionPrice: 0,
      requiredMargin: 0,
      estimatedCommission: 0,
      estimatedRiskUsd: 0,
      estimatedRiskPct: 0,
    };
  }

  if (isNaN(input.volume) || input.volume < 0.01 || input.volume > 100) {
    return {
      valid: false,
      error: 'Volume must be between 0.01 and 100.00 lots.',
      executionPrice: 0,
      requiredMargin: 0,
      estimatedCommission: 0,
      estimatedRiskUsd: 0,
      estimatedRiskPct: 0,
    };
  }

  const effectiveSide: OrderSide =
    input.orderType === 'MARKET'
      ? input.side
      : input.orderType === 'BUY_LIMIT' || input.orderType === 'BUY_STOP'
      ? 'BUY'
      : 'SELL';

  const marketFillPrice = effectiveSide === 'BUY' ? quote.ask : quote.bid;
  const executionPrice =
    input.orderType === 'MARKET'
      ? roundPrice(marketFillPrice, input.symbol)
      : roundPrice(input.entryPrice || 0, input.symbol);

  if (executionPrice <= 0) {
    return {
      valid: false,
      error: 'Valid entry price is required for pending orders.',
      executionPrice: 0,
      requiredMargin: 0,
      estimatedCommission: 0,
      estimatedRiskUsd: 0,
      estimatedRiskPct: 0,
    };
  }

  // Validate pending order price relation to market
  if (input.orderType === 'BUY_LIMIT' && executionPrice >= quote.ask) {
    return {
      valid: false,
      error: `Buy Limit price (${executionPrice}) must be below current Ask (${quote.ask}).`,
      executionPrice,
      requiredMargin: 0,
      estimatedCommission: 0,
      estimatedRiskUsd: 0,
      estimatedRiskPct: 0,
    };
  }
  if (input.orderType === 'SELL_LIMIT' && executionPrice <= quote.bid) {
    return {
      valid: false,
      error: `Sell Limit price (${executionPrice}) must be above current Bid (${quote.bid}).`,
      executionPrice,
      requiredMargin: 0,
      estimatedCommission: 0,
      estimatedRiskUsd: 0,
      estimatedRiskPct: 0,
    };
  }
  if (input.orderType === 'BUY_STOP' && executionPrice <= quote.ask) {
    return {
      valid: false,
      error: `Buy Stop price (${executionPrice}) must be above current Ask (${quote.ask}).`,
      executionPrice,
      requiredMargin: 0,
      estimatedCommission: 0,
      estimatedRiskUsd: 0,
      estimatedRiskPct: 0,
    };
  }
  if (input.orderType === 'SELL_STOP' && executionPrice >= quote.bid) {
    return {
      valid: false,
      error: `Sell Stop price (${executionPrice}) must be below current Bid (${quote.bid}).`,
      executionPrice,
      requiredMargin: 0,
      estimatedCommission: 0,
      estimatedRiskUsd: 0,
      estimatedRiskPct: 0,
    };
  }

  // Validate Stop Loss & Take Profit directional logic
  const sl = input.stopLoss && input.stopLoss > 0 ? roundPrice(input.stopLoss, input.symbol) : 0;
  const tp = input.takeProfit && input.takeProfit > 0 ? roundPrice(input.takeProfit, input.symbol) : 0;

  if (sl > 0) {
    if (effectiveSide === 'BUY' && sl >= executionPrice) {
      return {
        valid: false,
        error: `Buy Stop Loss (${sl}) must be below entry price (${executionPrice}).`,
        executionPrice,
        requiredMargin: 0,
        estimatedCommission: 0,
        estimatedRiskUsd: 0,
        estimatedRiskPct: 0,
      };
    }
    if (effectiveSide === 'SELL' && sl <= executionPrice) {
      return {
        valid: false,
        error: `Sell Stop Loss (${sl}) must be above entry price (${executionPrice}).`,
        executionPrice,
        requiredMargin: 0,
        estimatedCommission: 0,
        estimatedRiskUsd: 0,
        estimatedRiskPct: 0,
      };
    }
  }

  if (tp > 0) {
    if (effectiveSide === 'BUY' && tp <= executionPrice) {
      return {
        valid: false,
        error: `Buy Take Profit (${tp}) must be above entry price (${executionPrice}).`,
        executionPrice,
        requiredMargin: 0,
        estimatedCommission: 0,
        estimatedRiskUsd: 0,
        estimatedRiskPct: 0,
      };
    }
    if (effectiveSide === 'SELL' && tp >= executionPrice) {
      return {
        valid: false,
        error: `Sell Take Profit (${tp}) must be below entry price (${executionPrice}).`,
        executionPrice,
        requiredMargin: 0,
        estimatedCommission: 0,
        estimatedRiskUsd: 0,
        estimatedRiskPct: 0,
      };
    }
  }

  const requiredMargin = calculateRequiredMargin(
    input.symbol,
    input.volume,
    executionPrice,
    account.leverage
  );
  const estimatedCommission = Math.round(spec.commissionPerLot * input.volume * 100) / 100;
  const { riskUsd, riskPct } = calculateOrderRisk(
    input.symbol,
    effectiveSide,
    input.volume,
    executionPrice,
    sl,
    account.equity
  );

  if (requiredMargin > account.freeMargin) {
    return {
      valid: false,
      error: `Insufficient Free Margin. Required: $${requiredMargin.toLocaleString()}, Available: $${account.freeMargin.toLocaleString()}.`,
      executionPrice,
      requiredMargin,
      estimatedCommission,
      estimatedRiskUsd: riskUsd,
      estimatedRiskPct: riskPct,
    };
  }

  return {
    valid: true,
    executionPrice,
    requiredMargin,
    estimatedCommission,
    estimatedRiskUsd: riskUsd,
    estimatedRiskPct: riskPct,
  };
}

export function evaluateOrderTrigger(
  order: TradeOrderRecord,
  quote: MarketQuote
): { action: 'NONE' | 'ACTIVATE_PENDING' | 'CLOSE_SL' | 'CLOSE_TP'; fillPrice: number } {
  if (order.status === 'PENDING') {
    if (order.orderType === 'BUY_LIMIT' && quote.ask <= order.entryPrice) {
      return { action: 'ACTIVATE_PENDING', fillPrice: quote.ask };
    }
    if (order.orderType === 'SELL_LIMIT' && quote.bid >= order.entryPrice) {
      return { action: 'ACTIVATE_PENDING', fillPrice: quote.bid };
    }
    if (order.orderType === 'BUY_STOP' && quote.ask >= order.entryPrice) {
      return { action: 'ACTIVATE_PENDING', fillPrice: quote.ask };
    }
    if (order.orderType === 'SELL_STOP' && quote.bid <= order.entryPrice) {
      return { action: 'ACTIVATE_PENDING', fillPrice: quote.bid };
    }
    return { action: 'NONE', fillPrice: order.currentPrice };
  }

  if (order.status === 'OPEN') {
    const markPrice = order.side === 'BUY' ? quote.bid : quote.ask;
    if (order.stopLoss > 0) {
      if (order.side === 'BUY' && markPrice <= order.stopLoss) {
        return { action: 'CLOSE_SL', fillPrice: order.stopLoss };
      }
      if (order.side === 'SELL' && markPrice >= order.stopLoss) {
        return { action: 'CLOSE_SL', fillPrice: order.stopLoss };
      }
    }
    if (order.takeProfit > 0) {
      if (order.side === 'BUY' && markPrice >= order.takeProfit) {
        return { action: 'CLOSE_TP', fillPrice: order.takeProfit };
      }
      if (order.side === 'SELL' && markPrice <= order.takeProfit) {
        return { action: 'CLOSE_TP', fillPrice: order.takeProfit };
      }
    }
    return { action: 'NONE', fillPrice: markPrice };
  }

  return { action: 'NONE', fillPrice: order.currentPrice };
}

export interface ResolvedChallengeRules {
  challengeType: ChallengeType;
  currentStep: number;
  totalSteps: number;
  dailyDrawdownPct: number;
  maxDrawdownPct: number;
  profitTargetPct: number;
  minTradingDays: number;
  leverage: number;
  profitSplitPct: number;
  consistencyRulePct: number;
}

export function resolveChallengeRulesForAccount(
  account: Partial<
    Pick<
      TradingAccountRecord,
      | 'challengeId'
      | 'challengeType'
      | 'currentStep'
      | 'totalSteps'
      | 'dailyDrawdownPct'
      | 'maxDrawdownPct'
      | 'profitTargetPct'
      | 'minTradingDays'
      | 'leverage'
      | 'profitSplitPct'
      | 'status'
    >
  >
): ResolvedChallengeRules {
  const chType: ChallengeType = account.challengeType || 'two_step';
  const totalSteps =
    account.totalSteps !== undefined
      ? account.totalSteps
      : chType === 'instant'
      ? 0
      : chType === 'one_step'
      ? 1
      : chType === 'two_step'
      ? 2
      : 3;
  const currentStep = Math.max(1, account.currentStep || 1);

  const defaultDailyDd =
    chType === 'instant' ? 3 : chType === 'one_step' ? 4 : 5;
  const defaultMaxDd =
    chType === 'instant' || chType === 'one_step'
      ? 6
      : chType === 'two_step'
      ? 10
      : 12;

  let defaultTargetPct = 8;
  if (chType === 'instant') {
    defaultTargetPct = 0;
  } else if (chType === 'one_step') {
    defaultTargetPct = 10;
  } else if (chType === 'two_step') {
    defaultTargetPct = currentStep >= 2 ? 5 : 8;
  } else if (chType === 'three_step') {
    defaultTargetPct = 6;
  }

  const dailyDrawdownPct =
    account.dailyDrawdownPct && account.dailyDrawdownPct > 0
      ? account.dailyDrawdownPct
      : defaultDailyDd;
  const maxDrawdownPct =
    account.maxDrawdownPct && account.maxDrawdownPct > 0
      ? account.maxDrawdownPct
      : defaultMaxDd;

  // Instant Funding is direct-funded from Day 1 and has NO profit target (0%)
  const profitTargetPct =
    chType === 'instant'
      ? 0
      : chType === 'two_step' && currentStep === 2
      ? 5
      : account.profitTargetPct && account.profitTargetPct > 0
      ? account.profitTargetPct
      : defaultTargetPct;

  const minTradingDays =
    account.minTradingDays && account.minTradingDays > 0
      ? account.minTradingDays
      : chType === 'instant'
      ? 5
      : 3;

  const leverage =
    account.leverage && account.leverage > 0
      ? account.leverage
      : chType === 'instant'
      ? 30
      : chType === 'one_step'
      ? 50
      : 100;

  const profitSplitPct =
    account.profitSplitPct && account.profitSplitPct > 0
      ? account.profitSplitPct
      : chType === 'instant'
      ? 80
      : chType === 'one_step'
      ? 85
      : 90;

  // 15% Consistency Rule applies to payout eligibility
  const consistencyRulePct = chType === 'instant' ? 15 : 0;

  return {
    challengeType: chType,
    currentStep,
    totalSteps,
    dailyDrawdownPct,
    maxDrawdownPct,
    profitTargetPct,
    minTradingDays,
    leverage,
    profitSplitPct,
    consistencyRulePct,
  };
}

export interface AccountRiskMetrics {
  equity: number;
  floatingPnl: number;
  realizedPnl: number;
  totalNetPnl: number;
  usedMargin: number;
  freeMargin: number;
  marginLevelPct: number;
  dailyDrawdownPct: number;
  maxDrawdownPct: number;
  profitTargetPct: number;
  consistencyRulePct: number;
  dailyLossLimitUsd: number;
  maxLossLimitUsd: number;
  profitTargetUsd: number;
  dailyDropUsd: number;
  overallDropUsd: number;
  dailyRemainingUsd: number;
  maxRemainingUsd: number;
  dailyBreachLevelUsd: number;
  maxBreachFloorUsd: number;
  profitTargetLevelUsd: number;
  netGainUsd: number;
  currentDrawdownUsd: number;
  currentDrawdownPct: number;
  dailyDrawdownUsedPct: number;
  maxDrawdownUsedPct: number;
  profitProgressPct: number;
  peakEquity: number;
  dailyStartingEquity: number;
  nextStatus: AccountStatus;
  breachReason?: string;
  stepCompleted?: boolean;
}

export interface AccountPayoutEligibility {
  accountId: string;
  accountNumber: string;
  challengeTitle: string;
  challengeType: ChallengeType;
  status: AccountStatus;
  currentStep: number;
  totalSteps: number;
  startingBalance: number;
  balance: number;
  equity: number;
  realizedProfitUsd: number;
  floatingPnlUsd: number;
  netProfitUsd: number;
  profitSplitPct: number;
  maxWithdrawableUsd: number;
  consistencyRulePct: number;
  maxSingleTradeProfitUsd: number;
  highestTradeSharePct: number;
  requiredConsistentProfitUsd: number;
  isConsistencyViolated: boolean;
  isBreached: boolean;
  isStepCompleted: boolean;
  hasPositiveProfit: boolean;
  eligible: boolean;
  reason: string;
}

export function evaluateAccountRiskMetrics(
  account: TradingAccountRecord,
  openOrders: TradeOrderRecord[]
): AccountRiskMetrics {
  const rules = resolveChallengeRulesForAccount(account);

  // Explicitly exclude any order marked as 'CLOSED' / 'closed' so closed positions never contribute to live floating PnL
  const strictlyOpenOrders = openOrders.filter(
    (o) =>
      o.status === 'OPEN' &&
      String(o.status).toLowerCase() !== 'closed' &&
      !o.closeTime
  );

  const floatingPnl =
    Math.round(strictlyOpenOrders.reduce((sum, o) => sum + o.netPnl, 0) * 100) / 100;
  const usedMargin =
    Math.round(
      strictlyOpenOrders.reduce(
        (sum, o) =>
          sum + calculateRequiredMargin(o.symbol, o.volume, o.entryPrice, rules.leverage),
        0
      ) * 100
    ) / 100;

  const equity = Math.round((account.balance + floatingPnl) * 100) / 100;
  const realizedPnl = Math.round((account.balance - account.startingBalance) * 100) / 100;
  const totalNetPnl = Math.round((equity - account.startingBalance) * 100) / 100;
  const freeMargin = Math.round((equity - usedMargin) * 100) / 100;
  const marginLevelPct =
    usedMargin > 0 ? Math.round((equity / usedMargin) * 10000) / 100 : 0;

  const dailyLossLimitUsd =
    Math.round(account.startingBalance * (rules.dailyDrawdownPct / 100) * 100) / 100;
  const maxLossLimitUsd =
    Math.round(account.startingBalance * (rules.maxDrawdownPct / 100) * 100) / 100;
  const profitTargetUsd =
    Math.round(account.startingBalance * (rules.profitTargetPct / 100) * 100) / 100;

  const currentPeak = Math.max(account.peakEquity || account.startingBalance, equity);
  const currentDailyStart = account.dailyStartingEquity || account.startingBalance;

  // Directly attach Max Drawdown to Evaluation P&L relative to Starting Balance:
  // When evaluation P&L is in profit (equity >= startingBalance), Max Drawdown used is $0.00 (0%).
  // When evaluation P&L is negative (equity < startingBalance), Max Drawdown used equals exact loss (startingBalance - equity).
  const overallDropUsd =
    equity < account.startingBalance
      ? Math.max(0, Math.round((account.startingBalance - equity) * 100) / 100)
      : 0;

  // Daily Drawdown checks both loss below startingBalance AND intraday loss from dailyStartingEquity when account is in drawdown
  const intradayDropFromDailyStart =
    currentDailyStart > equity
      ? Math.max(0, Math.round((currentDailyStart - equity) * 100) / 100)
      : 0;
  const dailyDropUsd =
    equity < account.startingBalance
      ? Math.max(overallDropUsd, intradayDropFromDailyStart)
      : 0;

  const currentDrawdownUsd = overallDropUsd;
  const currentDrawdownPct =
    Math.round((currentDrawdownUsd / Math.max(1, account.startingBalance)) * 10000) / 100;

  const dailyRemainingUsd = Math.max(
    0,
    Math.round((dailyLossLimitUsd - dailyDropUsd) * 100) / 100
  );
  const maxRemainingUsd = Math.max(
    0,
    Math.round((maxLossLimitUsd - overallDropUsd) * 100) / 100
  );

  const phaseStartBalance =
    account.phaseStartingBalance && account.phaseStartingBalance >= account.startingBalance
      ? account.phaseStartingBalance
      : account.startingBalance;

  const dailyBreachLevelUsd =
    Math.round((Math.max(account.startingBalance, currentDailyStart) - dailyLossLimitUsd) * 100) / 100;
  const maxBreachFloorUsd =
    Math.round((account.startingBalance - maxLossLimitUsd) * 100) / 100;
  const profitTargetLevelUsd =
    Math.round((phaseStartBalance + profitTargetUsd) * 100) / 100;

  const dailyDrawdownUsedPct = Math.min(
    100,
    Math.round((dailyDropUsd / Math.max(1, dailyLossLimitUsd)) * 10000) / 100
  );
  const maxDrawdownUsedPct = Math.min(
    100,
    Math.round((overallDropUsd / Math.max(1, maxLossLimitUsd)) * 10000) / 100
  );

  const netGainUsd = Math.max(0, Math.round((equity - phaseStartBalance) * 100) / 100);
  const profitProgressPct =
    profitTargetUsd > 0
      ? Math.min(100, Math.round((netGainUsd / profitTargetUsd) * 10000) / 100)
      : 100;

  let nextStatus: AccountStatus = account.status;
  let breachReason: string | undefined = account.breachReason;
  let stepCompleted = false;

  const isInstant = rules.challengeType === 'instant';

  if (account.status === 'active' || account.status === 'passed' || account.status === 'completed') {
    // Strictly enforce Max Drawdown and Daily Drawdown rules on live floating equity & balance
    if (overallDropUsd >= maxLossLimitUsd || equity <= maxBreachFloorUsd) {
      nextStatus = 'failed';
      breachReason = `Maximum Drawdown Limit Breached (${rules.maxDrawdownPct}% | Loss: -$${overallDropUsd.toFixed(2)} | Max Limit: -$${maxLossLimitUsd.toFixed(2)})`;
    } else if (dailyDropUsd >= dailyLossLimitUsd || equity <= dailyBreachLevelUsd) {
      nextStatus = 'failed';
      breachReason = `Daily Drawdown Limit Breached (${rules.dailyDrawdownPct}% | Daily Loss: -$${dailyDropUsd.toFixed(2)} | Daily Limit: -$${dailyLossLimitUsd.toFixed(2)})`;
    } else if (
      account.status === 'active' &&
      !isInstant &&
      profitTargetUsd > 0 &&
      netGainUsd >= profitTargetUsd
    ) {
      stepCompleted = true;
      nextStatus = 'passed';
    }
  }

  return {
    equity,
    floatingPnl,
    realizedPnl,
    totalNetPnl,
    usedMargin,
    freeMargin,
    marginLevelPct,
    dailyDrawdownPct: rules.dailyDrawdownPct,
    maxDrawdownPct: rules.maxDrawdownPct,
    profitTargetPct: rules.profitTargetPct,
    consistencyRulePct: rules.consistencyRulePct,
    dailyLossLimitUsd,
    maxLossLimitUsd,
    profitTargetUsd,
    dailyDropUsd,
    overallDropUsd,
    dailyRemainingUsd,
    maxRemainingUsd,
    dailyBreachLevelUsd,
    maxBreachFloorUsd,
    profitTargetLevelUsd,
    netGainUsd,
    currentDrawdownUsd,
    currentDrawdownPct,
    dailyDrawdownUsedPct,
    maxDrawdownUsedPct,
    profitProgressPct,
    peakEquity: currentPeak,
    dailyStartingEquity: currentDailyStart,
    nextStatus,
    breachReason,
    stepCompleted,
  };
}

export function evaluateAccountPayoutEligibility(
  account: TradingAccountRecord,
  openOrders: TradeOrderRecord[] = [],
  closedOrders: TradeOrderRecord[] = []
): AccountPayoutEligibility {
  const metrics = evaluateAccountRiskMetrics(account, openOrders);
  const totalSteps =
    account.totalSteps ??
    (account.challengeType === 'instant'
      ? 0
      : account.challengeType === 'one_step'
      ? 1
      : account.challengeType === 'two_step'
      ? 2
      : 3);
  const currentStep =
    account.currentStep ??
    (account.status === 'passed' || account.status === 'completed' ? totalSteps : 1);

  const realizedProfitUsd = Math.round((account.balance - account.startingBalance) * 100) / 100;
  const effectiveEquityProfitUsd = Math.round((metrics.equity - account.startingBalance) * 100) / 100;
  const netProfitUsd = Math.max(0, Math.min(realizedProfitUsd, effectiveEquityProfitUsd));
  const profitSplitPct =
    account.profitSplitPct ??
    (account.challengeType === 'instant'
      ? 80
      : account.challengeType === 'one_step'
      ? 85
      : 90);

  const isBreached =
    account.status === 'failed' ||
    account.status === 'suspended' ||
    metrics.nextStatus === 'failed';

  const isInstant = account.challengeType === 'instant';
  const isEvaluationPassed =
    (account.status === 'passed' || account.status === 'completed') &&
    (totalSteps <= 1 || currentStep >= totalSteps);

  // 15% Consistency Rule in Payout Section
  const consistencyRulePct = isInstant ? 15 : 0;
  const winningClosedForAcc = closedOrders.filter(
    (o) => o.accountId === account.id && o.status === 'CLOSED' && o.netPnl > 0
  );
  const maxSingleTradeProfitUsd =
    winningClosedForAcc.length > 0
      ? Math.round(Math.max(...winningClosedForAcc.map((o) => o.netPnl)) * 100) / 100
      : 0;
  const requiredConsistentProfitUsd =
    maxSingleTradeProfitUsd > 0
      ? Math.round((maxSingleTradeProfitUsd / 0.15) * 100) / 100
      : 0;
  const highestTradeSharePct =
    netProfitUsd > 0 && maxSingleTradeProfitUsd > 0
      ? Math.round((maxSingleTradeProfitUsd / netProfitUsd) * 10000) / 100
      : 0;
  const isConsistencyViolated =
    isInstant &&
    winningClosedForAcc.length > 0 &&
    netProfitUsd > 0 &&
    highestTradeSharePct > consistencyRulePct;

  const isStepCompleted = isInstant || isEvaluationPassed;
  const hasPositiveProfit = netProfitUsd > 0;
  const eligible =
    !isBreached && isStepCompleted && hasPositiveProfit && !isConsistencyViolated;
  const maxWithdrawableUsd = eligible
    ? Math.round(netProfitUsd * (profitSplitPct / 100) * 100) / 100
    : 0;

  let reason = 'Account is eligible for instant profit payout withdrawal.';
  if (isBreached) {
    reason =
      metrics.breachReason ||
      account.breachReason ||
      'Account is breached due to Daily/Maximum Drawdown violation. Terminal password has been removed and payouts are permanently disabled.';
  } else if (!isStepCompleted) {
    if (account.challengeType === 'two_step') {
      const step1TargetUsd = Math.round(account.startingBalance * 0.08 * 100) / 100;
      const step2TargetUsd = Math.round(account.startingBalance * 0.05 * 100) / 100;
      if (currentStep <= 1) {
        reason = `2-Step Challenge Locked (Step 1 of 2 in progress): Pass Step 1 (+8% / +$${step1TargetUsd.toLocaleString()}) and Step 2 (+5% / +$${step2TargetUsd.toLocaleString()}) to become Funded and unlock Payouts.`;
      } else {
        reason = `2-Step Challenge Locked (Step 2 of 2 in progress — Step 1 Passed ✓): Reach the Step 2 profit target (+5% / +$${step2TargetUsd.toLocaleString()}) to pass evaluation and unlock Funded Payouts.`;
      }
    } else if (account.challengeType === 'three_step') {
      reason = `3-Step Challenge Locked (Step ${currentStep} of 3 in progress): Pass all 3 evaluation steps (+6% each) to become Funded and unlock Payouts.`;
    } else {
      reason = `1-Step Challenge Locked (Evaluation in progress): Reach the +${account.profitTargetPct}% profit target ($${metrics.profitTargetUsd.toLocaleString()}) to pass and unlock Payouts.`;
    }
  } else if (!hasPositiveProfit) {
    reason = `No positive P&L available to withdraw (Current Realized P&L: ${realizedProfitUsd >= 0 ? '+' : ''}$${realizedProfitUsd.toFixed(2)}). Generate trading profit above $${account.startingBalance.toLocaleString()} starting capital to request a payout.`;
  } else if (isConsistencyViolated) {
    reason = `15% Consistency Rule: Highest single trade profit (+$${maxSingleTradeProfitUsd.toFixed(2)}) is ${highestTradeSharePct.toFixed(1)}% of total profit (+$${netProfitUsd.toFixed(2)}), exceeding the 15% consistency limit. Required total profit to unlock payout: +$${requiredConsistentProfitUsd.toFixed(2)}.`;
  }

  return {
    accountId: account.id,
    accountNumber: account.accountNumber,
    challengeTitle: account.challengeTitle,
    challengeType: account.challengeType,
    status: metrics.nextStatus === 'failed' ? 'failed' : account.status,
    currentStep,
    totalSteps,
    startingBalance: account.startingBalance,
    balance: account.balance,
    equity: metrics.equity,
    realizedProfitUsd,
    floatingPnlUsd: metrics.floatingPnl,
    netProfitUsd,
    profitSplitPct,
    maxWithdrawableUsd,
    consistencyRulePct,
    maxSingleTradeProfitUsd,
    highestTradeSharePct,
    requiredConsistentProfitUsd,
    isConsistencyViolated,
    isBreached,
    isStepCompleted,
    hasPositiveProfit,
    eligible,
    reason,
  };
}

export function exportOrdersToCsv(orders: TradeOrderRecord[]): string {
  const headers = [
    'Ticket ID',
    'Symbol',
    'Side',
    'Type',
    'Volume',
    'Entry Price',
    'Exit Price',
    'Stop Loss',
    'Take Profit',
    'Gross PnL ($)',
    'Commission ($)',
    'Net PnL ($)',
    'Status',
    'Open Time',
    'Close Time',
  ];
  const rows = orders.map((o) => [
    o.ticketId,
    o.symbol,
    o.side,
    o.orderType,
    o.volume.toFixed(2),
    o.entryPrice.toString(),
    o.exitPrice.toString(),
    o.stopLoss.toString(),
    o.takeProfit.toString(),
    o.grossPnl.toFixed(2),
    o.commission.toFixed(2),
    o.netPnl.toFixed(2),
    o.status,
    o.openTime,
    o.closeTime || '-',
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export interface PayoutRecordItem {
  id: string;
  traderName: string;
  username: string;
  amountUsd: number;
  currency: string;
  status: 'Verified' | 'Pending' | 'Rejected';
  paymentDate: string;
  accountSize: number;
  programType: string;
  accountId?: string;
  accountNumber?: string;
  destination?: string;
}

export function filterVerifiedPayouts(payouts: PayoutRecordItem[]): PayoutRecordItem[] {
  return payouts.filter((p) => p.status === 'Verified' && p.amountUsd > 0);
}

export function computeLivePlatformStatistics(input: {
  registeredUsersCount: number;
  accounts: Pick<TradingAccountRecord, 'status' | 'userId'>[];
  payouts: PayoutRecordItem[];
  baselineTraders?: number;
  baselineFundedAccounts?: number;
  baselineActiveTraders?: number;
}): {
  totalRegisteredTraders: number;
  totalPayoutsUsd: number;
  totalFundedAccounts: number;
  activeTraders: number;
} {
  const verifiedPayouts = filterVerifiedPayouts(input.payouts);
  const verifiedPayoutSum = verifiedPayouts.reduce((sum, p) => sum + p.amountUsd, 0);
  const fundedOrPassedCount = input.accounts.filter(
    (a) => a.status === 'passed' || a.status === 'active' || a.status === 'completed'
  ).length;
  const activeAccountsCount = input.accounts.filter((a) => a.status === 'active').length;

  return {
    totalRegisteredTraders: (input.baselineTraders ?? 18420) + input.registeredUsersCount,
    totalPayoutsUsd: Math.round(verifiedPayoutSum * 100) / 100,
    totalFundedAccounts: (input.baselineFundedAccounts ?? 4280) + fundedOrPassedCount,
    activeTraders: (input.baselineActiveTraders ?? 3190) + activeAccountsCount,
  };
}

