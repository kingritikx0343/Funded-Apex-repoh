import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRequiredMargin,
  calculatePositionPnl,
  validateOrderRequest,
  evaluateOrderTrigger,
  evaluateAccountRiskMetrics,
  type TradingAccountRecord,
  type MarketQuote,
  type TradeOrderRecord,
} from './tradingEngine';

const sampleAccount: TradingAccountRecord = {
  id: 'acc-1',
  accountNumber: 'FA-500001',
  userId: 'user-1',
  challengeId: 'ch-50k-2step',
  challengeTitle: '$50,000 Two-Step Evaluation',
  challengeType: 'two_step',
  accountSize: 50000,
  startingBalance: 50000,
  balance: 50000,
  equity: 50000,
  usedMargin: 0,
  freeMargin: 50000,
  profitTargetPct: 8,
  dailyDrawdownPct: 5,
  maxDrawdownPct: 10,
  minTradingDays: 3,
  tradingDaysCount: 3,
  leverage: 100,
  status: 'active',
  createdAt: '2026-10-30T00:00:00Z',
  updatedAt: '2026-10-30T00:00:00Z',
};

const xauQuote: MarketQuote = {
  symbol: 'XAUUSD',
  bid: 2748.50,
  ask: 2748.74,
  last: 2748.62,
  change24hPct: 0.65,
  high24h: 2758.00,
  low24h: 2732.10,
  timestamp: Date.now(),
};

test('calculateRequiredMargin computes accurate margin with leverage', () => {
  // 1 lot XAUUSD = 100 oz * 2748.50 = 274,850 notional / 100 leverage = $2,748.50
  const margin = calculateRequiredMargin('XAUUSD', 1, 2748.50, 100);
  assert.equal(margin, 2748.5);
});

test('calculatePositionPnl computes accurate gross, commission, and net P&L for BUY and SELL', () => {
  const buyPnl = calculatePositionPnl('XAUUSD', 'BUY', 1.0, 2740.0, 2750.0);
  // +10.00 * 100 oz * 1 lot = $1,000 gross - $5.00 commission = $995.00 net
  assert.equal(buyPnl.grossPnl, 1000);
  assert.equal(buyPnl.commission, 5);
  assert.equal(buyPnl.netPnl, 995);

  const sellPnl = calculatePositionPnl('XAUUSD', 'SELL', 2.0, 2750.0, 2745.0);
  // +5.00 * 100 oz * 2 lots = $1,000 gross - $10.00 commission = $990.00 net
  assert.equal(sellPnl.grossPnl, 1000);
  assert.equal(sellPnl.commission, 10);
  assert.equal(sellPnl.netPnl, 990);
});

test('validateOrderRequest validates SL/TP direction and margin limits', () => {
  // Valid market BUY
  const validRes = validateOrderRequest(
    {
      accountId: 'acc-1',
      symbol: 'XAUUSD',
      side: 'BUY',
      orderType: 'MARKET',
      volume: 1.0,
      stopLoss: 2735.0,
      takeProfit: 2770.0,
    },
    sampleAccount,
    xauQuote
  );
  assert.equal(validRes.valid, true);
  assert.equal(validRes.executionPrice, 2748.74);

  // Invalid BUY Stop Loss above entry
  const invalidSl = validateOrderRequest(
    {
      accountId: 'acc-1',
      symbol: 'XAUUSD',
      side: 'BUY',
      orderType: 'MARKET',
      volume: 1.0,
      stopLoss: 2760.0,
    },
    sampleAccount,
    xauQuote
  );
  assert.equal(invalidSl.valid, false);

  // Invalid Pending BUY_LIMIT above current Ask
  const invalidLimit = validateOrderRequest(
    {
      accountId: 'acc-1',
      symbol: 'XAUUSD',
      side: 'BUY',
      orderType: 'BUY_LIMIT',
      volume: 1.0,
      entryPrice: 2755.0,
    },
    sampleAccount,
    xauQuote
  );
  assert.equal(invalidLimit.valid, false);
});

test('evaluateOrderTrigger triggers pending orders and SL/TP accurately', () => {
  const pendingBuyLimit: TradeOrderRecord = {
    id: 'ord-1',
    ticketId: 'TKT-1001',
    accountId: 'acc-1',
    userId: 'user-1',
    symbol: 'XAUUSD',
    side: 'BUY',
    orderType: 'BUY_LIMIT',
    volume: 1,
    entryPrice: 2749.0,
    currentPrice: 2748.74,
    exitPrice: 0,
    stopLoss: 2735.0,
    takeProfit: 2765.0,
    grossPnl: 0,
    commission: 5,
    netPnl: 0,
    status: 'PENDING',
    openTime: '2026-10-30T00:00:00Z',
    closeTime: '',
  };

  const triggerPending = evaluateOrderTrigger(pendingBuyLimit, xauQuote);
  assert.equal(triggerPending.action, 'ACTIVATE_PENDING');

  const openBuyOrder: TradeOrderRecord = {
    ...pendingBuyLimit,
    status: 'OPEN',
    entryPrice: 2740.0,
    takeProfit: 2748.0,
  };
  const triggerTp = evaluateOrderTrigger(openBuyOrder, xauQuote);
  assert.equal(triggerTp.action, 'CLOSE_TP');
});

test('evaluateAccountRiskMetrics detects Passed and Failed evaluation thresholds', () => {
  const winningOrder: TradeOrderRecord = {
    id: 'ord-win',
    ticketId: 'TKT-1002',
    accountId: 'acc-1',
    userId: 'user-1',
    symbol: 'XAUUSD',
    side: 'BUY',
    orderType: 'MARKET',
    volume: 2,
    entryPrice: 2725.0,
    currentPrice: 2748.5,
    exitPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    grossPnl: 4700,
    commission: 10,
    netPnl: 4690, // Exceeds 8% of $50k ($4,000)
    status: 'OPEN',
    openTime: '2026-10-30T00:00:00Z',
    closeTime: '',
  };

  const passMetrics = evaluateAccountRiskMetrics(sampleAccount, [winningOrder]);
  assert.equal(passMetrics.nextStatus, 'passed');
  assert.equal(passMetrics.profitProgressPct, 100);

  const losingOrder: TradeOrderRecord = {
    ...winningOrder,
    netPnl: -2600, // Exceeds 5% Daily Drawdown ($2,500)
  };
  const failMetrics = evaluateAccountRiskMetrics(sampleAccount, [losingOrder]);
  assert.equal(failMetrics.nextStatus, 'failed');
});

test('filterVerifiedPayouts and computeLivePlatformStatistics only count verified payouts and aggregate dynamic counts', async () => {
  const { filterVerifiedPayouts, computeLivePlatformStatistics } = await import('./tradingEngine');
  const payouts = [
    {
      id: 'po-1',
      traderName: 'Marcus Vance',
      username: '@marcus_fx',
      amountUsd: 12450.0,
      currency: 'USD (USDC)',
      status: 'Verified' as const,
      paymentDate: '2026-10-29',
      accountSize: 100000,
      programType: 'Two Step Challenge',
    },
    {
      id: 'po-2',
      traderName: 'Pending Trader',
      username: '@pending_tr',
      amountUsd: 9000.0,
      currency: 'USD (Wire)',
      status: 'Pending' as const,
      paymentDate: '2026-10-30',
      accountSize: 50000,
      programType: 'One Step Challenge',
    },
  ];

  const verified = filterVerifiedPayouts(payouts);
  assert.equal(verified.length, 1);
  assert.equal(verified[0].id, 'po-1');

  const stats = computeLivePlatformStatistics({
    registeredUsersCount: 5,
    accounts: [
      { status: 'active', userId: 'u1' },
      { status: 'passed', userId: 'u2' },
      { status: 'failed', userId: 'u3' },
    ],
    payouts,
    baselineTraders: 100,
    baselineFundedAccounts: 20,
    baselineActiveTraders: 10,
  });

  assert.equal(stats.totalRegisteredTraders, 105);
  assert.equal(stats.totalPayoutsUsd, 12450);
  assert.equal(stats.totalFundedAccounts, 22);
  assert.equal(stats.activeTraders, 11);
});

test('parseBinance24hrTicker and parseForexRatesToQuotes normalize real market API responses accurately', async () => {
  const { parseBinance24hrTicker, parseForexRatesToQuotes } = await import('./liveMarketFeed');

  const btcTick = parseBinance24hrTicker({
    symbol: 'BTCUSDT',
    bidPrice: '89420.50',
    askPrice: '89421.80',
    lastPrice: '89421.10',
    priceChangePercent: '3.42',
    highPrice: '90120.00',
    lowPrice: '86500.00',
  });
  assert.ok(btcTick);
  assert.equal(btcTick.symbol, 'BTCUSD');
  assert.equal(btcTick.bid, 89420.5);
  assert.equal(btcTick.change24hPct, 3.42);

  const xauTick = parseBinance24hrTicker({
    symbol: 'PAXGUSDT',
    bidPrice: '2864.20',
    askPrice: '2864.80',
    lastPrice: '2864.50',
    priceChangePercent: '1.15',
    highPrice: '2879.00',
    lowPrice: '2831.00',
  });
  assert.ok(xauTick);
  assert.equal(xauTick.symbol, 'XAUUSD');
  assert.equal(xauTick.bid, 2864.2);

  const fxQuotes = parseForexRatesToQuotes(
    { EUR: 0.9225, GBP: 0.7712, JPY: 153.42 },
    {} as Record<any, MarketQuote>
  );
  assert.ok(fxQuotes.EURUSD);
  assert.ok(fxQuotes.GBPUSD);
  assert.ok(fxQuotes.USDJPY);
  assert.equal(fxQuotes.USDJPY?.bid, 153.42);
});

test('computeStripeCheckoutBreakdown and verifyUserCredentials enforce strict auth and owned-only coupons', async () => {
  const {
    computeStripeCheckoutBreakdown,
    validateStripeCardInput,
    hashPasswordVerifier,
    verifyUserCredentials,
  } = await import('./stripeCheckout');
  const { INITIAL_CHALLENGES } = await import('../data/platformData');

  // 1. Strict Password & Account Verification
  const registeredProfile = {
    email: 'trader@fundedapex.com',
    passwordHash: hashPasswordVerifier('trader@fundedapex.com', 'CorrectPass2026!'),
  };

  // Unregistered email must be rejected
  const missingUser = verifyUserCredentials(null, 'unknown@fundedapex.com', 'AnyPassword123');
  assert.equal(missingUser.ok, false);
  assert.equal(missingUser.reason, 'USER_NOT_FOUND');

  // Wrong password must be rejected
  const wrongPass = verifyUserCredentials(
    registeredProfile,
    'trader@fundedapex.com',
    'WrongPassword999'
  );
  assert.equal(wrongPass.ok, false);
  assert.equal(wrongPass.reason, 'WRONG_PASSWORD');

  // Exact matching password succeeds
  const rightPass = verifyUserCredentials(
    registeredProfile,
    'trader@fundedapex.com',
    'CorrectPass2026!'
  );
  assert.equal(rightPass.ok, true);

  // 2. Stripe Checkout & Owned-Only Coupons
  const ch5k = INITIAL_CHALLENGES.find((c) => c.id === 'two-step-5000')!;
  assert.equal(ch5k.priceUsd, 17);

  // Full price without coupon
  const full = computeStripeCheckoutBreakdown(ch5k, '', []);
  assert.equal(full.finalAmountUsd, 17);
  assert.equal(full.discountPct, 0);
  assert.equal(full.validCode, true);

  // Guessed prefix codes NOT in userCoupons must be strictly rejected
  const ch100k = INITIAL_CHALLENGES.find((c) => c.id === 'two-step-100000')!;
  const guessed90 = computeStripeCheckoutBreakdown(ch100k, 'APEX90-ABCD', []);
  assert.equal(guessed90.validCode, false);

  const guessedFree = computeStripeCheckoutBreakdown(ch100k, 'FREE5K2S-9988', []);
  assert.equal(guessedFree.validCode, false);

  // Owned coupon won by the user in userCoupons is accepted
  const ownedCoupons = [
    {
      id: 'cpn-1',
      userId: 'u-1',
      code: 'APEX90-WON1',
      label: '90% OFF Coupon',
      description: '90% discount',
      rewardType: 'coupon' as const,
      discountPct: 90,
      redeemed: false,
      createdAt: new Date().toISOString(),
    },
  ];
  const validOwned = computeStripeCheckoutBreakdown(ch100k, 'APEX90-WON1', ownedCoupons);
  assert.equal(validOwned.validCode, true);
  assert.equal(validOwned.discountPct, 90);
  assert.equal(validOwned.finalAmountUsd, 27.9);

  // Admin-created coupon code is accepted when active
  const adminCoupons = [
    {
      id: 'adm-cpn-1',
      code: 'APEX30',
      discountPct: 30,
      description: '30% Off Evaluation',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];
  const validAdminCoupon = computeStripeCheckoutBreakdown(ch100k, 'apex30', [], adminCoupons);
  assert.equal(validAdminCoupon.validCode, true);
  assert.equal(validAdminCoupon.discountPct, 30);

  // Stripe card validation
  const validCard = validateStripeCardInput({
    cardNumber: '4242 4242 4242 4242',
    expiry: '12/28',
    cvc: '424',
    cardholderName: 'Alex Mercer',
    billingEmail: 'alex@fundedapex.com',
  });
  assert.equal(validCard.valid, true);
  assert.equal(validCard.last4, '4242');
});

test('buildTradePerformanceAnalytics computes cumulative equity curve, per-trade P&L, and KPI metrics for Recharts', async () => {
  const { buildTradePerformanceAnalytics } = await import('./performanceAnalytics');

  const mockAccount = {
    startingBalance: 10000,
    balance: 10350,
    profitTargetPct: 8,
    maxDrawdownPct: 10,
  };

  const mockOrders = [
    {
      id: 'o1',
      ticketId: 'TKT-1001',
      accountId: 'acc-1',
      userId: 'u-1',
      symbol: 'XAUUSD' as const,
      side: 'BUY' as const,
      orderType: 'MARKET' as const,
      volume: 1.0,
      entryPrice: 2850,
      currentPrice: 2855,
      exitPrice: 2855,
      stopLoss: 2840,
      takeProfit: 2870,
      grossPnl: 500,
      commission: 5,
      netPnl: 495,
      status: 'CLOSED' as const,
      openTime: '2026-10-30T10:00:00.000Z',
      closeTime: '2026-10-30T11:00:00.000Z',
    },
    {
      id: 'o2',
      ticketId: 'TKT-1002',
      accountId: 'acc-1',
      userId: 'u-1',
      symbol: 'EURUSD' as const,
      side: 'SELL' as const,
      orderType: 'MARKET' as const,
      volume: 1.0,
      entryPrice: 1.085,
      currentPrice: 1.0865,
      exitPrice: 1.0865,
      stopLoss: 1.09,
      takeProfit: 1.08,
      grossPnl: -140,
      commission: 5,
      netPnl: -145,
      status: 'CLOSED' as const,
      openTime: '2026-10-30T12:00:00.000Z',
      closeTime: '2026-10-30T13:00:00.000Z',
    },
  ];

  const analytics = buildTradePerformanceAnalytics(mockAccount, mockOrders);
  assert.equal(analytics.series.length, 3); // Initial + 2 trades
  assert.equal(analytics.series[0].equity, 10000);
  assert.equal(analytics.series[1].equity, 10495);
  assert.equal(analytics.series[2].equity, 10350);
  assert.equal(analytics.summary.totalTrades, 2);
  assert.equal(analytics.summary.winningTrades, 1);
  assert.equal(analytics.summary.losingTrades, 1);
  assert.equal(analytics.summary.winRatePct, 50);
  assert.equal(analytics.summary.cumulativeNetPnlUsd, 350);
  assert.equal(analytics.bySymbol.length, 2);
});

test('evaluateAccountPayoutEligibility enforces Instant vs 2-Step/3-Step completion, positive P&L, and drawdown breach blocks', async () => {
  const { evaluateAccountPayoutEligibility, evaluateAccountRiskMetrics } = await import('./tradingEngine');

  // 1. Instant Funded account with positive P&L -> immediately eligible for payout
  const instantProfitable: TradingAccountRecord = {
    ...sampleAccount,
    id: 'acc-instant-1',
    challengeType: 'instant',
    startingBalance: 50000,
    balance: 52000,
    equity: 52000,
    profitSplitPct: 90,
    status: 'active',
  };
  const instantElig = evaluateAccountPayoutEligibility(instantProfitable, []);
  assert.equal(instantElig.eligible, true);
  assert.equal(instantElig.netProfitUsd, 2000);
  assert.equal(instantElig.maxWithdrawableUsd, 1800); // 90% of $2,000

  // 2. Instant Funded account with 0 or negative P&L -> NOT eligible
  const instantNoProfit: TradingAccountRecord = {
    ...instantProfitable,
    balance: 49500,
    equity: 49500,
  };
  const instantNoProfitElig = evaluateAccountPayoutEligibility(instantNoProfit, []);
  assert.equal(instantNoProfitElig.eligible, false);

  // 3. 2-Step Evaluation account still in Step 1 ('active') -> NOT eligible even if in profit
  const twoStepActive: TradingAccountRecord = {
    ...sampleAccount,
    challengeType: 'two_step',
    currentStep: 1,
    totalSteps: 2,
    startingBalance: 50000,
    balance: 54500,
    equity: 54500,
    profitSplitPct: 90,
    status: 'active',
  };
  const twoStepActiveElig = evaluateAccountPayoutEligibility(twoStepActive, []);
  assert.equal(twoStepActiveElig.eligible, false);

  // 4. 2-Step Evaluation account after passing both steps ('passed') with positive P&L -> Eligible!
  const twoStepPassed: TradingAccountRecord = {
    ...twoStepActive,
    currentStep: 2,
    status: 'passed',
  };
  const twoStepPassedElig = evaluateAccountPayoutEligibility(twoStepPassed, []);
  assert.equal(twoStepPassedElig.eligible, true);
  assert.equal(twoStepPassedElig.maxWithdrawableUsd, 4050); // 90% of $4,500

  // 5. 3-Step Evaluation account ('three_step') active vs passed
  const threeStepActive: TradingAccountRecord = {
    ...sampleAccount,
    challengeType: 'three_step',
    currentStep: 2,
    totalSteps: 3,
    startingBalance: 100000,
    balance: 106000,
    equity: 106000,
    profitSplitPct: 95,
    status: 'active',
  };
  assert.equal(evaluateAccountPayoutEligibility(threeStepActive, []).eligible, false);

  const threeStepPassed: TradingAccountRecord = {
    ...threeStepActive,
    currentStep: 3,
    status: 'passed',
  };
  const threeStepPassedElig = evaluateAccountPayoutEligibility(threeStepPassed, []);
  assert.equal(threeStepPassedElig.eligible, true);
  assert.equal(threeStepPassedElig.maxWithdrawableUsd, 5700); // 95% of $6,000

  // 6. Passed account that subsequently hits Maximum or Daily Drawdown -> Auto-breaches to 'failed' and blocks payouts
  const breachedMetrics = evaluateAccountRiskMetrics(
    {
      ...twoStepPassed,
      balance: 44500, // -$5,500 loss on $50k (exceeds 10% max drawdown & 5% daily drawdown)
    },
    []
  );
  assert.equal(breachedMetrics.nextStatus, 'failed');
  assert.ok(breachedMetrics.breachReason?.includes('Drawdown Limit Breached'));
});

test('Firebase Cloud Functions buildTerminalCredentialsEmailPayload formats automated terminal credentials email from fundedapexsupport@gmail.com', async () => {
  const { buildTerminalCredentialsEmailPayload } = await import('./cloudFunctionsEmail');
  const mail = buildTerminalCredentialsEmailPayload({
    recipientEmail: 'trader@gmail.com',
    recipientName: 'Ritik Trader',
    accountId: 'acc-100201',
    accountNumber: 'FA-100201',
    challengeId: 'ch-100k-2step',
    challengeTitle: '$100,000 2-Step Evaluation',
    terminalUserId: 'FAU-100K2S-9988',
    terminalPassword: 'FAP-100K-774422',
    triggeredBy: 'admin_account_update',
  });

  assert.equal(mail.to, 'trader@gmail.com');
  assert.equal(mail.sender, 'FUNDED APEX <fundedapexsupport@gmail.com>');
  assert.equal(mail.domain, 'fundedapex.com');
  assert.ok(mail.htmlBody.includes('FAU-100K2S-9988'));
  assert.ok(mail.htmlBody.includes('FAP-100K-774422'));
  assert.ok(mail.htmlBody.includes('fundedapexsupport@gmail.com'));
});

test('resolveChallengeRulesForAccount and evaluateAccountRiskMetrics enforce accurate Daily DD, Max DD, and Profit Target per Challenge Type and Step', async () => {
  const { resolveChallengeRulesForAccount, evaluateAccountRiskMetrics } = await import(
    './tradingEngine'
  );

  // 1. Instant Funding: 3% Daily DD, 6% Max DD, 6% Profit Target, 1:30 Leverage
  const instantRules = resolveChallengeRulesForAccount({
    challengeId: 'instant-10000',
    challengeType: 'instant',
  });
  assert.equal(instantRules.dailyDrawdownPct, 3);
  assert.equal(instantRules.maxDrawdownPct, 6);
  assert.equal(instantRules.profitTargetPct, 6);
  assert.equal(instantRules.leverage, 30);

  // 2. 1-Step Evaluation: 4% Daily DD, 6% Max DD, 10% Profit Target, 1:50 Leverage
  const oneStepRules = resolveChallengeRulesForAccount({
    challengeId: 'one-step-25000',
    challengeType: 'one_step',
  });
  assert.equal(oneStepRules.dailyDrawdownPct, 4);
  assert.equal(oneStepRules.maxDrawdownPct, 6);
  assert.equal(oneStepRules.profitTargetPct, 10);
  assert.equal(oneStepRules.leverage, 50);

  // 3. 2-Step Evaluation Phase 1 (8% Target) vs Phase 2 (5% Target), 5% Daily DD, 10% Max DD, 1:100 Leverage
  const twoStepPhase1 = resolveChallengeRulesForAccount({
    challengeId: 'two-step-50000',
    challengeType: 'two_step',
    currentStep: 1,
  });
  assert.equal(twoStepPhase1.dailyDrawdownPct, 5);
  assert.equal(twoStepPhase1.maxDrawdownPct, 10);
  assert.equal(twoStepPhase1.profitTargetPct, 8);
  assert.equal(twoStepPhase1.leverage, 100);

  const twoStepPhase2 = resolveChallengeRulesForAccount({
    challengeId: 'two-step-50000',
    challengeType: 'two_step',
    currentStep: 2,
  });
  assert.equal(twoStepPhase2.profitTargetPct, 5);

  // 4. 3-Step Evaluation: 5% Daily DD, 12% Max DD, 6% Profit Target per step
  const threeStepRules = resolveChallengeRulesForAccount({
    challengeId: 'three-step-100000',
    challengeType: 'three_step',
    currentStep: 2,
  });
  assert.equal(threeStepRules.dailyDrawdownPct, 5);
  assert.equal(threeStepRules.maxDrawdownPct, 12);
  assert.equal(threeStepRules.profitTargetPct, 6);

  // 5. Legacy/Preview account with profitTargetPct: 0 is auto-corrected by evaluateAccountRiskMetrics
  const previewMetrics = evaluateAccountRiskMetrics(
    {
      ...sampleAccount,
      accountSize: 5000,
      startingBalance: 5000,
      balance: 5200,
      equity: 5200,
      profitTargetPct: 0,
      dailyDrawdownPct: 0,
      maxDrawdownPct: 0,
      challengeId: 'two-step-5000',
      challengeType: 'two_step',
      currentStep: 1,
    },
    []
  );
  assert.equal(previewMetrics.dailyDrawdownPct, 5);
  assert.equal(previewMetrics.maxDrawdownPct, 10);
  assert.equal(previewMetrics.profitTargetPct, 8);
  assert.equal(previewMetrics.dailyLossLimitUsd, 250);
  assert.equal(previewMetrics.maxLossLimitUsd, 500);
  assert.equal(previewMetrics.profitTargetUsd, 400);
  assert.equal(previewMetrics.profitProgressPct, 50); // +$200 of +$400 target = 50%
});

test('profitable accounts never breach and Instant accounts exclusively enforce 15% consistency hidden rule', async () => {
  const {
    resolveChallengeRulesForAccount,
    evaluateAccountRiskMetrics,
    evaluateAccountPayoutEligibility,
  } = await import('./tradingEngine');

  // 1. Account in net profit ($5,600 balance with -$350 floating PnL => $5,250 equity > $5,000 start) MUST NEVER breach
  const profitableAcc: TradingAccountRecord = {
    ...sampleAccount,
    accountSize: 5000,
    startingBalance: 5000,
    balance: 5600,
    equity: 5250,
    dailyDrawdownPct: 5,
    maxDrawdownPct: 10,
    status: 'active',
  };
  const openPullbackOrder: TradeOrderRecord = {
    id: 'ord-pb',
    ticketId: 'TKT-9001',
    accountId: profitableAcc.id,
    userId: profitableAcc.userId,
    symbol: 'XAUUSD',
    side: 'BUY',
    orderType: 'MARKET',
    volume: 1,
    entryPrice: 4045,
    currentPrice: 4041.5,
    exitPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    grossPnl: -345,
    commission: 5,
    netPnl: -350,
    status: 'OPEN',
    openTime: '2026-11-07T00:00:00Z',
    closeTime: '',
  };
  const profMetrics = evaluateAccountRiskMetrics(profitableAcc, [openPullbackOrder]);
  assert.equal(profMetrics.equity, 5250);
  assert.equal(profMetrics.overallDropUsd, 0);
  assert.equal(profMetrics.dailyDropUsd, 0);
  assert.notEqual(profMetrics.nextStatus, 'failed');

  // 2. 15% Consistency Hidden Rule is 15% ONLY on 'instant' and 0% on 'one_step', 'two_step', 'three_step'
  assert.equal(resolveChallengeRulesForAccount({ challengeType: 'instant' }).consistencyRulePct, 15);
  assert.equal(resolveChallengeRulesForAccount({ challengeType: 'one_step' }).consistencyRulePct, 0);
  assert.equal(resolveChallengeRulesForAccount({ challengeType: 'two_step' }).consistencyRulePct, 0);
  assert.equal(resolveChallengeRulesForAccount({ challengeType: 'three_step' }).consistencyRulePct, 0);

  // 3. Single oversized closed trade (>15% of total profit) blocks Instant payout, but NOT 2-Step passed payout
  const instantAcc: TradingAccountRecord = {
    ...sampleAccount,
    id: 'acc-inst-cons',
    challengeType: 'instant',
    startingBalance: 10000,
    balance: 10500,
    equity: 10500,
    status: 'active',
  };
  const bigClosedTrade: TradeOrderRecord = {
    ...openPullbackOrder,
    id: 'ord-big',
    accountId: 'acc-inst-cons',
    netPnl: 400, // 80% of $500 total profit (> 15% limit)
    status: 'CLOSED',
  };
  const instantEligViolated = evaluateAccountPayoutEligibility(instantAcc, [], [bigClosedTrade]);
  assert.equal(instantEligViolated.isConsistencyViolated, true);
  assert.equal(instantEligViolated.eligible, false);

  const twoStepPassedAcc: TradingAccountRecord = {
    ...instantAcc,
    id: 'acc-2s-cons',
    challengeType: 'two_step',
    status: 'passed',
  };
  const twoStepElig = evaluateAccountPayoutEligibility(
    twoStepPassedAcc,
    [],
    [{ ...bigClosedTrade, accountId: 'acc-2s-cons' }]
  );
  assert.equal(twoStepElig.isConsistencyViolated, false);
  assert.equal(twoStepElig.eligible, true);
});

test('buildSpotAnchoredCandles and alignCandlesToSpot preserve natural live and historical candlestick wicks', async () => {
  const { buildSpotAnchoredCandles, alignCandlesToSpot } = await import('./liveMarketFeed');

  for (const tf of ['1m', '5m', '15m', '1h', '1d']) {
    const candles = buildSpotAnchoredCandles('XAUUSD', tf, 4045.25);
    assert.ok(candles.length >= 80);

    // Every candle including the live forming candle (last candle) must have visible upper and lower wicks
    const liveCandle = candles[candles.length - 1];
    assert.equal(liveCandle.close, 4045.25);
    assert.ok(
      liveCandle.high > Math.max(liveCandle.open, liveCandle.close),
      `Expected live candle on ${tf} to have upper wick`
    );
    assert.ok(
      liveCandle.low < Math.min(liveCandle.open, liveCandle.close),
      `Expected live candle on ${tf} to have lower wick`
    );

    const aligned = alignCandlesToSpot(candles, 'XAUUSD', 4046.1);
    const alignedLive = aligned[aligned.length - 1];
    assert.equal(alignedLive.close, 4046.1);
    assert.ok(alignedLive.high > Math.max(alignedLive.open, alignedLive.close));
    assert.ok(alignedLive.low < Math.min(alignedLive.open, alignedLive.close));
  }
});



