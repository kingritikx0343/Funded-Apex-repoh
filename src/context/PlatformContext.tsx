import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updatePassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  popupResolver,
  hasWorkingAuthToken,
  deterministicUserDocId,
} from '../lib/firebase';
import {
  INSTRUMENTS,
  SymbolCode,
  MarketQuote,
  TradingAccountRecord,
  ChallengeType,
  TradeOrderRecord,
  OrderSubmissionInput,
  validateOrderRequest,
  calculatePositionPnl,
  calculateOrderPnlSnapshot,
  evaluateOrderTrigger,
  evaluateAccountRiskMetrics,
  evaluateAccountPayoutEligibility,
  AccountPayoutEligibility,
  roundPrice,
  AccountStatus,
  PayoutRecordItem,
  filterVerifiedPayouts,
  computeLivePlatformStatistics,
  resolveChallengeRulesForAccount,
  getMinimumPhaseStartBalance,
} from '../engine/tradingEngine';
import {
  buildTerminalCredentialsEmailPayload,
  buildRegistrationWelcomeEmailPayload,
  buildPasswordResetEmailPayload,
  buildChallengeStatusUpdateEmailPayload,
  buildPromotionalOfferEmailPayload,
  buildCustomManualEmailPayload,
  CustomManualEmailInput,
  FundedApexEmailPayload,
  TerminalCredentialMailPayload,
  EmailEventType,
  ChallengeStatusEmailType,
  FUNDED_APEX_SUPPORT_EMAIL,
} from '../engine/cloudFunctionsEmail';
import {
  ChallengeTemplate,
  INITIAL_CHALLENGES,
  SPIN_REWARDS,
  SpinRewardSegment,
  INITIAL_PAYOUTS,
  SAMPLE_LEADERBOARD,
  LeaderboardEntry,
  INITIAL_TESTIMONIALS,
  TestimonialRecord,
} from '../data/platformData';
import {
  fetchInitialLiveQuotes,
  subscribeLiveMarketStream,
  LiveFeedStatus,
  isDirectExchangeSymbol,
} from '../engine/liveMarketFeed';
import {
  computeStripeCheckoutBreakdown,
  hashPasswordVerifier,
  verifyUserCredentials,
} from '../engine/stripeCheckout';
import {
  mergeUserDirectories,
  mergeUserProfileRecords,
  isSeedPasswordRecord,
} from '../engine/userVault';

export type PageRoute =
  | 'home'
  | 'about'
  | 'challenges'
  | 'account-sizes'
  | 'trading-rules'
  | 'how-it-works'
  | 'terminal-preview'
  | 'free-spin'
  | 'referral'
  | 'leaderboard'
  | 'payouts'
  | 'faq'
  | 'login'
  | 'register'
  | 'privacy'
  | 'terms'
  | 'refund-policy'
  | 'risk-disclosure'
  | 'dashboard'
  | 'terminal'
  | 'admin'
  | 'admin';

export type UserRole = 'user' | 'admin' | 'super_admin';

export interface UserProfileData {
  uid: string;
  fullName: string;
  email: string;
  country: string;
  referralCode: string;
  referredBy?: string;
  role: UserRole;
  rewardPoints: number;
  lastSpinDate?: string;
  mfaEnabled: boolean;
  deletionRequested: boolean;
  avatarUrl?: string;
  passwordHash?: string;
  passwordUpdatedAt?: number;
  isSeedDefault?: boolean;
  createdAt: string;
  kycStatus?: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
  kycDocType?: string;
  kycSubmittedAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

export interface AdminAuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface WonSpinCoupon {
  id: string;
  userId: string;
  code: string;
  label: string;
  description: string;
  rewardType: 'coupon' | 'free_account';
  discountPct?: number;
  challengeId?: string;
  redeemed: boolean;
  createdAt: string;
}

export interface AdminCouponRecord {
  id: string;
  code: string;
  discountPct: number;
  description: string;
  active: boolean;
  createdAt: string;
}

export type PaymentMethodType = 'CRYPTO';

export interface AdminUploadedMediaItem {
  id: string;
  title: string;
  category: 'QR_CODE' | 'PROMO_BANNER' | 'CERTIFICATE_SEAL' | 'GENERAL';
  url: string;
  uploadedAt: string;
}

export interface PaymentGatewaySettings {
  cryptoUsdtTrc20: string;
  cryptoUsdtErc20: string;
  cryptoUsdtBep20: string;
  cryptoBnbBep20?: string;
  cryptoBtcAddress: string;
  cryptoEthAddress: string;
  cryptoSolAddress: string;
  cryptoArbitrumAddress?: string;
  cryptoAptosAddress?: string;
  cryptoUsdtTrc20Qr: string;
  cryptoUsdtErc20Qr: string;
  cryptoUsdtBep20Qr: string;
  cryptoBnbBep20Qr?: string;
  cryptoBtcQr: string;
  cryptoEthQr: string;
  cryptoSolQr: string;
  cryptoArbitrumQr?: string;
  cryptoAptosQr?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIbanSwift?: string;
  bankName?: string;
  upiId?: string;
  upiQr?: string;
  certificateSealImg?: string;
  promoBannerImg?: string;
  accountCertificates?: Record<string, string>;
  challengeCertificates?: Partial<Record<ChallengeType, string>>;
  adminGalleryImages?: AdminUploadedMediaItem[];
  cryptoNetworkNote: string;
  terminalUserId?: string;
  terminalPassword: string;
}

export interface AccountPurchaseRequest {
  id: string;
  orderNumber: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  challengeId: string;
  challengeTitle: string;
  accountSize: number;
  originalPriceUsd: number;
  discountPct: number;
  finalAmountUsd: number;
  couponCode?: string;
  paymentMethod: PaymentMethodType;
  transactionRef: string;
  payerNotes?: string;
  paymentScreenshotUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  allocatedAccountNumber?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface AdminCreateUserInput {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  country: string;
  createAccount?: boolean;
  accountSize?: number;
  challengeType?: ChallengeType;
  leverage?: number;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentGatewaySettings = {
  cryptoUsdtTrc20: 'TX9k8pApexPropFirmVault7729LmQ2WzB',
  cryptoUsdtErc20: '0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoUsdtBep20: '0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoBnbBep20: '0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoBtcAddress: 'bc1qapex7729lmq2wzbfundedpropfirm9982k',
  cryptoEthAddress: '0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoSolAddress: 'APEX7729LmQ2WzBFundedPropFirmVaultSolanaKey',
  cryptoArbitrumAddress: '0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoAptosAddress: '0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoUsdtTrc20Qr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=00FFA3&bgcolor=030F0C&margin=0&qzone=1&data=TX9k8pApexPropFirmVault7729LmQ2WzB',
  cryptoUsdtErc20Qr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=00FFA3&bgcolor=030F0C&margin=0&qzone=1&data=0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoUsdtBep20Qr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=00FFA3&bgcolor=030F0C&margin=0&qzone=1&data=0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoBnbBep20Qr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=00FFA3&bgcolor=030F0C&margin=0&qzone=1&data=0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoBtcQr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=00FFA3&bgcolor=030F0C&margin=0&qzone=1&data=bc1qapex7729lmq2wzbfundedpropfirm9982k',
  cryptoEthQr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=00FFA3&bgcolor=030F0C&margin=0&qzone=1&data=0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoSolQr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=00FFA3&bgcolor=030F0C&margin=0&qzone=1&data=APEX7729LmQ2WzBFundedPropFirmVaultSolanaKey',
  cryptoArbitrumQr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=00FFA3&bgcolor=030F0C&margin=0&qzone=1&data=0x8F49aC7E219B40FundedApex7291E8823c91A421',
  cryptoAptosQr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=00FFA3&bgcolor=030F0C&margin=0&qzone=1&data=0x8F49aC7E219B40FundedApex7291E8823c91A421',
  bankAccountName: 'FUNDED APEX PROPRIETARY CORP',
  bankAccountNumber: '9840284019284',
  bankIbanSwift: 'APEXUS33XXX',
  bankName: 'JPMorgan Chase / Barclays Institutional',
  upiId: 'fundedapex@icici',
  upiQr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=00FFA3&bgcolor=030F0C&margin=0&qzone=1&data=upi://pay?pa=fundedapex@icici&pn=FUNDED%20APEX',
  cryptoNetworkNote: 'Send exact amount via USDT (BEP-20 BNB Smart Chain) or chosen coin, upload your payment screenshot image, and paste your Transaction Hash (TxID) below.',
  terminalUserId: 'APEX-MASTER',
  terminalPassword: 'APEX2026',
};

export const INITIAL_ADMIN_COUPONS: AdminCouponRecord[] = [
  {
    id: 'adm-cpn-5k',
    code: '5K30OFF',
    discountPct: 30,
    description: '$5K Starter Challenge Promo — Only on $10 Code',
    active: true,
    createdAt: '2026-11-06T00:00:00.000Z',
  },
  {
    id: 'adm-cpn-deshera',
    code: 'DESHERA99',
    discountPct: 30,
    description: 'Festive Starter Offer Promo Code',
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'adm-cpn-1',
    code: 'APEX20',
    discountPct: 20,
    description: '20% OFF Official Evaluation Discount Coupon',
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'adm-cpn-2',
    code: 'APEX50',
    discountPct: 50,
    description: '50% OFF VIP Prop Trader Promo Code',
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
  },
];

export interface PlatformContextValue {
  route: PageRoute;
  navigate: (page: PageRoute) => void;
  user: UserProfileData | null;
  authLoading: boolean;
  quotes: Record<SymbolCode, MarketQuote>;
  liveFeedStatus: LiveFeedStatus;
  refreshLiveQuotes: () => Promise<void>;
  refreshVaultData: () => Promise<void>;
  challenges: ChallengeTemplate[];
  accounts: TradingAccountRecord[];
  allAccounts: TradingAccountRecord[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  activeAccount: TradingAccountRecord | null;
  orders: TradeOrderRecord[];
  notifications: NotificationItem[];
  adminLogs: AdminAuditLogEntry[];
  allUsers: UserProfileData[];
  userCoupons: WonSpinCoupon[];
  adminCoupons: AdminCouponRecord[];
  paymentSettings: PaymentGatewaySettings;
  purchaseRequests: AccountPurchaseRequest[];
  userPurchaseRequests: AccountPurchaseRequest[];
  emailNotifications: FundedApexEmailPayload[];
  userEmailNotifications: FundedApexEmailPayload[];
  markEmailNotificationRead: (emailId: string) => void;
  adminBroadcastPromotionalEmail: (input: {
    recipientEmail?: string;
    recipientName?: string;
    offerTitle: string;
    discountPct: number;
    promoCode: string;
    challengeId?: string;
    challengeTitle?: string;
    originalPriceUsd?: number;
    discountedPriceUsd?: number;
  }) => { ok: boolean; error?: string; email?: FundedApexEmailPayload };
  adminSendEmailNotification: (input: {
    eventType: EmailEventType;
    recipientEmail: string;
    recipientName: string;
    challengeStatus?: ChallengeStatusEmailType;
    accountNumber?: string;
    challengeTitle?: string;
    accountSize?: number;
    breachOrStatusReason?: string;
    promoCode?: string;
    discountPct?: number;
  }) => { ok: boolean; error?: string; email?: FundedApexEmailPayload };
  adminSendManualEmail: (input: CustomManualEmailInput) => {
    ok: boolean;
    error?: string;
    email?: FundedApexEmailPayload;
  };
  payouts: PayoutRecordItem[];
  userPayoutRequests: PayoutRecordItem[];
  verifiedPayouts: PayoutRecordItem[];
  leaderboard: LeaderboardEntry[];
  testimonials: TestimonialRecord[];
  spinRewards: SpinRewardSegment[];
  liveStats: {
    totalRegisteredTraders: number;
    totalPayoutsUsd: number;
    totalFundedAccounts: number;
    activeTraders: number;
    activeTradersCount?: number;
  };
  toastMessage: {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null;
  clearToast: () => void;
  pushNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  // Auth operations
  loginWithEmail: (email: string, password: string, requestAdminWorkspace?: boolean) => Promise<void>;
  registerWithEmail: (input: { fullName: string; email: string; country: string; password: string; referralCode?: string }) => Promise<void>;
  loginWithGoogle: (requestAdminWorkspace?: boolean, emailHint?: string) => Promise<void>;
  completeGoogleSignInWithProfile: (input: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
    uid?: string;
    requestAdminWorkspace?: boolean;
  }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<Pick<UserProfileData, 'fullName' | 'country' | 'mfaEnabled' | 'deletionRequested' | 'avatarUrl' | 'kycStatus' | 'kycDocType' | 'kycSubmittedAt'>>) => Promise<void>;
  changeUserPassword: (newPassword: string) => Promise<void>;
  // Checkout & Trading Account operations
  stripeCheckoutSession: { challengeId: string; initialCouponCode?: string } | null;
  openStripeCheckout: (challengeId: string, initialCouponCode?: string) => void;
  closeStripeCheckout: () => void;
  submitAccountPurchaseRequest: (params: {
    challengeId: string;
    couponCode?: string;
    paymentMethod: PaymentMethodType;
    transactionRef: string;
    payerNotes?: string;
    paymentScreenshotUrl?: string;
    finalAmountUsd: number;
    discountPct: number;
    guestEmail?: string;
    guestName?: string;
  }) => AccountPurchaseRequest;
  completeStripeCheckoutPayment: (params: {
    challengeId: string;
    couponCode?: string;
    paymentMethod: 'card' | 'link' | 'crypto';
    cardLast4: string;
    billingEmail: string;
    cardholderName: string;
    amountPaidUsd: number;
  }) => TradingAccountRecord;
  startChallengeEvaluation: (challengeId: string) => TradingAccountRecord;
  redeemSpinCodeOrAddAccount: (codeInput: string, fallbackChallengeId?: string) => {
    ok: boolean;
    account?: TradingAccountRecord;
    openedCheckout?: boolean;
    message: string;
  };
  submitOrder: (input: OrderSubmissionInput) => { ok: boolean; error?: string; order?: TradeOrderRecord };
  modifyOrder: (orderId: string, updates: { stopLoss: number; takeProfit: number; entryPrice?: number }) => { ok: boolean; error?: string };
  closePosition: (orderId: string, partialRatio?: number) => { ok: boolean; error?: string };
  cancelPendingOrder: (orderId: string) => { ok: boolean; error?: string };
  requestAccountPayout: (input: {
    accountId: string;
    amountUsd: number;
    method: string;
    destination: string;
  }) => {
    ok: boolean;
    error?: string;
    payout?: PayoutRecordItem;
    eligibility?: AccountPayoutEligibility;
  };
  spinDailyWheel: (options?: { requireAuth?: boolean }) => {
    ok: boolean;
    reward?: SpinRewardSegment;
    coupon?: WonSpinCoupon;
    error?: string;
    requiresLogin?: boolean;
    limitReached?: boolean;
  };
  // Admin operations
  adminSaveChallenge: (challenge: ChallengeTemplate) => void;
  adminToggleArchiveChallenge: (challengeId: string) => void;
  adminUpdateAccountStatus: (accountId: string, status: AccountStatus) => void;
  adminUpdateAccountTerminalPassword: (
    accountId: string,
    newPasscode: string,
    newUserId?: string
  ) => void;
  adminGenerateAllAccountPasscodes: () => void;
  adminUpdateUserRole: (targetUid: string, newRole: UserRole) => void;
  adminAddOrVerifyPayout: (payout: PayoutRecordItem) => void;
  adminApprovePayoutRequest: (payoutId: string) => { ok: boolean; error?: string };
  adminRejectPayoutRequest: (payoutId: string) => { ok: boolean; error?: string };
  adminSaveSpinReward: (reward: SpinRewardSegment) => void;
  adminAddTestimonial: (testimonial: TestimonialRecord) => void;
  adminCreateUserAndAccount: (input: AdminCreateUserInput) => {
    ok: boolean;
    error?: string;
    user?: UserProfileData;
    account?: TradingAccountRecord;
    plainPassword?: string;
  };
  adminAllocateAccountToUser: (input: {
    targetUid: string;
    challengeId: string;
  }) => {
    ok: boolean;
    error?: string;
    account?: TradingAccountRecord;
  };
  adminResetUserPassword: (targetUid: string, newPassword: string) => {
    ok: boolean;
    error?: string;
    message?: string;
  };
  adminDeleteUser: (targetUid: string) => {
    ok: boolean;
    error?: string;
  };
  adminCreateCoupon: (input: {
    code: string;
    discountPct: number;
    description: string;
  }) => { ok: boolean; error?: string; coupon?: AdminCouponRecord };
  adminToggleCoupon: (couponId: string) => void;
  adminDeleteCoupon: (couponId: string) => void;
  adminSavePaymentSettings: (settings: PaymentGatewaySettings) => void;
  uploadAccountCertificateImage: (accountId: string, imageUrl: string) => void;
  uploadChallengeCertificateImage: (challengeType: ChallengeType, imageUrl: string) => void;
  adminApprovePurchaseRequest: (requestId: string) => {
    ok: boolean;
    error?: string;
    account?: TradingAccountRecord;
  };
  adminRejectPurchaseRequest: (requestId: string) => {
    ok: boolean;
    error?: string;
  };
  isTerminalUnlocked: boolean;
  unlockTerminal: (userIdOrPassword: string, passwordInput?: string) => boolean;
  lockTerminal: () => void;
  quotesRef: React.MutableRefObject<Record<SymbolCode, MarketQuote>>;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

function generateInitialQuotes(): Record<SymbolCode, MarketQuote> {
  const map = {} as Record<SymbolCode, MarketQuote>;
  (Object.keys(INSTRUMENTS) as SymbolCode[]).forEach((sym) => {
    const spec = INSTRUMENTS[sym];
    const bid = spec.basePrice;
    const ask = roundPrice(bid + spec.spread, sym);
    map[sym] = {
      symbol: sym,
      bid,
      ask,
      last: roundPrice((bid + ask) / 2, sym),
      change24hPct: sym === 'XAUUSD' ? 0.84 : sym === 'BTCUSD' ? 2.15 : sym === 'NAS100' ? 0.62 : 0.31,
      high24h: roundPrice(bid * 1.008, sym),
      low24h: roundPrice(bid * 0.992, sym),
      timestamp: Date.now(),
    };
  });
  return map;
}

const STORAGE_KEYS = {
  SESSION_USER: 'funded_apex_session_v4_strict',
  USERS_DIRECTORY: 'funded_apex_users_dir_v4_strict',
  ACCOUNTS: 'funded_apex_accounts_v4_strict',
  ORDERS: 'funded_apex_orders_v4_strict',
  CHALLENGES: 'funded_apex_challenges_v4_all24',
  ADMIN_LOGS: 'funded_apex_admin_logs_v4_strict',
  PAYOUTS: 'funded_apex_payouts_v1',
  SPIN_REWARDS: 'funded_apex_spin_rewards_v1',
  TESTIMONIALS: 'funded_apex_testimonials_v1',
  COUPONS: 'funded_apex_spin_coupons_v4_strict',
  ADMIN_COUPONS: 'funded_apex_admin_coupons_v1',
  PAYMENT_SETTINGS: 'funded_apex_payment_settings_v1',
  PURCHASE_REQUESTS: 'funded_apex_purchase_requests_v1',
  EMAIL_NOTIFICATIONS: 'funded_apex_email_notifications_v1',
};

const INITIAL_DEFAULT_ACCOUNTS: TradingAccountRecord[] = [
  {
    id: 'acc-owner-100k',
    accountNumber: 'FA-902841',
    userId: 'admin-owner-1',
    userEmail: 'kingritikx0343@gmail.com',
    challengeId: 'two-step-100000',
    challengeTitle: 'Two Step Challenge ($100,000)',
    challengeType: 'two_step',
    accountSize: 100000,
    startingBalance: 100000,
    phaseStartingBalance: 100000,
    balance: 100000,
    equity: 100000,
    usedMargin: 0,
    freeMargin: 100000,
    profitTargetPct: 8,
    dailyDrawdownPct: 5,
    maxDrawdownPct: 10,
    minTradingDays: 3,
    tradingDaysCount: 0,
    leverage: 100,
    profitSplitPct: 90,
    currentStep: 1,
    totalSteps: 2,
    peakEquity: 100000,
    dailyStartingEquity: 100000,
    lastDailyResetDate: new Date().toISOString().split('T')[0],
    status: 'active',
    terminalUserId: 'APEX-ID-2841',
    terminalPassword: 'APEX-2841',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
  },
  {
    id: 'acc-admin-50k',
    accountNumber: 'FA-882410',
    userId: 'admin-super-1',
    userEmail: 'admin@fundedapex.com',
    challengeId: 'two-step-50000',
    challengeTitle: 'Two Step Challenge ($50,000)',
    challengeType: 'two_step',
    accountSize: 50000,
    startingBalance: 50000,
    phaseStartingBalance: 50000,
    balance: 50000,
    equity: 50000,
    usedMargin: 0,
    freeMargin: 50000,
    profitTargetPct: 8,
    dailyDrawdownPct: 5,
    maxDrawdownPct: 10,
    minTradingDays: 3,
    tradingDaysCount: 0,
    leverage: 100,
    profitSplitPct: 90,
    currentStep: 1,
    totalSteps: 2,
    peakEquity: 50000,
    dailyStartingEquity: 50000,
    lastDailyResetDate: new Date().toISOString().split('T')[0],
    status: 'active',
    terminalUserId: 'APEX-ID-2410',
    terminalPassword: 'APEX-2410',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
  },
];

function readMergedLocalStorageList<T extends Record<string, any>>(
  keys: string[],
  idField = 'id'
): T[] {
  const byId = new Map<string, T>();
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (item && typeof item === 'object') {
          const itemKey = String(item[idField] || item.uid || item.email || Math.random());
          const prev = byId.get(itemKey);
          byId.set(itemKey, prev ? { ...prev, ...item } : item);
        }
      }
    } catch {
      // ignore malformed storage entry
    }
  }
  return Array.from(byId.values());
}

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<PageRoute>(() => {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page') as PageRoute | null;
    if (pageParam) return pageParam;
    const path = window.location.pathname.replace('/', '') as PageRoute;
    if (
      [
        'about',
        'challenges',
        'account-sizes',
        'trading-rules',
        'how-it-works',
        'terminal-preview',
        'free-spin',
        'referral',
        'leaderboard',
        'payouts',
        'faq',
        'login',
        'register',
        'privacy',
        'terms',
        'refund-policy',
        'risk-disclosure',
        'dashboard',
        'terminal',
        'admin',
      ].includes(path)
    ) {
      return path === 'free-spin' ? 'challenges' : path;
    }
    return 'home';
  });

  // Persistent authenticated user session across reloads (checks current and legacy session keys)
  const [user, setUser] = useState<UserProfileData | null>(() => {
    const sessionKeys = [
      STORAGE_KEYS.SESSION_USER,
      'funded_apex_session_v3',
      'funded_apex_session_v2',
      'funded_apex_session_v1',
    ];
    for (const k of sessionKeys) {
      try {
        const savedLocal = localStorage.getItem(k);
        if (savedLocal) return JSON.parse(savedLocal);
        const savedSession = sessionStorage.getItem(k);
        if (savedSession) return JSON.parse(savedSession);
      } catch {
        // continue checking fallback keys
      }
    }
    return null;
  });

  const [stripeCheckoutSession, setStripeCheckoutSession] = useState<{
    challengeId: string;
    initialCouponCode?: string;
  } | null>(null);
  const [pendingCheckoutChallengeId, setPendingCheckoutChallengeId] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<UserProfileData[]>(() => {
    const defaultAdmins: UserProfileData[] = [
      {
        uid: 'admin-super-1',
        fullName: 'FUNDED APEX Super Admin',
        email: 'admin@fundedapex.com',
        country: 'India',
        referralCode: 'APEX-ADMIN',
        role: 'super_admin',
        rewardPoints: 0,
        mfaEnabled: true,
        deletionRequested: false,
        passwordHash: hashPasswordVerifier('admin@fundedapex.com', 'ApexAdmin2026!'),
        passwordUpdatedAt: 0,
        isSeedDefault: true,
        createdAt: '2026-11-01T00:00:00.000Z',
      },
      {
        uid: 'admin-owner-1',
        fullName: 'Ritik Executive Admin',
        email: 'kingritikx0343@gmail.com',
        country: 'India',
        referralCode: 'APEX-OWNER',
        role: 'super_admin',
        rewardPoints: 0,
        mfaEnabled: true,
        deletionRequested: false,
        passwordHash: hashPasswordVerifier('kingritikx0343@gmail.com', 'ApexAdmin2026!'),
        passwordUpdatedAt: 0,
        isSeedDefault: true,
        createdAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    try {
      const recoveredUsers = readMergedLocalStorageList<UserProfileData>(
        [
          STORAGE_KEYS.USERS_DIRECTORY,
          'funded_apex_users_dir_v3',
          'funded_apex_users_dir_v2',
          'funded_apex_users_dir_v1',
          'funded_apex_users',
        ],
        'email'
      );
      if (recoveredUsers.length > 0) {
        return mergeUserDirectories(defaultAdmins, recoveredUsers);
      }
      return defaultAdmins;
    } catch {
      return defaultAdmins;
    }
  });

  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [quotes, setQuotes] = useState<Record<SymbolCode, MarketQuote>>(generateInitialQuotes);
  const quotesRef = useRef<Record<SymbolCode, MarketQuote>>(generateInitialQuotes());

  // Sync quotesRef whenever quotes state changes (state update is still needed for React-reactive components)
  useEffect(() => {
    quotesRef.current = quotes;
  }, [quotes]);

  const [liveFeedStatus, setLiveFeedStatus] = useState<LiveFeedStatus>({
    connected: true,
    source: 'Connecting Live Exchange Feed...',
    lastUpdateTs: Date.now(),
    tickCount: 0,
  });

  const [challenges, setChallenges] = useState<ChallengeTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
      if (saved) {
        const parsed: ChallengeTemplate[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((ch) =>
            ch.type === 'instant' ? { ...ch, profitTargetPct: 0 } : ch
          );
        }
      }
      return INITIAL_CHALLENGES;
    } catch {
      return INITIAL_CHALLENGES;
    }
  });

  const [orders, setOrders] = useState<TradeOrderRecord[]>(() => {
    try {
      return readMergedLocalStorageList<TradeOrderRecord>(
        [
          STORAGE_KEYS.ORDERS,
          'funded_apex_orders_v3',
          'funded_apex_orders_v2',
          'funded_apex_orders_v1',
          'funded_apex_orders',
        ],
        'id'
      );
    } catch {
      return [];
    }
  });

  const [payouts, setPayouts] = useState<PayoutRecordItem[]>(() => {
    try {
      const recoveredPayouts = readMergedLocalStorageList<PayoutRecordItem>(
        [STORAGE_KEYS.PAYOUTS, 'funded_apex_payouts_v2', 'funded_apex_payouts_v1'],
        'id'
      );
      if (recoveredPayouts.length > 0) {
        const existingIds = new Set(recoveredPayouts.map((p) => p.id));
        return [
          ...recoveredPayouts,
          ...INITIAL_PAYOUTS.filter((p) => !existingIds.has(p.id)),
        ];
      }
      return INITIAL_PAYOUTS;
    } catch {
      return INITIAL_PAYOUTS;
    }
  });

  const [accounts, setAccounts] = useState<TradingAccountRecord[]>(() => {
    try {
      const recovered = readMergedLocalStorageList<TradingAccountRecord>(
        [
          STORAGE_KEYS.ACCOUNTS,
          'funded_apex_accounts_v3',
          'funded_apex_accounts_v2',
          'funded_apex_accounts_v1',
          'funded_apex_accounts',
        ],
        'id'
      );
      const baseList =
        recovered.length > 0
          ? [
              ...recovered,
              ...INITIAL_DEFAULT_ACCOUNTS.filter(
                (seedAcc) => !recovered.some((r) => r.id === seedAcc.id || r.accountNumber === seedAcc.accountNumber)
              ),
            ]
          : INITIAL_DEFAULT_ACCOUNTS;

      return baseList.map((acc, idx) => {
        let pass = acc.terminalPassword?.trim() || '';
        if (!pass && acc.status !== 'failed') {
          const numDigits =
            acc.accountNumber.replace(/[^0-9]/g, '').slice(-4) || String(1001 + idx);
          pass = `APEX-${numDigits}`;
        }

        let termId = acc.terminalUserId?.trim() || '';
        if (!termId) {
          const numDigits =
            acc.accountNumber.replace(/[^0-9]/g, '').slice(-4) || String(1001 + idx);
          termId = `APEX-ID-${numDigits}`;
        }

        const initialRules = resolveChallengeRulesForAccount(acc);
        const accOrders = orders.filter((o) => o.accountId === acc.id);
        const closedOrdersForAcc = accOrders.filter((o) => o.status === 'CLOSED');
        const openOrdersForAcc = accOrders.filter((o) => o.status === 'OPEN');

        // Heal legacy hardcoded phantom seed balances ($104,850 on FA-902841 and $54,250 on FA-882410 when 0 orders exist)
        const isPhantomSeed =
          accOrders.length === 0 &&
          ((acc.id === 'acc-owner-100k' && acc.balance === 104850) ||
            (acc.id === 'acc-admin-50k' && acc.balance === 54250) ||
            (acc.status !== 'failed' && closedOrdersForAcc.length === 0 && acc.balance !== acc.startingBalance));

        const realizedNet = closedOrdersForAcc.reduce((s, o) => s + (o.netPnl || 0), 0);
        const floatingNet = openOrdersForAcc.reduce((s, o) => s + (o.netPnl || 0), 0);
        const withdrawnGross = payouts
          .filter((p) => p.accountId === acc.id && p.status !== 'Rejected')
          .reduce(
            (s, p) =>
              s + (p.grossProfitDeducted || p.amountUsd / ((initialRules.profitSplitPct || 80) / 100)),
            0
          );

        let healedStatus: AccountStatus =
          accOrders.length === 0 && acc.id === 'acc-admin-50k' && acc.status === 'passed'
            ? 'active'
            : acc.status;
        let healedStep =
          accOrders.length === 0 && acc.id === 'acc-admin-50k' ? 1 : acc.currentStep || 1;

        // Strictly align evaluation account step & status with realized challenge profit rules unless breached/suspended
        if (healedStatus !== 'failed' && healedStatus !== 'suspended' && withdrawnGross === 0) {
          if (initialRules.challengeType === 'one_step') {
            if (realizedNet < acc.startingBalance * 0.10) {
              healedStatus = 'active';
              healedStep = 1;
            } else {
              healedStatus = 'passed';
              healedStep = 1;
            }
          } else if (initialRules.challengeType === 'two_step') {
            if (realizedNet < acc.startingBalance * 0.08) {
              healedStatus = 'active';
              healedStep = 1;
            } else if (realizedNet < acc.startingBalance * 0.13) {
              healedStatus = 'active';
              healedStep = 2;
            } else {
              healedStatus = 'passed';
              healedStep = 2;
            }
          } else if (initialRules.challengeType === 'three_step') {
            if (realizedNet < acc.startingBalance * 0.06) {
              healedStatus = 'active';
              healedStep = 1;
            } else if (realizedNet < acc.startingBalance * 0.12) {
              healedStatus = 'active';
              healedStep = 2;
            } else if (realizedNet < acc.startingBalance * 0.18) {
              healedStatus = 'active';
              healedStep = 3;
            } else {
              healedStatus = 'passed';
              healedStep = 3;
            }
          }
        }

        const cleanBalance =
          healedStatus === 'failed'
            ? acc.balance
            : Math.round((acc.startingBalance + realizedNet - withdrawnGross) * 100) / 100;
        const cleanEquity =
          healedStatus === 'failed'
            ? cleanBalance
            : Math.round((cleanBalance + floatingNet) * 100) / 100;

        const resolvedRules = resolveChallengeRulesForAccount({
          ...acc,
          status: healedStatus,
          currentStep: healedStep,
        });

        const cleanPhaseStart = getMinimumPhaseStartBalance(
          acc.startingBalance,
          resolvedRules.challengeType,
          resolvedRules.currentStep,
          isPhantomSeed ? acc.startingBalance : acc.phaseStartingBalance
        );

        return {
          ...acc,
          challengeType: resolvedRules.challengeType,
          balance: isPhantomSeed ? acc.startingBalance : cleanBalance,
          equity: isPhantomSeed ? acc.startingBalance : cleanEquity,
          freeMargin: isPhantomSeed ? acc.startingBalance : cleanEquity - (acc.usedMargin || 0),
          phaseStartingBalance: cleanPhaseStart,
          status: healedStatus,
          terminalUserId: termId,
          terminalPassword: pass,
          dailyDrawdownPct: resolvedRules.dailyDrawdownPct,
          maxDrawdownPct: resolvedRules.maxDrawdownPct,
          profitTargetPct: resolvedRules.profitTargetPct,
          leverage: resolvedRules.leverage,
          profitSplitPct: resolvedRules.profitSplitPct,
          minTradingDays: resolvedRules.minTradingDays,
          totalSteps: resolvedRules.totalSteps,
          currentStep: resolvedRules.currentStep,
          peakEquity: isPhantomSeed
            ? acc.startingBalance
            : Math.max(acc.startingBalance, cleanEquity),
          dailyStartingEquity: isPhantomSeed
            ? acc.startingBalance
            : acc.dailyStartingEquity || acc.startingBalance,
          lastDailyResetDate: acc.lastDailyResetDate || new Date().toISOString().split('T')[0],
        };
      });
    } catch {
      return INITIAL_DEFAULT_ACCOUNTS;
    }
  });

  const [adminLogs, setAdminLogs] = useState<AdminAuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [spinRewards, setSpinRewards] = useState<SpinRewardSegment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SPIN_REWARDS);
      return saved ? JSON.parse(saved) : SPIN_REWARDS;
    } catch {
      return SPIN_REWARDS;
    }
  });

  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TESTIMONIALS);
      return saved ? JSON.parse(saved) : INITIAL_TESTIMONIALS;
    } catch {
      return INITIAL_TESTIMONIALS;
    }
  });

  const [coupons, setCoupons] = useState<WonSpinCoupon[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COUPONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [adminCoupons, setAdminCoupons] = useState<AdminCouponRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_COUPONS);
      if (!saved) return INITIAL_ADMIN_COUPONS;
      const parsed: AdminCouponRecord[] = JSON.parse(saved);
      const existingCodes = new Set(parsed.map((c) => c.code.toUpperCase()));
      const missingDefaults = INITIAL_ADMIN_COUPONS.filter((c) => !existingCodes.has(c.code.toUpperCase()));
      return [...parsed, ...missingDefaults];
    } catch {
      return INITIAL_ADMIN_COUPONS;
    }
  });

  const [paymentSettings, setPaymentSettings] = useState<PaymentGatewaySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENT_SETTINGS);
      return saved ? { ...DEFAULT_PAYMENT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_PAYMENT_SETTINGS;
    } catch {
      return DEFAULT_PAYMENT_SETTINGS;
    }
  });

  const [purchaseRequests, setPurchaseRequests] = useState<AccountPurchaseRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PURCHASE_REQUESTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [emailNotifications, setEmailNotifications] = useState<FundedApexEmailPayload[]>(() => {
    const defaultStarterEmails: FundedApexEmailPayload[] = [
      buildPromotionalOfferEmailPayload({
        recipientEmail: 'all@fundedapex.com',
        recipientName: 'FUNDED APEX Trader Community',
        offerTitle: '$5K Evaluation 30% OFF — $7.00 Only Flash Promo',
        discountPct: 30,
        promoCode: '5K30OFF',
        challengeId: 'two-step-5000',
        challengeTitle: '$5K Starter Two-Step Evaluation',
        originalPriceUsd: 10,
        discountedPriceUsd: 7,
      }),
      buildRegistrationWelcomeEmailPayload({
        recipientEmail: 'kingritikx0343@gmail.com',
        recipientName: 'Ritik Executive Admin',
        referralCode: 'APEX-OWNER',
        country: 'India',
      }),
      buildChallengeStatusUpdateEmailPayload({
        recipientEmail: 'all@fundedapex.com',
        recipientName: 'FUNDED APEX Trader',
        accountNumber: 'FA-882410',
        challengeId: 'two-step-50000',
        challengeTitle: 'Two Step Challenge ($50,000)',
        accountSize: 50000,
        status: 'passed',
        currentBalance: 54250,
        currentEquity: 54250,
        currentStep: 2,
        totalSteps: 2,
        profitSplitPct: 90,
      }),
    ];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EMAIL_NOTIFICATIONS);
      if (saved) {
        const parsed: FundedApexEmailPayload[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return defaultStarterEmails;
    } catch {
      return defaultStarterEmails;
    }
  });

  const [isTerminalUnlocked, setIsTerminalUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('apex_terminal_unlocked_v1') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isTerminalUnlocked) {
        sessionStorage.setItem('apex_terminal_unlocked_v1', 'true');
      } else {
        sessionStorage.removeItem('apex_terminal_unlocked_v1');
      }
    } catch {}
  }, [isTerminalUnlocked]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
    } catch {}
  }, [coupons]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_COUPONS, JSON.stringify(adminCoupons));
    } catch {}
  }, [adminCoupons]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(paymentSettings));
    } catch {}
  }, [paymentSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PURCHASE_REQUESTS, JSON.stringify(purchaseRequests));
    } catch {}
  }, [purchaseRequests]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EMAIL_NOTIFICATIONS, JSON.stringify(emailNotifications));
    } catch {}
  }, [emailNotifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PAYOUTS, JSON.stringify(payouts));
    } catch {}
  }, [payouts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SPIN_REWARDS, JSON.stringify(spinRewards));
    } catch {}
  }, [spinRewards]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TESTIMONIALS, JSON.stringify(testimonials));
    } catch {}
  }, [testimonials]);

  const userCoupons = useMemo(() => {
    if (!user) return [];
    const cleanEmail = user.email.toLowerCase();
    const matchingUids = new Set(
      allUsers.filter((u) => u.email.toLowerCase() === cleanEmail).map((u) => u.uid)
    );
    matchingUids.add(user.uid);
    return coupons.filter((c) => matchingUids.has(c.userId));
  }, [coupons, user, allUsers]);

  const userPurchaseRequests = useMemo(() => {
    if (!user) return [];
    const cleanEmail = user.email.toLowerCase();
    const matchingUids = new Set(
      allUsers.filter((u) => u.email.toLowerCase() === cleanEmail).map((u) => u.uid)
    );
    matchingUids.add(user.uid);
    return purchaseRequests.filter(
      (r) => matchingUids.has(r.userId) || (r.userEmail || '').toLowerCase() === cleanEmail
    );
  }, [purchaseRequests, user, allUsers]);

  const userEmailNotifications = useMemo(() => {
    if (!user) {
      return emailNotifications.filter(
        (m) => (m.to || '').toLowerCase() === 'all@fundedapex.com'
      );
    }
    const cleanEmail = user.email.toLowerCase();
    const matchingUids = new Set(
      allUsers.filter((u) => u.email.toLowerCase() === cleanEmail).map((u) => u.uid)
    );
    matchingUids.add(user.uid);
    const ownedAccountIds = new Set(
      accounts
        .filter(
          (a) =>
            matchingUids.has(a.userId) ||
            (a.userEmail || '').toLowerCase() === cleanEmail
        )
        .map((a) => a.id)
    );
    const ownedAccountNumbers = new Set(
      accounts
        .filter(
          (a) =>
            matchingUids.has(a.userId) ||
            (a.userEmail || '').toLowerCase() === cleanEmail
        )
        .map((a) => a.accountNumber)
    );
    return emailNotifications.filter((mail) => {
      const toAddr = (mail.to || '').toLowerCase();
      if (toAddr === cleanEmail || toAddr === 'all@fundedapex.com') return true;
      if (mail.accountId && ownedAccountIds.has(mail.accountId)) return true;
      if (mail.accountNumber && ownedAccountNumbers.has(mail.accountNumber)) return true;
      return false;
    });
  }, [emailNotifications, user, allUsers, accounts]);

  const markEmailNotificationRead = useCallback((emailId: string) => {
    setEmailNotifications((prev) =>
      prev.map((m) => (m.id === emailId ? { ...m, read: true } : m))
    );
  }, []);

  const verifiedPayouts = useMemo(() => filterVerifiedPayouts(payouts), [payouts]);

  const userPayoutRequests = useMemo(() => {
    if (!user) return [];
    const cleanEmail = user.email.toLowerCase();
    const matchingUids = new Set(
      allUsers.filter((u) => u.email.toLowerCase() === cleanEmail).map((u) => u.uid)
    );
    matchingUids.add(user.uid);
    const ownedAccIds = new Set(
      accounts
        .filter(
          (a) =>
            matchingUids.has(a.userId) ||
            (a.userEmail || '').toLowerCase() === cleanEmail
        )
        .map((a) => a.id)
    );
    const ownedAccNums = new Set(
      accounts
        .filter(
          (a) =>
            matchingUids.has(a.userId) ||
            (a.userEmail || '').toLowerCase() === cleanEmail
        )
        .map((a) => a.accountNumber)
    );
    return payouts.filter((p) => {
      if (p.userId && matchingUids.has(p.userId)) return true;
      if (p.userEmail && p.userEmail.toLowerCase() === cleanEmail) return true;
      if (p.accountId && ownedAccIds.has(p.accountId)) return true;
      if (p.accountNumber && ownedAccNums.has(p.accountNumber)) return true;
      return false;
    });
  }, [payouts, user, allUsers, accounts]);

  const liveStats = useMemo(
    () =>
      computeLivePlatformStatistics({
        registeredUsersCount: allUsers.length,
        accounts,
        payouts,
      }),
    [allUsers.length, accounts, payouts]
  );

  const leaderboard = useMemo(() => {
    const activeEntries: LeaderboardEntry[] = accounts
      .filter((acc) => acc.equity > acc.startingBalance)
      .map((acc) => {
        const owner = allUsers.find((u) => u.uid === acc.userId);
        const netProfit = Math.round((acc.equity - acc.startingBalance) * 100) / 100;
        const returnPct = Math.round((netProfit / acc.startingBalance) * 10000) / 100;
        const traderName = owner ? owner.fullName : 'Active Trader';
        const username = owner
          ? `@${owner.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 14)}`
          : `@apex_${acc.accountNumber.toLowerCase()}`;
        return {
          rank: 0,
          traderName,
          username,
          country: owner?.country || 'United States',
          accountSize: acc.accountSize,
          challengeType: acc.challengeTitle,
          netProfitUsd: netProfit,
          returnPct,
          winRatePct: 68.5,
          primarySymbol: 'XAUUSD',
          isSample: false,
        };
      });

    const combined = [...activeEntries, ...SAMPLE_LEADERBOARD].sort(
      (a, b) => b.returnPct - a.returnPct
    );
    return combined.slice(0, 10).map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [accounts, allUsers]);

  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-welcome',
      title: 'FUNDED APEX Engine Active',
      message: 'Live market price feed and simulated execution engine are online.',
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false,
    },
  ]);

  const [toastMessage, setToastMessage] = useState<{
    id: number;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);

  const clearToast = useCallback(() => setToastMessage(null), []);

  // Automatically dismiss all login, logout, and system popups after 3 seconds (3000ms)
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const pushNotification = useCallback(
    (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const item: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [item, ...prev.slice(0, 29)]);
      setToastMessage({ id: Date.now() + Math.random(), title, message, type });
    },
    []
  );



  // Persist state slices
  useEffect(() => {
    try {
      if (user) {
        const serialized = JSON.stringify(user);
        localStorage.setItem(STORAGE_KEYS.SESSION_USER, serialized);
        sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, serialized);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_USER);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.USERS_DIRECTORY, JSON.stringify(allUsers));
      } catch {}
    }, 120);
    return () => clearTimeout(t);
  }, [allUsers]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      } catch {}
    }, 240);
    return () => clearTimeout(t);
  }, [accounts]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      } catch {}
    }, 240);
    return () => clearTimeout(t);
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(challenges));
    } catch {}
  }, [challenges]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_LOGS, JSON.stringify(adminLogs));
    } catch {}
  }, [adminLogs]);

  // Persistent Server Disk Vault Sync (Protects all user profiles, passwords, accounts, orders & purchases across Web updates)
  const vaultLoadedRef = useRef(false);

  const refreshVaultData = useCallback(async () => {
    try {
      const res = await fetch('/api/vault/sync');
      if (!res.ok) {
        vaultLoadedRef.current = true;
        return;
      }
      const data = await res.json();
      if (!data?.vault) {
        vaultLoadedRef.current = true;
        return;
      }
      const v = data.vault;
      if (Array.isArray(v.users) && v.users.length > 0) {
        let mergedUsersSnapshot: UserProfileData[] = [];
        setAllUsers((prev) => {
          const next = mergeUserDirectories(v.users as UserProfileData[], prev);
          mergedUsersSnapshot = next;
          if (next.length === prev.length && JSON.stringify(next) === JSON.stringify(prev)) {
            return prev;
          }
          return next;
        });
        if (mergedUsersSnapshot.length > 0) {
          setUser((prevUser) => {
            if (!prevUser) return prevUser;
            const matched = mergedUsersSnapshot.find(
              (u) => u.email.toLowerCase() === prevUser.email.toLowerCase()
            );
            if (!matched) return prevUser;
            const safeMerged = mergeUserProfileRecords(prevUser, matched);
            return JSON.stringify(safeMerged) === JSON.stringify(prevUser) ? prevUser : safeMerged;
          });
        }
      }
      if (Array.isArray(v.accounts) && v.accounts.length > 0) {
        const vaultOrders: TradeOrderRecord[] = Array.isArray(v.orders) ? v.orders : [];
        setAccounts((prev) => {
          const byId = new Map<string, TradingAccountRecord>();
          v.accounts.forEach((a: TradingAccountRecord) => {
            if (!a?.id) return;
            const hasVaultOrders = vaultOrders.some((o) => o.accountId === a.id);
            const isPhantomVaultSeed =
              !hasVaultOrders &&
              ((a.id === 'acc-owner-100k' && a.balance === 104850) ||
                (a.id === 'acc-admin-50k' && (a.balance === 54250 || a.status === 'passed')));
            byId.set(
              a.id,
              isPhantomVaultSeed
                ? {
                    ...a,
                    balance: a.startingBalance,
                    equity: a.startingBalance,
                    freeMargin: a.startingBalance,
                    peakEquity: a.startingBalance,
                    dailyStartingEquity: a.startingBalance,
                    phaseStartingBalance: a.startingBalance,
                    status: 'active',
                    currentStep: 1,
                    profitTargetPct: 8,
                  }
                : a
            );
          });
          prev.forEach((a) => {
            if (a?.id) {
              const vaultAcc = byId.get(a.id);
              byId.set(a.id, {
                ...vaultAcc,
                ...a,
                terminalPassword: a.terminalPassword || vaultAcc?.terminalPassword || '',
                terminalUserId: a.terminalUserId || vaultAcc?.terminalUserId || '',
              });
            }
          });
            const next = Array.from(byId.values());
            if (
              next.length === prev.length &&
              next.every((n, idx) => {
                const p = prev[idx];
                return (
                  p &&
                  p.id === n.id &&
                  p.balance === n.balance &&
                  p.status === n.status &&
                  p.currentStep === n.currentStep &&
                  p.terminalPassword === n.terminalPassword &&
                  p.certificateImageUrl === n.certificateImageUrl
                );
              })
            ) {
              return prev;
            }
            return next;
          });
        }
      if (Array.isArray(v.orders) && v.orders.length > 0) {
        setOrders((prev) => {
          const byId = new Map<string, TradeOrderRecord>();
          v.orders.forEach((o: TradeOrderRecord) => {
            if (o?.id) byId.set(o.id, o);
          });
          prev.forEach((o) => {
            if (o?.id) byId.set(o.id, { ...byId.get(o.id), ...o });
          });
          const next = Array.from(byId.values());
          if (next.length === prev.length && JSON.stringify(next) === JSON.stringify(prev)) {
            return prev;
          }
          return next;
        });
      }
      if (Array.isArray(v.purchaseRequests) && v.purchaseRequests.length > 0) {
        setPurchaseRequests((prev) => {
          const byId = new Map<string, AccountPurchaseRequest>();
          prev.forEach((r) => {
            if (r?.id) byId.set(r.id, r);
          });
          v.purchaseRequests.forEach((r: AccountPurchaseRequest) => {
            if (r?.id) {
              const existing = byId.get(r.id);
              byId.set(r.id, existing ? { ...existing, ...r } : r);
            }
          });
          const next = Array.from(byId.values()).sort((a, b) =>
            (b.createdAt || '').localeCompare(a.createdAt || '')
          );
          if (next.length === prev.length && JSON.stringify(next) === JSON.stringify(prev)) {
            return prev;
          }
          return next;
        });
      }
      if (Array.isArray(v.payouts) && v.payouts.length > 0) {
        setPayouts((prev) => {
          const byId = new Map<string, PayoutRecordItem>();
          prev.forEach((p) => {
            if (p?.id) byId.set(p.id, p);
          });
          v.payouts.forEach((p: PayoutRecordItem) => {
            if (p?.id) {
              const existing = byId.get(p.id);
              const existingReviewed = existing?.reviewedAt ? Date.parse(existing.reviewedAt) || 0 : 0;
              const incomingReviewed = p.reviewedAt ? Date.parse(p.reviewedAt) || 0 : 0;
              if (existing && existingReviewed > incomingReviewed) {
                byId.set(p.id, existing);
              } else {
                byId.set(p.id, existing ? { ...existing, ...p } : p);
              }
            }
          });
          const next = Array.from(byId.values()).sort((a, b) =>
            (b.createdAt || b.paymentDate || '').localeCompare(a.createdAt || a.paymentDate || '')
          );
          if (next.length === prev.length && JSON.stringify(next) === JSON.stringify(prev)) {
            return prev;
          }
          return next;
        });
      }
      if (Array.isArray(v.emailNotifications) && v.emailNotifications.length > 0) {
        setEmailNotifications((prev) => {
          const byId = new Map<string, FundedApexEmailPayload>();
          v.emailNotifications.forEach((m: FundedApexEmailPayload) => {
            if (m?.id) byId.set(m.id, m);
          });
          prev.forEach((m) => {
            if (m?.id) byId.set(m.id, { ...byId.get(m.id), ...m });
          });
          const next = Array.from(byId.values()).sort((a, b) =>
            (b.sentAt || '').localeCompare(a.sentAt || '')
          );
          if (next.length === prev.length && JSON.stringify(next) === JSON.stringify(prev)) {
            return prev;
          }
          return next;
        });
      }
      vaultLoadedRef.current = true;
    } catch {
      vaultLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    void refreshVaultData();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (routeRef.current === 'admin' || routeRef.current === 'dashboard') {
        void refreshVaultData();
      }
    }, 15000);
    const onFocus = () => {
      void refreshVaultData();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshVaultData]);

  useEffect(() => {
    if (!vaultLoadedRef.current) return;
    const syncTimer = setTimeout(() => {
      fetch('/api/vault/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: allUsers,
          accounts,
          orders,
          purchaseRequests,
          coupons,
          adminCoupons,
          payouts,
          paymentSettings,
          emailNotifications,
        }),
      }).catch(() => {});
    }, 450);
    return () => clearTimeout(syncTimer);
  }, [allUsers, accounts, orders, purchaseRequests, coupons, adminCoupons, payouts, paymentSettings, emailNotifications]);

  // Robust Firebase Auth listener + OAuth Redirect handler (links Google, GitHub, and Email accounts seamlessly)
  useEffect(() => {
    const syncAuthenticatedFirebaseUser = async (fbUser: {
      uid: string;
      email: string | null;
      displayName: string | null;
      photoURL: string | null;
    }) => {
      try {
        const cleanEmail = (fbUser.email || '').trim().toLowerCase();
        if (!cleanEmail) return;
        const isBootstrapSuperAdmin =
          cleanEmail === 'kingritikx0343@gmail.com' || cleanEmail === 'admin@fundedapex.com';
        const fallbackName =
          fbUser.displayName ||
          (cleanEmail ? cleanEmail.split('@')[0].replace(/[._-]/g, ' ') : 'FUNDED APEX Trader');

        let loadedProfile: UserProfileData = {
          uid: fbUser.uid,
          fullName: fallbackName,
          email: cleanEmail,
          country: 'India',
          referralCode: `APEX-${fbUser.uid.slice(0, 6).toUpperCase()}`,
          role: isBootstrapSuperAdmin ? 'super_admin' : 'user',
          rewardPoints: 0,
          mfaEnabled: isBootstrapSuperAdmin,
          deletionRequested: false,
          avatarUrl: fbUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };

        const tokenValid = await hasWorkingAuthToken();
        if (tokenValid) {
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            const snap = await getDoc(userDocRef);
            if (snap.exists()) {
              const data = snap.data();
              loadedProfile = {
                uid: fbUser.uid,
                fullName: data.fullName || fallbackName,
                email: (data.email || cleanEmail).toLowerCase(),
                country: data.country || 'India',
                referralCode: data.referralCode || `APEX-${fbUser.uid.slice(0, 6).toUpperCase()}`,
                referredBy: data.referredBy,
                role: isBootstrapSuperAdmin ? 'super_admin' : (data.role as UserRole) || 'user',
                rewardPoints: Number(data.rewardPoints || 0),
                lastSpinDate: data.lastSpinDate,
                mfaEnabled: Boolean(data.mfaEnabled),
                deletionRequested: Boolean(data.deletionRequested),
                passwordHash: data.passwordHash || undefined,
                passwordUpdatedAt:
                  typeof data.passwordUpdatedAt === 'number' ? data.passwordUpdatedAt : undefined,
                isSeedDefault: Boolean(data.isSeedDefault),
                avatarUrl: data.avatarUrl || fbUser.photoURL || undefined,
                createdAt:
                  typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
              };
            }
          } catch {
            // Firestore read optional if offline
          }
        }

        let resolvedUser: UserProfileData = loadedProfile;
        setAllUsers((prev) => {
          const existing = prev.find(
            (u) => u.uid === loadedProfile.uid || u.email.toLowerCase() === cleanEmail
          );
          if (existing) {
            resolvedUser = mergeUserProfileRecords(existing, {
              ...loadedProfile,
              role: ['admin', 'super_admin'].includes(existing.role)
                ? existing.role
                : loadedProfile.role,
              createdAt: existing.createdAt || loadedProfile.createdAt,
            });
          }
          return mergeUserDirectories(prev, [resolvedUser]);
        });

        setUser((prev) => {
          if (prev && prev.email.toLowerCase() === cleanEmail) {
            return mergeUserProfileRecords(prev, {
              ...resolvedUser,
              role: isBootstrapSuperAdmin ? 'super_admin' : resolvedUser.role,
            });
          }
          return resolvedUser;
        });

        setRoute((currentRoute) => {
          if (currentRoute === 'login' || currentRoute === 'register') {
            return ['admin', 'super_admin'].includes(resolvedUser.role) ? 'admin' : 'dashboard';
          }
          return currentRoute;
        });
      } catch {
        // Non-blocking fallback when offline
      }
    };

    // Process any pending Google/GitHub OAuth redirect result
    getRedirectResult(auth, popupResolver)
      .then((cred) => {
        if (cred?.user) {
          void syncAuthenticatedFirebaseUser(cred.user);
        }
      })
      .catch((redirectErr: any) => {
        const conflictEmail = String(redirectErr?.customData?.email || '')
          .trim()
          .toLowerCase();
        if (conflictEmail) {
          void syncAuthenticatedFirebaseUser({
            uid: `oauth-${conflictEmail.replace(/[^a-z0-9]/g, '')}`,
            email: conflictEmail,
            displayName: conflictEmail.split('@')[0].replace(/[._-]/g, ' '),
            photoURL: null,
          });
        }
      });

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) return;
      void syncAuthenticatedFirebaseUser(fbUser);
    });
    return () => unsubscribe();
  }, []);

  const userAccounts = useMemo(() => {
    if (!user) return [];
    const cleanEmail = user.email.toLowerCase();
    const matchingUids = new Set(
      allUsers.filter((u) => u.email.toLowerCase() === cleanEmail).map((u) => u.uid)
    );
    matchingUids.add(user.uid);
    // Also include UIDs from approved purchase requests belonging to this user's email
    purchaseRequests.forEach((r) => {
      if ((r.userEmail || '').toLowerCase() === cleanEmail && r.userId) {
        matchingUids.add(r.userId);
      }
    });
    return accounts.filter(
      (a) =>
        matchingUids.has(a.userId) ||
        (a.userEmail && a.userEmail.toLowerCase() === cleanEmail)
    );
  }, [accounts, user, allUsers, purchaseRequests]);

  // Automatically heal/link any accounts or purchase requests matching the logged-in user's email
  useEffect(() => {
    if (!user) return;
    const cleanEmail = user.email.toLowerCase();
    const matchingUids = new Set(
      allUsers.filter((u) => u.email.toLowerCase() === cleanEmail).map((u) => u.uid)
    );
    matchingUids.add(user.uid);
    purchaseRequests.forEach((r) => {
      if ((r.userEmail || '').toLowerCase() === cleanEmail && r.userId) {
        matchingUids.add(r.userId);
      }
    });

    const needsAccountHeal = accounts.some(
      (a) =>
        (matchingUids.has(a.userId) || (a.userEmail || '').toLowerCase() === cleanEmail) &&
        (a.userId !== user.uid || a.userEmail !== cleanEmail)
    );
    if (needsAccountHeal) {
      setAccounts((prev) =>
        prev.map((a) => {
          if (matchingUids.has(a.userId) || (a.userEmail || '').toLowerCase() === cleanEmail) {
            return { ...a, userId: user.uid, userEmail: cleanEmail };
          }
          return a;
        })
      );
    }

    const needsReqHeal = purchaseRequests.some(
      (r) => (r.userEmail || '').toLowerCase() === cleanEmail && r.userId !== user.uid
    );
    if (needsReqHeal) {
      setPurchaseRequests((prev) =>
        prev.map((r) =>
          (r.userEmail || '').toLowerCase() === cleanEmail ? { ...r, userId: user.uid } : r
        )
      );
    }
  }, [user, allUsers, accounts, purchaseRequests]);

  useEffect(() => {
    if (userAccounts.length > 0 && !userAccounts.some((a) => a.id === activeAccountId)) {
      setActiveAccountId(userAccounts[0].id);
    }
  }, [userAccounts, activeAccountId]);

  const activeAccount = useMemo(() => {
    return userAccounts.find((a) => a.id === activeAccountId) || userAccounts[0] || null;
  }, [userAccounts, activeAccountId]);

  // Keep refs to current route and active orders so high-frequency tick loops never re-render static website pages during 120Hz scroll
  const routeRef = React.useRef<PageRoute>(route);
  const hasActiveOrdersRef = React.useRef<boolean>(false);

  useEffect(() => {
    hasActiveOrdersRef.current = orders.some(
      (o) => o.status === 'OPEN' || o.status === 'PENDING'
    );
  }, [orders]);

  useEffect(() => {
    routeRef.current = route;
    if (route === 'terminal') {
      setQuotes({ ...quotesRef.current });
    }
  }, [route]);

  // Automatically ensure active/passed challenge accounts always have an active Terminal User ID & Password
  useEffect(() => {
    const needsCredentials = accounts.some(
      (a) => (a.status === 'active' || a.status === 'passed') && (!a.terminalPassword || !a.terminalUserId)
    );
    if (!needsCredentials) return;
    setAccounts((prev) =>
      prev.map((a) => {
        if ((a.status === 'active' || a.status === 'passed') && (!a.terminalPassword || !a.terminalUserId)) {
          const suffix = (a.accountNumber || '1001').replace(/[^0-9]/g, '').slice(-4) || '2026';
          return {
            ...a,
            terminalUserId: a.terminalUserId || `APEX-ID-${suffix}`,
            terminalPassword: a.terminalPassword || `APEX-${suffix}`,
          };
        }
        return a;
      })
    );
  }, [accounts]);

  // Automatically unlock terminal when the selected challenge account is active/passed and has an active terminal password
  useEffect(() => {
    if (!activeAccount) return;
    if (
      (activeAccount.status === 'active' || activeAccount.status === 'passed') &&
      Boolean(activeAccount.terminalPassword)
    ) {
      setIsTerminalUnlocked(true);
    } else if (activeAccount.status === 'failed') {
      setIsTerminalUnlocked(false);
    }
  }, [activeAccount?.id, activeAccount?.status, activeAccount?.terminalPassword]);

  const unlockTerminal = useCallback(
    (userIdOrPassword: string, passwordInput?: string): boolean => {
      const cleanFirst = userIdOrPassword.trim();
      const cleanSecond = passwordInput !== undefined ? passwordInput.trim() : '';

      // Two-field authentication (Terminal User ID + Terminal Password)
      if (passwordInput !== undefined) {
        if (!cleanFirst || !cleanSecond) {
          pushNotification(
            'Credentials Required',
            'Please enter both your Terminal User ID and Terminal Password.',
            'error'
          );
          return false;
        }

        // Check if user is trying to log into a breached account whose password was removed
        const breachedAttempt = accounts.find(
          (a) =>
            (a.terminalUserId || '').toUpperCase() === cleanFirst.toUpperCase() &&
            a.status === 'failed'
        );
        if (breachedAttempt) {
          setIsTerminalUnlocked(false);
          pushNotification(
            'Account Breached — Password Removed',
            `Account #${breachedAttempt.accountNumber} violated Maximum/Daily Drawdown rules. Terminal password has been removed.`,
            'error'
          );
          return false;
        }

        // 1. Check active account User ID + Password
        if (
          activeAccount &&
          activeAccount.status !== 'failed' &&
          activeAccount.terminalUserId &&
          activeAccount.terminalPassword &&
          cleanFirst.toUpperCase() === activeAccount.terminalUserId.toUpperCase() &&
          cleanSecond === activeAccount.terminalPassword
        ) {
          setIsTerminalUnlocked(true);
          pushNotification(
            'Terminal Unlocked ✓',
            `Verified User ID (${activeAccount.terminalUserId}) & Password for Account #${activeAccount.accountNumber}.`,
            'success'
          );
          return true;
        }

        // 2. Check any user account matching both User ID + Password
        const matchingAcc = userAccounts.find(
          (a) =>
            a.status !== 'failed' &&
            Boolean(a.terminalPassword) &&
            (a.terminalUserId || '').toUpperCase() === cleanFirst.toUpperCase() &&
            a.terminalPassword === cleanSecond
        );
        if (matchingAcc) {
          setActiveAccountId(matchingAcc.id);
          setIsTerminalUnlocked(true);
          pushNotification(
            'Terminal Unlocked ✓',
            `Switched & unlocked Account #${matchingAcc.accountNumber} (${matchingAcc.terminalUserId}).`,
            'success'
          );
          return true;
        }

        // 3. Check all accounts (for Admin or cross-account login)
        const anyAcc = accounts.find(
          (a) =>
            a.status !== 'failed' &&
            Boolean(a.terminalPassword) &&
            (a.terminalUserId || '').toUpperCase() === cleanFirst.toUpperCase() &&
            a.terminalPassword === cleanSecond
        );
        if (anyAcc && (user?.uid === anyAcc.userId || ['admin', 'super_admin'].includes(user?.role || ''))) {
          setActiveAccountId(anyAcc.id);
          setIsTerminalUnlocked(true);
          pushNotification(
            'Terminal Unlocked ✓',
            `Authorized Terminal Session for Account #${anyAcc.accountNumber}.`,
            'success'
          );
          return true;
        }

        // 4. Master Admin fallback credentials (only if active account is not breached)
        const masterId = (paymentSettings.terminalUserId || 'APEX-MASTER').toUpperCase();
        const masterPass = paymentSettings.terminalPassword || 'APEX2026';
        if (
          (!activeAccount || activeAccount.status !== 'failed') &&
          (cleanFirst.toUpperCase() === masterId || cleanFirst.toUpperCase() === 'APEX-MASTER') &&
          (cleanSecond === masterPass || cleanSecond === 'APEX2026')
        ) {
          setIsTerminalUnlocked(true);
          pushNotification('Terminal Unlocked ✓', 'Authorized Master Terminal Access.', 'success');
          return true;
        }

        pushNotification(
          'Access Denied',
          'Invalid Terminal User ID or Terminal Password. If your account was breached, its password has been removed.',
          'error'
        );
        return false;
      }

      // Single-arg fallback compatibility
      if (!cleanFirst) return false;
      if (
        activeAccount &&
        activeAccount.status !== 'failed' &&
        activeAccount.terminalPassword &&
        cleanFirst === activeAccount.terminalPassword
      ) {
        setIsTerminalUnlocked(true);
        pushNotification('Terminal Unlocked ✓', `Authorized access for Account #${activeAccount.accountNumber}.`, 'success');
        return true;
      }
      const matchingAcc = userAccounts.find(
        (a) => a.status !== 'failed' && Boolean(a.terminalPassword) && a.terminalPassword === cleanFirst
      );
      if (matchingAcc) {
        setActiveAccountId(matchingAcc.id);
        setIsTerminalUnlocked(true);
        pushNotification('Terminal Unlocked ✓', `Switched & unlocked Account #${matchingAcc.accountNumber}.`, 'success');
        return true;
      }
      const masterPass = paymentSettings.terminalPassword || 'APEX2026';
      if ((!activeAccount || activeAccount.status !== 'failed') && (cleanFirst === masterPass || cleanFirst === 'APEX2026')) {
        setIsTerminalUnlocked(true);
        pushNotification('Terminal Unlocked ✓', 'Authorized access to live trading execution.', 'success');
        return true;
      }

      pushNotification('Access Denied', 'Invalid Account Terminal Credentials.', 'error');
      return false;
    },
    [
      activeAccount,
      userAccounts,
      accounts,
      user,
      paymentSettings.terminalUserId,
      paymentSettings.terminalPassword,
      pushNotification,
      setActiveAccountId,
    ]
  );

  const lockTerminal = useCallback(() => {
    setIsTerminalUnlocked(false);
    pushNotification('Terminal Locked', 'Trading terminal session locked.', 'info');
  }, [pushNotification]);

  // Real-Time Live Market Price Engine (Binance WebSocket + REST 24hr Ticker + Global FX Spot)
  const refreshLiveQuotes = useCallback(async () => {
    try {
      const { quotes: fetchedQuotes, source } = await fetchInitialLiveQuotes(quotes);
      if (Object.keys(fetchedQuotes).length > 0) {
        setQuotes((prev) => {
          const next = { ...prev };
          (Object.keys(fetchedQuotes) as SymbolCode[]).forEach((sym) => {
            if (fetchedQuotes[sym]) {
              next[sym] = fetchedQuotes[sym]!;
            }
          });
          return next;
        });
        setLiveFeedStatus((prev) => ({
          connected: true,
          source,
          lastUpdateTs: Date.now(),
          tickCount: prev.tickCount + 1,
        }));
      }
    } catch {
      // keep existing live quotes
    }
  }, [quotes]);

  useEffect(() => {
    let active = true;
    const spotAnchors: Partial<Record<SymbolCode, number>> = {};
    const lastWsTickTs: Partial<Record<SymbolCode, number>> = {};

    fetchInitialLiveQuotes(generateInitialQuotes()).then(({ quotes: initialLive, source }) => {
      if (!active) return;
      if (Object.keys(initialLive).length > 0) {
        setQuotes((prev) => {
          const next = { ...prev };
          (Object.keys(initialLive) as SymbolCode[]).forEach((sym) => {
            if (initialLive[sym]) {
              next[sym] = initialLive[sym]!;
              spotAnchors[sym] = initialLive[sym]!.bid;
            }
          });
          return next;
        });
        setLiveFeedStatus((prev) => ({
          connected: true,
          source,
          lastUpdateTs: Date.now(),
          tickCount: prev.tickCount + 1,
        }));
      }
    });

    let lastWsFlushTs = 0;
    const pendingWsUpdates: Partial<Record<SymbolCode, Partial<MarketQuote>>> = {};

    const unsubscribeWs = subscribeLiveMarketStream(
      (tickUpdate) => {
        if (!active) return;
        const nowTs = Date.now();
        lastWsTickTs[tickUpdate.symbol] = nowTs;
        if (tickUpdate.bid && tickUpdate.bid > 0) {
          spotAnchors[tickUpdate.symbol] = tickUpdate.bid;
        }
        pendingWsUpdates[tickUpdate.symbol] = tickUpdate;

        // Always keep quotesRef.current up-to-the-millisecond so order execution never uses a stale price
        const currRefQuote = quotesRef.current[tickUpdate.symbol];
        if (currRefQuote) {
          const incomingBid = tickUpdate.bid ?? currRefQuote.bid;
          quotesRef.current[tickUpdate.symbol] = {
            ...currRefQuote,
            ...tickUpdate,
            high24h: Math.max(currRefQuote.high24h, incomingBid, tickUpdate.high24h || incomingBid),
            low24h:
              currRefQuote.low24h > 0
                ? Math.min(currRefQuote.low24h, incomingBid, tickUpdate.low24h || incomingBid)
                : incomingBid,
            timestamp: nowTs,
          };
        }

        // Only flush React state when on 'terminal' (320ms), when open/pending orders exist (1500ms), or on initial snapshot (lastWsFlushTs === 0)
        // This guarantees 0 background React re-renders while scrolling website pages at 120Hz!
        const isTerminalRoute = routeRef.current === 'terminal';
        const shouldFlushReactState =
          isTerminalRoute || hasActiveOrdersRef.current || lastWsFlushTs === 0;
        if (!shouldFlushReactState) {
          return;
        }
        const flushIntervalMs = isTerminalRoute ? 320 : 1500;
        if (lastWsFlushTs > 0 && nowTs - lastWsFlushTs < flushIntervalMs) {
          return;
        }
        lastWsFlushTs = nowTs;

        setQuotes((prev) => {
          const next = { ...prev };
          (Object.keys(pendingWsUpdates) as SymbolCode[]).forEach((sym) => {
            const upd = pendingWsUpdates[sym];
            const curr = prev[sym];
            if (!curr || !upd) return;
            const incomingBid = upd.bid ?? curr.bid;
            next[sym] = {
              ...curr,
              ...upd,
              high24h: Math.max(curr.high24h, incomingBid, upd.high24h || incomingBid),
              low24h:
                curr.low24h > 0
                  ? Math.min(curr.low24h, incomingBid, upd.low24h || incomingBid)
                  : incomingBid,
              timestamp: nowTs,
            };
            delete pendingWsUpdates[sym];
          });
          return next;
        });
      },
      (connected, source) => {
        if (!active || routeRef.current !== 'terminal') return;
        setLiveFeedStatus((prev) => ({
          ...prev,
          connected,
          source,
          lastUpdateTs: Date.now(),
        }));
      }
    );

    const restSyncTimer = setInterval(() => {
      if (routeRef.current !== 'terminal') return;
      fetchInitialLiveQuotes(quotesRef.current).then(({ quotes: freshQuotes, source }) => {
        if (!active || routeRef.current !== 'terminal') return;
        if (Object.keys(freshQuotes).length > 0) {
          const nowTs = Date.now();
          setQuotes((prev) => {
            const next = { ...prev };
            (Object.keys(freshQuotes) as SymbolCode[]).forEach((sym) => {
              const incoming = freshQuotes[sym];
              const existing = prev[sym];
              if (incoming) {
                spotAnchors[sym] = incoming.bid;
                // If direct exchange WebSocket ticked within the last 3.5 seconds, keep WS price authoritative so PnL never snaps back
                const recentWs = lastWsTickTs[sym] && nowTs - lastWsTickTs[sym]! < 3500;
                if (recentWs && existing && isDirectExchangeSymbol(sym)) {
                  next[sym] = {
                    ...existing,
                    high24h: incoming.high24h || existing.high24h,
                    low24h: incoming.low24h || existing.low24h,
                    change24hPct: incoming.change24hPct ?? existing.change24hPct,
                  };
                } else {
                  next[sym] = {
                    ...incoming,
                    timestamp: nowTs,
                  };
                }
              }
            });
            return next;
          });
          setLiveFeedStatus((prev) => ({
            ...prev,
            connected: true,
            source,
            lastUpdateTs: nowTs,
          }));
        }
      });
    }, 12000);

    let tickRafId: number | null = null;
    const microTickInterval = setInterval(() => {
      // Only run high-frequency micro-ticks when viewing the live trading terminal so website pages scroll at 120fps with zero background re-renders
      if (routeRef.current !== 'terminal') {
        return;
      }

      if (tickRafId !== null) cancelAnimationFrame(tickRafId);
      tickRafId = requestAnimationFrame(() => {
        const nowMs = Date.now();

        setQuotes((prevQuotes) => {
          const nextQuotes = { ...prevQuotes };

          (Object.keys(INSTRUMENTS) as SymbolCode[]).forEach((sym, idx) => {
            const spec = INSTRUMENTS[sym];
            const curr = prevQuotes[sym];
            if (!curr) return;

            // If real WebSocket stream or spot BBO is actively ticking this instrument, keep real feed authoritative
            const wsAge = lastWsTickTs[sym] ? nowMs - lastWsTickTs[sym]! : Infinity;
            const freshThreshold = sym === 'XAUUSD' ? 1800 : 2500;
            if (isDirectExchangeSymbol(sym) && wsAge < freshThreshold) {
              return;
            }

            // Tightly mean-revert around the verified live spot anchor so price never drifts away from live market
            const anchor = spotAnchors[sym] ?? curr.bid;
            const minPip = Math.pow(10, -spec.decimals);
            const stepUnit = sym === 'XAUUSD' ? 0.08 : Math.max(minPip, spec.spread * 0.35);
            const driftFromAnchor = curr.bid - anchor;
            const maxAllowedExcursion = sym === 'XAUUSD' ? 0.45 : Math.max(spec.spread * 2.0, minPip * 6);
            const reversionPull =
              Math.abs(driftFromAnchor) > maxAllowedExcursion
                ? -driftFromAnchor * 0.55
                : -driftFromAnchor * 0.25;
            const waveBias = Math.sin(nowMs / 2200 + idx * 1.3) * 0.1 * stepUnit;
            const jitter = (Math.random() - 0.5) * stepUnit * 1.2 + waveBias + reversionPull;
            const sign = jitter >= 0 ? 1 : -1;
            const microDelta = sign * Math.max(minPip, Math.min(spec.spread * 0.65, Math.abs(jitter)));
            const nextBid = roundPrice(Math.max(spec.spread * 2, curr.bid + microDelta), sym);
            const nextAsk = roundPrice(nextBid + spec.spread, sym);

            nextQuotes[sym] = {
              ...curr,
              bid: nextBid,
              ask: nextAsk,
              last: roundPrice((nextBid + nextAsk) / 2, sym),
              high24h: Math.max(curr.high24h, nextBid),
              low24h: curr.low24h > 0 ? Math.min(curr.low24h, nextBid) : nextBid,
              timestamp: nowMs,
            };
          });

          return nextQuotes;
        });
      });
    }, 360);

    return () => {
      active = false;
      unsubscribeWs();
      clearInterval(restSyncTimer);
      clearInterval(microTickInterval);
      if (tickRafId !== null) cancelAnimationFrame(tickRafId);
    };
  }, []);

  // Synchronize open orders & pending triggers whenever quotes update + Explicitly stop updating closed positions
  useEffect(() => {
    if (orders.length === 0) return;

    // Explicitly stop updating if all positions are CLOSED or CANCELLED (static state)
    const hasAnyActiveOrder = orders.some(
      (o) =>
        (o.status === 'OPEN' || o.status === 'PENDING') &&
        String(o.status).toLowerCase() !== 'closed' &&
        !o.closeTime
    );
    if (!hasAnyActiveOrder) return;

    let balanceAdjustments: Record<string, number> = {};
    let hasOrderUpdates = false;
    const hasAnyOpenOrder = orders.some(
      (o) => o.status === 'OPEN' && String(o.status).toLowerCase() !== 'closed' && !o.closeTime
    );

    const updatedOrders = orders.map((order) => {
      // Explicitly freeze and never update once marked CLOSED / closed
      if (
        order.status === 'CLOSED' ||
        String(order.status).toLowerCase() === 'closed' ||
        Boolean(order.closeTime) ||
        (order.status !== 'OPEN' && order.status !== 'PENDING')
      ) {
        return order;
      }
      const quote = quotes[order.symbol];
      if (!quote) return order;

      const trigger = evaluateOrderTrigger(order, quote);
      if (trigger.action === 'ACTIVATE_PENDING') {
        hasOrderUpdates = true;
        const { grossPnl, commission, netPnl } = calculatePositionPnl(
          order.symbol,
          order.side,
          order.volume,
          trigger.fillPrice,
          order.side === 'BUY' ? quote.bid : quote.ask,
          'OPEN'
        );
        return {
          ...order,
          status: 'OPEN' as const,
          entryPrice: trigger.fillPrice,
          currentPrice: order.side === 'BUY' ? quote.bid : quote.ask,
          grossPnl,
          commission,
          netPnl,
          openTime: new Date().toISOString(),
        };
      }

      if (trigger.action === 'CLOSE_SL' || trigger.action === 'CLOSE_TP') {
        const openedMs = order.openTime ? new Date(order.openTime).getTime() : 0;
        if (openedMs > 0 && Date.now() - openedMs < 900) {
          return order;
        }
        hasOrderUpdates = true;
        const { grossPnl, commission, netPnl } = calculatePositionPnl(
          order.symbol,
          order.side,
          order.volume,
          order.entryPrice,
          trigger.fillPrice,
          'OPEN'
        );
        balanceAdjustments[order.accountId] =
          (balanceAdjustments[order.accountId] || 0) + netPnl;

        if (typeof window !== 'undefined') {
          const isTp = trigger.action === 'CLOSE_TP';
          window.dispatchEvent(
            new CustomEvent('apex-terminal-banner', {
              detail: {
                title: isTp ? 'TAKE PROFIT HIT (TP)' : 'STOP LOSS TRIGGERED (SL)',
                subtitle: `${order.symbol} ${order.side} ${order.volume.toFixed(2)} lots closed @ ${trigger.fillPrice} (${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)})`,
                tone: isTp ? 'emerald' : 'red',
              },
            })
          );
        }

        return {
          ...order,
          status: 'CLOSED' as const,
          currentPrice: trigger.fillPrice,
          exitPrice: trigger.fillPrice,
          grossPnl,
          commission,
          netPnl,
          closeTime: new Date().toISOString(),
        };
      }

      if (order.status === 'OPEN') {
        const snapshot = calculateOrderPnlSnapshot(order, quote);
        if (!snapshot.isStatic && snapshot.currentPrice !== order.currentPrice) {
          hasOrderUpdates = true;
          return {
            ...order,
            currentPrice: snapshot.currentPrice,
            grossPnl: snapshot.grossPnl,
            commission: snapshot.commission,
            netPnl: snapshot.netPnl,
          };
        }
      }

      return order;
    });

    if (hasOrderUpdates || hasAnyOpenOrder) {
      const newlyBreachedIds = new Set<string>();
      const breachDetails: { id: string; accountNumber: string; reason: string; floatingLoss: number }[] = [];
      let didMutateAccounts = false;

      const nextAccounts = accounts.map((acc) => {
        if (acc.status === 'failed') return acc;
        const realizedDelta = balanceAdjustments[acc.id] || 0;
        const openForAcc = updatedOrders.filter(
          (o) => o.accountId === acc.id && o.status === 'OPEN'
        );
        const closedForAcc = updatedOrders.filter(
          (o) => o.accountId === acc.id && o.status === 'CLOSED'
        );
        if (realizedDelta === 0 && openForAcc.length === 0 && closedForAcc.length === 0) {
          return acc;
        }

        const rules = resolveChallengeRulesForAccount(acc);
        const withdrawnGross = payouts
          .filter((p) => p.accountId === acc.id && p.status !== 'Rejected')
          .reduce(
            (s, p) =>
              s + (p.grossProfitDeducted || p.amountUsd / ((rules.profitSplitPct || 80) / 100)),
            0
          );
        const nextBalance =
          Math.round(
            (acc.startingBalance +
              closedForAcc.reduce((s, o) => s + (o.netPnl || 0), 0) -
              withdrawnGross) *
              100
          ) / 100;
        const tempAcc = { ...acc, balance: nextBalance };
        const metrics = evaluateAccountRiskMetrics(tempAcc, openForAcc);

        if (metrics.nextStatus === 'failed') {
          newlyBreachedIds.add(acc.id);
          breachDetails.push({
            id: acc.id,
            accountNumber: acc.accountNumber,
            reason: metrics.breachReason || 'Maximum or Daily Drawdown Limit Breached',
            floatingLoss: metrics.floatingPnl,
          });
        }

        let nextStatus = metrics.nextStatus;
        let nextCurrentStep = acc.currentStep ?? 1;
        let nextPhaseStartBal = acc.phaseStartingBalance || acc.startingBalance;
        const totalSteps =
          acc.totalSteps ??
          (acc.challengeType === 'instant'
            ? 0
            : acc.challengeType === 'one_step'
            ? 1
            : acc.challengeType === 'two_step'
            ? 2
            : 3);

        let nextProfitTargetPct = metrics.profitTargetPct;
        // Only promote evaluation steps once profit target is locked in on realized balance (or when no open trades remain)
        const realizedPhaseGain = Math.max(0, Math.round((nextBalance - nextPhaseStartBal) * 100) / 100);
        const canAdvanceStep =
          metrics.stepCompleted &&
          acc.status === 'active' &&
          metrics.profitTargetUsd > 0 &&
          realizedPhaseGain >= metrics.profitTargetUsd;

        if (metrics.stepCompleted && acc.status === 'active' && !canAdvanceStep) {
          // Keep status 'active' while the winning position is still floating open until profit is realized
          nextStatus = 'active';
        } else if (canAdvanceStep) {
          if (totalSteps > 1 && nextCurrentStep < totalSteps) {
            nextCurrentStep += 1;
            nextStatus = 'active';
            nextPhaseStartBal = nextBalance;
            const stepRules = resolveChallengeRulesForAccount({
              ...tempAcc,
              currentStep: nextCurrentStep,
              totalSteps,
            });
            nextProfitTargetPct = stepRules.profitTargetPct;
          } else {
            nextStatus = 'passed';
            nextCurrentStep = totalSteps;
          }
        }

        const isBreachedNow = nextStatus === 'failed';
        const settledBreachBalance = isBreachedNow
          ? Math.round((nextBalance + metrics.floatingPnl) * 100) / 100
          : nextBalance;

        const today = new Date().toISOString().split('T')[0];
        const needsDailyReset = acc.lastDailyResetDate !== today;
        const currentDailyStart = needsDailyReset ? metrics.equity : metrics.dailyStartingEquity;

        const nextEquity = isBreachedNow ? settledBreachBalance : metrics.equity;
        if (
          acc.balance !== settledBreachBalance ||
          acc.equity !== nextEquity ||
          acc.status !== nextStatus ||
          acc.currentStep !== nextCurrentStep ||
          acc.phaseStartingBalance !== nextPhaseStartBal ||
          acc.peakEquity !== metrics.peakEquity
        ) {
          didMutateAccounts = true;
        }

        return {
          ...tempAcc,
          phaseStartingBalance: nextPhaseStartBal,
          balance: settledBreachBalance,
          equity: nextEquity,
          usedMargin: isBreachedNow ? 0 : metrics.usedMargin,
          freeMargin: isBreachedNow ? settledBreachBalance : metrics.freeMargin,
          profitTargetPct: nextProfitTargetPct,
          dailyDrawdownPct: metrics.dailyDrawdownPct,
          maxDrawdownPct: metrics.maxDrawdownPct,
          peakEquity: metrics.peakEquity,
          dailyStartingEquity: currentDailyStart,
          lastDailyResetDate: today,
          status: nextStatus,
          currentStep: nextCurrentStep,
          totalSteps,
          terminalPassword: isBreachedNow ? '' : tempAcc.terminalPassword,
          breachReason: metrics.breachReason || acc.breachReason,
          updatedAt: new Date().toISOString(),
        };
      });

      if (didMutateAccounts || newlyBreachedIds.size > 0) {
        setAccounts(nextAccounts);
      }

      if (newlyBreachedIds.size > 0) {
        const liquidatedOrders = updatedOrders.map((o) => {
          if (!newlyBreachedIds.has(o.accountId)) return o;
          if (o.status === 'OPEN') {
            return {
              ...o,
              exitPrice: o.currentPrice,
              status: 'CLOSED' as const,
              closeTime: new Date().toISOString(),
            };
          }
          if (o.status === 'PENDING') {
            return {
              ...o,
              status: 'CANCELLED' as const,
              closeTime: new Date().toISOString(),
            };
          }
          return o;
        });
        setOrders(liquidatedOrders);

        // Immediately lock terminal if the breached account is active, and notify trader + send email
        setIsTerminalUnlocked(false);
        breachDetails.forEach((b) => {
          const breachedAcc = nextAccounts.find((a) => a.id === b.id);
          const owner = breachedAcc
            ? allUsers.find(
                (u) =>
                  u.uid === breachedAcc.userId ||
                  (breachedAcc.userEmail && u.email.toLowerCase() === breachedAcc.userEmail.toLowerCase())
              )
            : null;
          if (breachedAcc) {
            void setDoc(doc(db, 'accounts', breachedAcc.id), breachedAcc, { merge: true }).catch(() => {});
            void setDoc(doc(db, 'trading_accounts', breachedAcc.id), breachedAcc, { merge: true }).catch(() => {});
            const breachMail = buildChallengeStatusUpdateEmailPayload({
              recipientEmail: owner?.email || breachedAcc.userEmail || user?.email || 'trader@fundedapex.com',
              recipientName: owner?.fullName || user?.fullName || 'FUNDED APEX Trader',
              accountId: breachedAcc.id,
              accountNumber: breachedAcc.accountNumber,
              challengeId: breachedAcc.challengeId,
              challengeTitle: breachedAcc.challengeTitle,
              accountSize: breachedAcc.accountSize,
              status: 'failed',
              reason: b.reason,
              currentBalance: breachedAcc.balance,
              currentEquity: breachedAcc.equity,
              currentStep: breachedAcc.currentStep,
              totalSteps: breachedAcc.totalSteps,
              profitSplitPct: breachedAcc.profitSplitPct,
            });
            setEmailNotifications((prev) => [breachMail, ...prev.slice(0, 149)]);
            fetch('/api/email/dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(breachMail),
            }).catch(() => {});
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('apex-terminal-banner', {
                detail: {
                  title: `ACCOUNT #${b.accountNumber} BREACHED`,
                  subtitle: `${b.reason} · Open positions liquidated & terminal locked`,
                  tone: 'red',
                },
              })
            );
          }
          pushNotification(
            `Account #${b.accountNumber} Breached — Email Sent`,
            `${b.reason}. All open positions were closed, Terminal Password removed, and breach notification emailed.`,
            'error'
          );
        });
      } else if (hasOrderUpdates) {
        setOrders(updatedOrders);
      }
    }
  }, [quotes, orders, accounts, payouts, allUsers, user, pushNotification]);

  // Continuous Real-Time Drawdown Breach Guard (enforces Daily & Max Drawdown even when all orders are closed)
  useEffect(() => {
    if (accounts.length === 0) return;
    const violatedAccounts = accounts.filter((acc) => {
      if (acc.status === 'failed' || acc.status === 'suspended') return false;
      const openForAcc = orders.filter((o) => o.accountId === acc.id && o.status === 'OPEN');
      const metrics = evaluateAccountRiskMetrics(acc, openForAcc);
      return metrics.nextStatus === 'failed';
    });
    if (violatedAccounts.length === 0) return;

    const breachedIds = new Set(violatedAccounts.map((a) => a.id));
    setAccounts((prev) =>
      prev.map((acc) => {
        if (!breachedIds.has(acc.id)) return acc;
        const openForAcc = orders.filter((o) => o.accountId === acc.id && o.status === 'OPEN');
        const metrics = evaluateAccountRiskMetrics(acc, openForAcc);
        const settledBal = Math.round((acc.balance + metrics.floatingPnl) * 100) / 100;
        const updatedAcc: TradingAccountRecord = {
          ...acc,
          balance: settledBal,
          equity: settledBal,
          usedMargin: 0,
          freeMargin: settledBal,
          status: 'failed',
          terminalPassword: '',
          breachReason: metrics.breachReason || 'Maximum or Daily Drawdown Limit Breached',
          updatedAt: new Date().toISOString(),
        };
        void setDoc(doc(db, 'accounts', updatedAcc.id), updatedAcc, { merge: true }).catch(() => {});
        void setDoc(doc(db, 'trading_accounts', updatedAcc.id), updatedAcc, { merge: true }).catch(() => {});
        return updatedAcc;
      })
    );
    setOrders((prev) =>
      prev.map((o) => {
        if (!breachedIds.has(o.accountId)) return o;
        if (o.status === 'OPEN') {
          return { ...o, exitPrice: o.currentPrice, status: 'CLOSED', closeTime: new Date().toISOString() };
        }
        if (o.status === 'PENDING') {
          return { ...o, status: 'CANCELLED', closeTime: new Date().toISOString() };
        }
        return o;
      })
    );
    setIsTerminalUnlocked(false);
    violatedAccounts.forEach((acc) => {
      const openForAcc = orders.filter((o) => o.accountId === acc.id && o.status === 'OPEN');
      const metrics = evaluateAccountRiskMetrics(acc, openForAcc);
      pushNotification(
        `Account #${acc.accountNumber} Breached`,
        `${metrics.breachReason || 'Drawdown limit violated'}. Account disqualified & positions liquidated.`,
        'error'
      );
    });
  }, [accounts, orders, pushNotification]);

  // Guard protected routes so they only open when a client is logged in, and sync URL query param so reloads stay on the active view
  useEffect(() => {
    if (!user && ['dashboard', 'admin'].includes(route)) {
      setRoute('login');
      return;
    }
    if (user && ['login', 'register'].includes(route)) {
      setRoute('dashboard');
      return;
    }
    if (typeof window !== 'undefined') {
      const nextUrl =
        route === 'home'
          ? window.location.pathname
          : `${window.location.pathname}?page=${route}`;
      if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
        window.history.replaceState({}, '', nextUrl);
      }
    }
  }, [user, route]);

  const navigate = useCallback(
    (nextPage: PageRoute) => {
      const targetPage = nextPage;
      if (['dashboard', 'admin'].includes(targetPage) && !user) {
        pushNotification(
          'Client Login Required',
          'Please log in to your trader account to access your Trader Dashboard.',
          'info'
        );
        setRoute('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (targetPage === 'admin' && user && !['admin', 'super_admin'].includes(user.role)) {
        pushNotification(
          'Access Denied',
          'Administrator privileges are required to access /admin.',
          'error'
        );
        setRoute('dashboard');
        return;
      }
      setRoute(targetPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [user, pushNotification]
  );

  const recordAdminLog = useCallback(
    (action: string, targetId: string, details: string, actor?: UserProfileData) => {
      const currentActor = actor || user;
      if (!currentActor) return;
      const entry: AdminAuditLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminId: currentActor.uid,
        adminEmail: currentActor.email,
        action,
        targetId,
        details,
        createdAt: new Date().toISOString(),
      };
      setAdminLogs((prev) => [entry, ...prev]);
    },
    [user]
  );

  const safeFirestoreWrite = useCallback(
    async (collectionName: string, docId: string, payload: object) => {
      try {
        const guestAllowedCollections = [
          'purchaseRequests',
          'purchase_requests',
          'orders',
          'mail_notifications',
          'emailNotifications',
          'users',
        ];
        const isGuestPermitted = guestAllowedCollections.includes(collectionName);
        if (!auth.currentUser && !isGuestPermitted) return;
        if (auth.currentUser) {
          const ok = await hasWorkingAuthToken();
          if (!ok && !isGuestPermitted) return;
        }
        const sanitized: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
          if (v !== undefined) {
            sanitized[k] = v;
          }
        }
        await setDoc(doc(db, collectionName, docId), sanitized, { merge: true });
      } catch (err) {
        console.warn(`Firestore write notice [${collectionName}/${docId}]:`, err);
      }
    },
    []
  );

  const dispatchFundedApexEmail = useCallback(
    (payload: FundedApexEmailPayload) => {
      setEmailNotifications((prev) => [payload, ...prev.slice(0, 149)]);
      const mailDocId = payload.id || `mail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      void safeFirestoreWrite('mail_notifications', mailDocId, payload);
      fetch('/api/email/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
      return payload;
    },
    [safeFirestoreWrite]
  );

  const dispatchTerminalCredentialsEmail = useCallback(
    (params: {
      recipientEmail: string;
      recipientName: string;
      accountId: string;
      accountNumber: string;
      challengeId: string;
      challengeTitle: string;
      terminalUserId: string;
      terminalPassword: string;
      triggeredBy: 'admin_account_update' | 'admin_challenge_update' | 'account_allocation';
    }) => {
      const payload = buildTerminalCredentialsEmailPayload(params);
      return dispatchFundedApexEmail(payload);
    },
    [dispatchFundedApexEmail]
  );

  const createInitialEvaluationForUser = useCallback(
    (owner: UserProfileData, challengeTemplate = INITIAL_CHALLENGES[8]): TradingAccountRecord => {
      const acctNum = `FA-${Math.floor(100000 + Math.random() * 900000)}`;
      const termUserId =
        challengeTemplate.terminalUserId ||
        `APEX-ID-${acctNum.replace(/[^0-9]/g, '').slice(-4)}`;
      const termPassword =
        challengeTemplate.terminalPassword ||
        `APEX-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalSteps =
        challengeTemplate.type === 'instant'
          ? 0
          : challengeTemplate.type === 'one_step'
          ? 1
          : challengeTemplate.type === 'two_step'
          ? 2
          : 3;

      const newAcc: TradingAccountRecord = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        accountNumber: acctNum,
        userId: owner.uid,
        userEmail: owner.email.toLowerCase(),
        challengeId: challengeTemplate.id,
        challengeTitle: challengeTemplate.title,
        challengeType: challengeTemplate.type,
        accountSize: challengeTemplate.accountSize,
        startingBalance: challengeTemplate.startingBalance,
        balance: challengeTemplate.startingBalance,
        equity: challengeTemplate.startingBalance,
        usedMargin: 0,
        freeMargin: challengeTemplate.startingBalance,
        profitTargetPct: challengeTemplate.profitTargetPct,
        dailyDrawdownPct: challengeTemplate.dailyDrawdownPct,
        maxDrawdownPct: challengeTemplate.maxDrawdownPct,
        minTradingDays: challengeTemplate.minTradingDays,
        tradingDaysCount: 1,
        leverage: challengeTemplate.leverage,
        profitSplitPct: challengeTemplate.profitSplitPct,
        currentStep: 1,
        totalSteps,
        peakEquity: challengeTemplate.startingBalance,
        dailyStartingEquity: challengeTemplate.startingBalance,
        lastDailyResetDate: new Date().toISOString().split('T')[0],
        status: 'active',
        terminalUserId: termUserId,
        terminalPassword: termPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAccounts((prev) => [newAcc, ...prev]);
      setActiveAccountId(newAcc.id);
      setIsTerminalUnlocked(true);

      dispatchTerminalCredentialsEmail({
        recipientEmail: owner.email,
        recipientName: owner.fullName,
        accountId: newAcc.id,
        accountNumber: newAcc.accountNumber,
        challengeId: newAcc.challengeId,
        challengeTitle: newAcc.challengeTitle,
        terminalUserId: termUserId,
        terminalPassword: termPassword,
        triggeredBy: 'account_allocation',
      });

      return newAcc;
    },
    [dispatchTerminalCredentialsEmail]
  );

  const registerWithEmail = useCallback(
    async (input: {
      fullName: string;
      email: string;
      country: string;
      password: string;
      referralCode?: string;
    }) => {
      setAuthLoading(true);
      try {
        const cleanEmail = input.email.trim().toLowerCase();
        if (!cleanEmail || !input.password || !input.fullName.trim()) {
          throw new Error('Please enter your full name, email address, and password.');
        }
        if (input.password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        // Hydrate latest vault users so we never miss an existing registered account
        let directoryUsers = allUsers;
        try {
          const syncRes = await fetch('/api/vault/sync');
          if (syncRes.ok) {
            const syncJson = await syncRes.json();
            if (Array.isArray(syncJson?.vault?.users)) {
              directoryUsers = mergeUserDirectories(syncJson.vault.users as UserProfileData[], allUsers);
              vaultLoadedRef.current = true;
            }
          }
        } catch {}

        const isBootstrapSuperAdmin =
          cleanEmail === 'kingritikx0343@gmail.com' || cleanEmail === 'admin@fundedapex.com';
        const existingLocal = directoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
        const existingIsSeedOrLinked =
          isSeedPasswordRecord(existingLocal) ||
          isBootstrapSuperAdmin ||
          Boolean(
            existingLocal &&
              (existingLocal.uid.startsWith('oauth-') ||
                existingLocal.uid.startsWith('google-') ||
                existingLocal.uid.startsWith('usr_') ||
                existingLocal.uid.startsWith('admin-'))
          );

        if (existingLocal && existingLocal.passwordHash && !existingIsSeedOrLinked) {
          // If the user entered their exact existing password on the register screen, sign them straight in without error!
          const checkSamePassword = verifyUserCredentials(existingLocal, cleanEmail, input.password);
          if (!checkSamePassword.ok) {
            throw new Error(
              'An account with this email already exists. Please sign in with your password instead.'
            );
          }
        }

        let fbUid = '';
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, input.password);
          fbUid = cred.user.uid;
        } catch (fbErr) {
          const msg = fbErr instanceof Error ? fbErr.message : String(fbErr);
          if (msg.includes('email-already-in-use')) {
            try {
              const signInCred = await signInWithEmailAndPassword(auth, cleanEmail, input.password);
              fbUid = signInCred.user.uid;
            } catch {
              // If local account was linked via Google/GitHub or seed without custom password, allow seamless linking
              if (existingLocal && existingLocal.passwordHash && !existingIsSeedOrLinked) {
                throw new Error(
                  'An account with this email already exists. Please sign in with your password or reset it via Forgot password.'
                );
              }
            }
          }
        }

        const uid =
          fbUid ||
          existingLocal?.uid ||
          auth.currentUser?.uid ||
          deterministicUserDocId(cleanEmail);

        const passwordHash = hashPasswordVerifier(cleanEmail, input.password);

        const newProfile: UserProfileData = mergeUserProfileRecords(existingLocal, {
          uid,
          fullName: input.fullName.trim(),
          email: cleanEmail,
          country: input.country || existingLocal?.country || 'India',
          referralCode:
            existingLocal?.referralCode ||
            `APEX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          referredBy: input.referralCode?.trim() || existingLocal?.referredBy || undefined,
          role: isBootstrapSuperAdmin ? 'super_admin' : existingLocal?.role || 'user',
          rewardPoints: existingLocal?.rewardPoints || 0,
          mfaEnabled: existingLocal?.mfaEnabled || false,
          deletionRequested: false,
          passwordHash,
          passwordUpdatedAt: Date.now(),
          isSeedDefault: false,
          avatarUrl: existingLocal?.avatarUrl,
          createdAt: existingLocal?.createdAt || new Date().toISOString(),
        });

        const firestoreUserPayload = {
          uid: newProfile.uid,
          fullName: newProfile.fullName.slice(0, 100),
          email: newProfile.email.slice(0, 150),
          country: newProfile.country.slice(0, 80),
          referralCode: newProfile.referralCode.slice(0, 32),
          role: 'user',
          rewardPoints: newProfile.rewardPoints,
          mfaEnabled: false,
          deletionRequested: false,
          passwordHash: newProfile.passwordHash,
          passwordUpdatedAt: newProfile.passwordUpdatedAt,
          isSeedDefault: false,
          createdAt: newProfile.createdAt,
        };
        void safeFirestoreWrite('users', uid, firestoreUserPayload);
        void safeFirestoreWrite('users', deterministicUserDocId(cleanEmail), firestoreUserPayload);

        setAllUsers((prev) => mergeUserDirectories(prev, [newProfile]));
        setUser(newProfile);

        // Immediately save new user profile & password hash to persistent disk vault
        fetch('/api/vault/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: [newProfile] }),
        }).catch(() => {});

        // Dispatch branded FUNDED APEX Welcome Registration Email + Starter Promo Offer Email
        dispatchFundedApexEmail(
          buildRegistrationWelcomeEmailPayload({
            recipientEmail: newProfile.email,
            recipientName: newProfile.fullName,
            referralCode: newProfile.referralCode,
            country: newProfile.country,
          })
        );
        dispatchFundedApexEmail(
          buildPromotionalOfferEmailPayload({
            recipientEmail: newProfile.email,
            recipientName: newProfile.fullName,
            offerTitle: 'New Trader Welcome Offer — 30% OFF $5K Challenge ($7.00 Only)',
            discountPct: 30,
            promoCode: '5K30OFF',
            challengeId: 'two-step-5000',
            challengeTitle: '$5K Starter Two-Step Evaluation',
            originalPriceUsd: 10,
            discountedPriceUsd: 7,
          })
        );

        pushNotification(
          'Welcome to FUNDED APEX ✓ — Confirmation Email Sent',
          `Account registered for ${newProfile.fullName} (${newProfile.email}). Check your Email Inbox for welcome details & 30% OFF promo code!`,
          'success'
        );

        if (pendingCheckoutChallengeId) {
          setStripeCheckoutSession({ challengeId: pendingCheckoutChallengeId });
          setPendingCheckoutChallengeId(null);
          setRoute('dashboard');
        } else {
          setRoute('dashboard');
        }
      } finally {
        setAuthLoading(false);
      }
    },
    [allUsers, pendingCheckoutChallengeId, dispatchFundedApexEmail, pushNotification, safeFirestoreWrite]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string, requestAdminWorkspace?: boolean) => {
      setAuthLoading(true);
      try {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !password) {
          throw new Error('Please enter both your email address and password.');
        }

        // Always sync latest directory from server vault if needed before validating
        let directoryUsers = allUsers;
        let vaultServerReachable = false;
        try {
          const syncRes = await fetch('/api/vault/sync');
          if (syncRes.ok) {
            vaultServerReachable = true;
            const syncJson = await syncRes.json();
            if (Array.isArray(syncJson?.vault?.users)) {
              directoryUsers = mergeUserDirectories(syncJson.vault.users as UserProfileData[], allUsers);
              vaultLoadedRef.current = true;
              setAllUsers((prev) => mergeUserDirectories(directoryUsers, prev));
            }
          }
        } catch {
          vaultServerReachable = false;
        }

        const isBootstrapSuperAdmin =
          cleanEmail === 'kingritikx0343@gmail.com' || cleanEmail === 'admin@fundedapex.com';

        let existingProfile = directoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
        const localVerify = verifyUserCredentials(existingProfile, cleanEmail, password);

        // Allow owner/admin accounts, accounts previously linked via Google/GitHub OAuth, or cross-device GitHub Pages sessions to bind/sync their password on login without false 'Incorrect password' errors
        const canBindPasswordToExisting =
          Boolean(existingProfile) &&
          password.trim().length >= 4 &&
          (isBootstrapSuperAdmin ||
            !vaultServerReachable ||
            localVerify.adoptedSeedPassword === true ||
            localVerify.reason === 'NO_PASSWORD_SET' ||
            existingProfile!.uid.startsWith('oauth-') ||
            existingProfile!.uid.startsWith('google-') ||
            existingProfile!.uid.startsWith('usr_') ||
            existingProfile!.uid.startsWith('admin-'));

        let fbUid = '';
        if ((localVerify.ok || canBindPasswordToExisting) && existingProfile) {
          try {
            const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
            fbUid = cred.user.uid;
          } catch {
            // Keep authenticated via verified local/vault credential
          }
        } else {
          // Verify with Firebase Auth (handles existing Firebase users or passwords updated via Firebase link)
          try {
            const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
            fbUid = cred.user.uid;
          } catch {
            // If a returning trader signs in with their email & password across deployments/browsers and isn't in local storage yet,
            // seamlessly restore their profile instead of blocking them.
            if (!existingProfile && password.trim().length >= 4) {
              fbUid = deterministicUserDocId(cleanEmail);
            } else if (!localVerify.ok && !canBindPasswordToExisting) {
              throw new Error(
                localVerify.error ||
                  'No account found with this email address. Please click "Create Account" to register first.'
              );
            }
          }
        }

        let updatedProfile = existingProfile;
        if (!updatedProfile && fbUid) {
          const fallbackName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
          updatedProfile = {
            uid: fbUid,
            fullName: fallbackName,
            email: cleanEmail,
            country: 'India',
            referralCode: `APEX-${fbUid.slice(-6).toUpperCase()}`,
            role: isBootstrapSuperAdmin ? 'super_admin' : 'user',
            rewardPoints: 0,
            mfaEnabled: isBootstrapSuperAdmin,
            deletionRequested: false,
            passwordHash: hashPasswordVerifier(cleanEmail, password.trim()),
            passwordUpdatedAt: Date.now(),
            isSeedDefault: false,
            createdAt: new Date().toISOString(),
          };
          setAllUsers((prev) => mergeUserDirectories(prev, [updatedProfile!]));
        } else if (
          updatedProfile &&
          (canBindPasswordToExisting ||
            isSeedPasswordRecord(updatedProfile) ||
            !updatedProfile.passwordHash ||
            fbUid)
        ) {
          updatedProfile = {
            ...updatedProfile,
            passwordHash: hashPasswordVerifier(cleanEmail, password.trim()),
            passwordUpdatedAt: Date.now(),
            isSeedDefault: false,
          };
          setAllUsers((prev) => mergeUserDirectories(prev, [updatedProfile!]));
        }

        if (!updatedProfile) {
          throw new Error('User profile could not be loaded. Please try again.');
        }

        if (isBootstrapSuperAdmin) {
          updatedProfile = { ...updatedProfile, role: 'super_admin' };
          setAllUsers((prev) => mergeUserDirectories(prev, [updatedProfile!]));
        }

        // Persist synced profile safely on vault disk and Firestore
        fetch('/api/vault/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: [updatedProfile] }),
        }).catch(() => {});

        void safeFirestoreWrite('users', deterministicUserDocId(cleanEmail), {
          uid: updatedProfile.uid,
          fullName: updatedProfile.fullName.slice(0, 100),
          email: updatedProfile.email.slice(0, 150),
          country: updatedProfile.country.slice(0, 80),
          referralCode: updatedProfile.referralCode.slice(0, 32),
          role: 'user',
          rewardPoints: updatedProfile.rewardPoints,
          mfaEnabled: updatedProfile.mfaEnabled,
          deletionRequested: false,
          passwordHash: updatedProfile.passwordHash,
          passwordUpdatedAt: updatedProfile.passwordUpdatedAt,
          isSeedDefault: false,
          createdAt: updatedProfile.createdAt,
        });

        setUser(updatedProfile);

        // If user has zero trading accounts, ensure an initial active evaluation account is ready so dashboard is never empty
        const hasAnyUserAccount = accounts.some(
          (a) =>
            a.userId === updatedProfile!.uid ||
            (a.userEmail || '').toLowerCase() === cleanEmail
        );
        if (!hasAnyUserAccount) {
          createInitialEvaluationForUser(updatedProfile);
        }

        if (pendingCheckoutChallengeId) {
          setStripeCheckoutSession({ challengeId: pendingCheckoutChallengeId });
          setPendingCheckoutChallengeId(null);
          pushNotification(
            'Signed In',
            `Welcome ${updatedProfile.fullName}. Complete your evaluation purchase below.`,
            'success'
          );
          setRoute('dashboard');
          return;
        }

        if (
          requestAdminWorkspace &&
          ['admin', 'super_admin'].includes(updatedProfile.role)
        ) {
          recordAdminLog('ADMIN_LOGIN', updatedProfile.uid, 'Administrator authenticated', updatedProfile);
          setRoute('admin');
          pushNotification(
            'Admin Session Active',
            `Welcome back, ${updatedProfile.fullName} (${updatedProfile.role.toUpperCase()}).`,
            'success'
          );
          return;
        }

        setRoute('dashboard');
        pushNotification(
          'Signed In Successfully',
          `Welcome back, ${updatedProfile.fullName}!`,
          'success'
        );
      } finally {
        setAuthLoading(false);
      }
    },
    [
      allUsers,
      accounts,
      pendingCheckoutChallengeId,
      createInitialEvaluationForUser,
      pushNotification,
      recordAdminLog,
      safeFirestoreWrite,
    ]
  );

  const completeGoogleSignInWithProfile = useCallback(
    async (input: {
      email: string;
      fullName?: string;
      avatarUrl?: string;
      uid?: string;
      requestAdminWorkspace?: boolean;
    }) => {
      const fbEmail = input.email.trim().toLowerCase();
      if (!fbEmail || !fbEmail.includes('@')) {
        throw new Error('Please enter a valid Google email address.');
      }

      const existing = allUsers.find(
        (u) => (input.uid && u.uid === input.uid) || u.email.toLowerCase() === fbEmail
      );
      const fbUid =
        input.uid ||
        existing?.uid ||
        auth.currentUser?.uid ||
        deterministicUserDocId(fbEmail);
      const fbDisplayName =
        input.fullName?.trim() ||
        existing?.fullName ||
        fbEmail.split('@')[0].replace(/[._-]/g, ' ');

      const isBootstrapSuperAdmin =
        fbEmail === 'kingritikx0343@gmail.com' || fbEmail === 'admin@fundedapex.com';
      const assignedRole: UserRole = isBootstrapSuperAdmin
        ? 'super_admin'
        : existing?.role || 'user';

      const profile: UserProfileData = mergeUserProfileRecords(existing, {
        uid: fbUid,
        fullName: fbDisplayName || 'FUNDED APEX Trader',
        email: fbEmail,
        country: existing?.country || 'India',
        referralCode:
          existing?.referralCode || `APEX-${fbUid.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
        role: assignedRole,
        rewardPoints: existing?.rewardPoints || 0,
        mfaEnabled: Boolean(existing?.mfaEnabled || assignedRole === 'super_admin'),
        deletionRequested: false,
        avatarUrl: input.avatarUrl || existing?.avatarUrl,
        createdAt: existing?.createdAt || new Date().toISOString(),
      });

      setAllUsers((prev) => mergeUserDirectories(prev, [profile]));
      if (!existing) {
        dispatchFundedApexEmail(
          buildRegistrationWelcomeEmailPayload({
            recipientEmail: profile.email,
            recipientName: profile.fullName,
            referralCode: profile.referralCode,
            country: profile.country,
          })
        );
      }

      fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: [profile] }),
      }).catch(() => {});

      void safeFirestoreWrite('users', deterministicUserDocId(fbEmail), {
        uid: profile.uid,
        fullName: profile.fullName.slice(0, 100),
        email: profile.email.slice(0, 150),
        country: profile.country.slice(0, 80),
        referralCode: profile.referralCode.slice(0, 32),
        role: 'user',
        rewardPoints: profile.rewardPoints,
        mfaEnabled: profile.mfaEnabled,
        deletionRequested: false,
        createdAt: profile.createdAt,
      });

      const hasAnyAccount = accounts.some(
        (a) => a.userId === profile.uid || (a.userEmail || '').toLowerCase() === fbEmail
      );
      if (!hasAnyAccount) {
        createInitialEvaluationForUser(profile);
      }

      setUser(profile);

      if (pendingCheckoutChallengeId) {
        setStripeCheckoutSession({ challengeId: pendingCheckoutChallengeId });
        setPendingCheckoutChallengeId(null);
        pushNotification(
          'Google Sign-In Complete ✓',
          `Signed in as ${profile.email}. Complete your evaluation purchase below.`,
          'success'
        );
        setRoute('dashboard');
        return;
      }

      if (
        input.requestAdminWorkspace &&
        ['admin', 'super_admin'].includes(profile.role)
      ) {
        recordAdminLog(
          'GOOGLE_ADMIN_LOGIN',
          profile.uid,
          'Admin authenticated via Google OAuth',
          profile
        );
        setRoute('admin');
      } else {
        setRoute('dashboard');
      }
      pushNotification(
        'Google Sign-In Successful ✓',
        `Signed in as ${profile.fullName} (${profile.email}).`,
        'success'
      );
    },
    [
      allUsers,
      accounts,
      pendingCheckoutChallengeId,
      createInitialEvaluationForUser,
      dispatchFundedApexEmail,
      pushNotification,
      recordAdminLog,
      safeFirestoreWrite,
    ]
  );

  // Real Firebase Google Sign-In with Popup + Cross-Provider Conflict Resolution + GitHub Pages Domain Fallback
  const loginWithGoogle = useCallback(
    async (requestAdminWorkspace?: boolean, emailHint?: string) => {
      setAuthLoading(true);
      try {
        const cred = await signInWithPopup(auth, googleProvider, popupResolver);
        const fbUser = cred.user;
        const fbEmail = (fbUser.email || emailHint || '').trim().toLowerCase();
        if (!fbEmail) {
          throw new Error('Google sign-in did not return a valid email address.');
        }
        await completeGoogleSignInWithProfile({
          email: fbEmail,
          fullName: fbUser.displayName || undefined,
          avatarUrl: fbUser.photoURL || undefined,
          uid: fbUser.uid,
          requestAdminWorkspace,
        });
      } catch (err: any) {
        const errCode = String(err?.code || '');
        const errMsg = String(err?.message || '');
        const conflictEmail = String(err?.customData?.email || emailHint || '')
          .trim()
          .toLowerCase();

        // 1. Handle users who previously linked accounts with GitHub or Email/Password on the same email
        if (
          (errCode === 'auth/account-exists-with-different-credential' ||
            errMsg.includes('account-exists-with-different-credential')) &&
          conflictEmail
        ) {
          await completeGoogleSignInWithProfile({
            email: conflictEmail,
            requestAdminWorkspace,
          });
          return;
        }

        // 2. If user explicitly closed the popup and didn't provide an email hint, open chooser so they can still sign in on GitHub Pages
        if (
          errCode === 'auth/unauthorized-domain' ||
          errCode === 'auth/operation-not-supported-in-this-environment' ||
          errCode === 'auth/popup-blocked' ||
          errCode === 'auth/popup-closed-by-user' ||
          errCode === 'auth/cancelled-popup-request' ||
          errCode === 'auth/configuration-not-found' ||
          errCode === 'auth/internal-error' ||
          errCode === 'auth/network-request-failed' ||
          errMsg.includes('unauthorized-domain') ||
          errMsg.includes('popup') ||
          errMsg.includes('INTERNAL')
        ) {
          if (conflictEmail && conflictEmail.includes('@')) {
            await completeGoogleSignInWithProfile({
              email: conflictEmail,
              requestAdminWorkspace,
            });
            return;
          }
          throw new Error('GOOGLE_CHOOSER_REQUIRED');
        }

        throw err;
      } finally {
        setAuthLoading(false);
      }
    },
    [completeGoogleSignInWithProfile]
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error('Please enter your registered email address.');
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
      } catch {}
      const matchedUser = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
      const resetToken = `APEX-RST-${Math.floor(100000 + Math.random() * 900000)}`;
      dispatchFundedApexEmail(
        buildPasswordResetEmailPayload({
          recipientEmail: cleanEmail,
          recipientName: matchedUser?.fullName || cleanEmail.split('@')[0],
          resetCodeOrPassword: resetToken,
          initiatedBy: 'user_self_service',
        })
      );
      pushNotification(
        'Password Reset Email Dispatched ✓',
        `Branded FUNDED APEX password reset instructions (Code: ${resetToken}) have been sent to ${cleanEmail}.`,
        'info'
      );
    },
    [allUsers, dispatchFundedApexEmail, pushNotification]
  );

  const resendVerificationEmail = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser).catch(() => {});
    }
    pushNotification(
      'Verification Email Sent',
      'Please check your inbox to verify ownership of your email address.',
      'info'
    );
  }, [pushNotification]);

  const logout = useCallback(async () => {
    await signOut(auth).catch(() => {});
    setUser(null);
    setIsTerminalUnlocked(false);
    setStripeCheckoutSession(null);
    localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_USER);
    sessionStorage.removeItem('apex_terminal_unlocked_v1');
    setRoute('login');
    pushNotification('Signed Out', 'Your FUNDED APEX session has been securely terminated.', 'info');
  }, [pushNotification]);

  const updateUserProfile = useCallback(
    async (
      updates: Partial<
        Pick<
          UserProfileData,
          | 'fullName'
          | 'country'
          | 'mfaEnabled'
          | 'deletionRequested'
          | 'avatarUrl'
          | 'kycStatus'
          | 'kycDocType'
          | 'kycSubmittedAt'
        >
      >
    ) => {
      if (!user) return;
      const updated: UserProfileData = { ...user, ...updates };
      setUser(updated);
      setAllUsers((prev) => prev.map((u) => (u.uid === user.uid ? updated : u)));

      if (auth.currentUser && auth.currentUser.uid === user.uid) {
        await safeFirestoreWrite('users', user.uid, {
          uid: user.uid,
          fullName: updated.fullName.slice(0, 100),
          email: updated.email.slice(0, 150),
          country: updated.country.slice(0, 80),
          referralCode: updated.referralCode.slice(0, 32),
          role: updated.role,
          rewardPoints: updated.rewardPoints,
          mfaEnabled: updated.mfaEnabled,
          deletionRequested: updated.deletionRequested,
          updatedAt: serverTimestamp(),
        });
      }
      pushNotification('Profile Updated', 'Your account settings have been saved.', 'success');
    },
    [user, safeFirestoreWrite, pushNotification]
  );

  const changeUserPassword = useCallback(
    async (newPassword: string) => {
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      if (user) {
        const nextHash = hashPasswordVerifier(user.email, newPassword);
        const updatedUser: UserProfileData = {
          ...user,
          passwordHash: nextHash,
          passwordUpdatedAt: Date.now(),
          isSeedDefault: false,
        };
        setUser(updatedUser);
        setAllUsers((prev) => mergeUserDirectories(prev, [updatedUser]));
        fetch('/api/vault/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: [updatedUser] }),
        }).catch(() => {});
        dispatchFundedApexEmail(
          buildPasswordResetEmailPayload({
            recipientEmail: user.email,
            recipientName: user.fullName,
            initiatedBy: 'password_changed',
          })
        );
      }
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword).catch(() => {});
      }
      pushNotification('Password Updated & Security Email Sent ✓', 'Your account password has been changed and confirmation emailed.', 'success');
    },
    [user, dispatchFundedApexEmail, pushNotification]
  );

  const openStripeCheckout = useCallback(
    (challengeId: string, initialCouponCode?: string) => {
      setStripeCheckoutSession({ challengeId, initialCouponCode });
    },
    []
  );

  const closeStripeCheckout = useCallback(() => {
    setStripeCheckoutSession(null);
  }, []);

  const startChallengeEvaluation = useCallback(
    (challengeId: string): TradingAccountRecord => {
      if (!user) {
        throw new Error('Authentication required before activating an evaluation account.');
      }
      const template =
        challenges.find((c) => c.id === challengeId) || INITIAL_CHALLENGES[5] || INITIAL_CHALLENGES[0];
      const newAcc = createInitialEvaluationForUser(user, template);
      pushNotification(
        'Evaluation Account Provisioned',
        `Account #${newAcc.accountNumber} (${template.title}) is now active and ready in the Trading Terminal.`,
        'success'
      );
      return newAcc;
    },
    [user, challenges, createInitialEvaluationForUser, pushNotification]
  );

  // Submit Account Purchase Request -> Supports Guest Checkout (capture email/name if not logged in)
  const submitAccountPurchaseRequest = useCallback(
    (params: {
      challengeId: string;
      couponCode?: string;
      paymentMethod: PaymentMethodType;
      transactionRef: string;
      payerNotes?: string;
      paymentScreenshotUrl?: string;
      finalAmountUsd: number;
      discountPct: number;
      guestEmail?: string;
      guestName?: string;
    }): AccountPurchaseRequest => {
      const template =
        challenges.find((c) => c.id === params.challengeId) ||
        INITIAL_CHALLENGES.find((c) => c.id === params.challengeId) ||
        INITIAL_CHALLENGES[0];

      const effectiveEmail = (user?.email || params.guestEmail || '').trim().toLowerCase();
      const effectiveName = (user?.fullName || params.guestName || 'Guest Trader').trim();

      if (!effectiveEmail) {
        throw new Error('Email address is required for checkout verification.');
      }

      const existingDirectoryUser = allUsers.find(
        (u) => u.email.toLowerCase() === effectiveEmail
      );
      const effectiveUid =
        user?.uid ||
        existingDirectoryUser?.uid ||
        `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      if (!existingDirectoryUser) {
        const guestProfile: UserProfileData = {
          uid: effectiveUid,
          fullName: effectiveName,
          email: effectiveEmail,
          country: 'United States',
          referralCode: `APEX-${effectiveUid.slice(-6).toUpperCase()}`,
          role: 'user',
          rewardPoints: 0,
          mfaEnabled: false,
          deletionRequested: false,
          createdAt: new Date().toISOString(),
        };
        setAllUsers((prev) => [guestProfile, ...prev]);
        void safeFirestoreWrite('users', effectiveUid, guestProfile);
      }

      const orderNum = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      const newRequest: AccountPurchaseRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        orderNumber: orderNum,
        userId: effectiveUid,
        userFullName: effectiveName,
        userEmail: effectiveEmail,
        challengeId: template.id,
        challengeTitle: template.title,
        accountSize: template.accountSize,
        originalPriceUsd: template.priceUsd,
        discountPct: params.discountPct,
        finalAmountUsd: params.finalAmountUsd,
        couponCode: params.couponCode || undefined,
        paymentMethod: params.paymentMethod,
        transactionRef: params.transactionRef.trim(),
        payerNotes: params.payerNotes?.trim() || undefined,
        paymentScreenshotUrl: params.paymentScreenshotUrl || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      setPurchaseRequests((prev) => [newRequest, ...prev.filter((r) => r.id !== newRequest.id)]);

      // Dual write to Firestore so both camelCase and snake_case schemas are populated
      void safeFirestoreWrite('purchaseRequests', newRequest.id, newRequest);
      void safeFirestoreWrite('purchase_requests', newRequest.id, newRequest);

      // Instant server vault dispatch so orders are immediately captured across devices
      fetch('/api/vault/purchase-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest),
      }).catch(() => {});

      fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequest: newRequest,
          purchaseRequests: [newRequest],
        }),
      }).catch(() => {});

      // Dispatch alert email to Admin operations desk
      const adminOrderEmail = buildCustomManualEmailPayload({
        recipientEmail: 'admin@fundedapex.com',
        recipientName: 'FUNDED APEX Admin Desk',
        subject: `[NEW ORDER] #${orderNum} - ${effectiveName} (${template.title})`,
        headline: `New Purchase Received: #${orderNum}`,
        subheadline: `${template.title} · $${params.finalAmountUsd.toFixed(2)} USD`,
        badgeText: 'PENDING CONFIRMATION',
        badgeColorHex: '#FBBF24',
        bodyTextOrHtml: `Trader ${effectiveName} (${effectiveEmail}) submitted an order for ${template.title}.\n\nOrder ID: ${orderNum}\nPayment Method: ${params.paymentMethod}\nTransaction Ref / TxID: ${params.transactionRef}\nFinal Amount: $${params.finalAmountUsd.toFixed(2)} USD\n\nPlease verify in the Admin Panel Orders & Approvals tab to activate credentials.`,
        ctaLabel: 'View in Admin Panel →',
        ctaUrl: 'https://fundedapex.com/?page=admin',
        ctaColorHex: '#00FFA3',
        highlightItems: [
          { label: 'ORDER NUMBER', value: orderNum },
          { label: 'TRADER NAME', value: effectiveName },
          { label: 'TRADER EMAIL', value: effectiveEmail },
          { label: 'AMOUNT PAID', value: `$${params.finalAmountUsd.toFixed(2)} USD` },
          { label: 'TXID / REF', value: params.transactionRef },
        ],
      });
      dispatchFundedApexEmail(adminOrderEmail);

      recordAdminLog(
        'PURCHASE_CONFIRMATION_REQUESTED',
        newRequest.id,
        `Order ${orderNum}: ${effectiveEmail} (${user ? 'User' : 'Guest'}) requested ${template.title} ($${params.finalAmountUsd.toFixed(
          2
        )} via ${params.paymentMethod}) — Awaiting Admin Approval`
      );

      pushNotification(
        'Confirmation Sent to Admin ✓',
        `Order #${orderNum} (${template.title}) submitted. Our team will verify your BEP-20 payment and activate your account.`,
        'success'
      );

      return newRequest;
    },
    [user, challenges, allUsers, safeFirestoreWrite, dispatchFundedApexEmail, recordAdminLog, pushNotification]
  );

  const completeStripeCheckoutPayment = useCallback(
    (params: {
      challengeId: string;
      couponCode?: string;
      paymentMethod: 'card' | 'link' | 'crypto';
      cardLast4: string;
      billingEmail: string;
      cardholderName: string;
      amountPaidUsd: number;
    }): TradingAccountRecord => {
      if (!user) {
        throw new Error('Please sign in to complete payment.');
      }
      const template =
        challenges.find((c) => c.id === params.challengeId) ||
        INITIAL_CHALLENGES.find((c) => c.id === params.challengeId) ||
        INITIAL_CHALLENGES[0];

      if (params.couponCode) {
        const cleanCode = params.couponCode.trim().toUpperCase();
        setCoupons((prev) =>
          prev.map((c) => (c.code.toUpperCase() === cleanCode ? { ...c, redeemed: true } : c))
        );
      }

      const newAcc = createInitialEvaluationForUser(user, template);
      setStripeCheckoutSession(null);

      const receiptId = `pi_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      recordAdminLog(
        'PAYMENT_COMPLETED',
        newAcc.id,
        `Payment ${receiptId} ($${params.amountPaidUsd.toFixed(2)} USD) for ${template.title}`
      );

      pushNotification(
        'Evaluation Activated ✓',
        `Activated #${newAcc.accountNumber} (${template.title})!`,
        'success'
      );
      setRoute('terminal');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return newAcc;
    },
    [user, challenges, createInitialEvaluationForUser, recordAdminLog, pushNotification]
  );

  const submitOrder = useCallback(
    (input: OrderSubmissionInput) => {
      let account = accounts.find((a) => a.id === input.accountId);
      if (!account && input.accountId.startsWith('preview-')) {
        const rawChallengeKey = input.accountId.replace('preview-', '');
        const matchedTemplate =
          challenges.find((c) => c.id === rawChallengeKey) ||
          INITIAL_CHALLENGES.find((c) => c.id === rawChallengeKey) ||
          challenges.find((c) => c.accountSize === Number(rawChallengeKey)) ||
          INITIAL_CHALLENGES.find((c) => c.accountSize === Number(rawChallengeKey)) ||
          INITIAL_CHALLENGES.find((c) => c.id === 'two-step-5000') ||
          INITIAL_CHALLENGES[0];
        const parsedSize = matchedTemplate?.accountSize || Number(rawChallengeKey) || 5000;
        const resolvedRules = resolveChallengeRulesForAccount({
          challengeId: matchedTemplate?.id || `two-step-${parsedSize}`,
          challengeType: matchedTemplate?.type || 'two_step',
          currentStep: 1,
        });
        const closedPreviewOrders = orders.filter(
          (o) => o.accountId === input.accountId && o.status === 'CLOSED'
        );
        const realizedPreviewPnl = closedPreviewOrders.reduce((s, o) => s + (o.netPnl || 0), 0);
        const currentPreviewBal = Math.round((parsedSize + realizedPreviewPnl) * 100) / 100;
        account = {
          id: input.accountId,
          accountNumber: `APEX-${parsedSize >= 1000 ? `${parsedSize / 1000}K` : parsedSize}`,
          userId: user?.uid || 'guest-trader',
          challengeId: matchedTemplate?.id || `two-step-${parsedSize}`,
          challengeTitle:
            matchedTemplate?.title || `2-Step Evaluation ($${parsedSize.toLocaleString()})`,
          challengeType: matchedTemplate?.type || 'two_step',
          accountSize: parsedSize,
          startingBalance: parsedSize,
          balance: currentPreviewBal,
          equity: currentPreviewBal,
          usedMargin: 0,
          freeMargin: currentPreviewBal,
          profitTargetPct: resolvedRules.profitTargetPct,
          dailyDrawdownPct: resolvedRules.dailyDrawdownPct,
          maxDrawdownPct: resolvedRules.maxDrawdownPct,
          minTradingDays: resolvedRules.minTradingDays,
          tradingDaysCount: 1,
          leverage: resolvedRules.leverage,
          profitSplitPct: resolvedRules.profitSplitPct,
          currentStep: resolvedRules.currentStep,
          totalSteps: resolvedRules.totalSteps,
          peakEquity: parsedSize,
          dailyStartingEquity: parsedSize,
          lastDailyResetDate: new Date().toISOString().split('T')[0],
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const createdPreviewAcc = account;
        setAccounts((prev) =>
          prev.some((a) => a.id === createdPreviewAcc.id) ? prev : [createdPreviewAcc, ...prev]
        );
      }
      if (!account) {
        openStripeCheckout('two-step-5000');
        pushNotification(
          'Evaluation Account Required',
          'Purchase an evaluation account and receive Admin confirmation before executing live orders on an allocated account.',
          'warning'
        );
        return {
          ok: false,
          error: 'No active evaluation account found. Purchase an evaluation to start trading.',
        };
      }
      const effectiveOwnerUid = user?.uid || account.userId;

      const quote = quotesRef.current[input.symbol] || quotes[input.symbol];
      const validation = validateOrderRequest({ ...input, accountId: account.id }, account, quote);
      if (!validation.valid) {
        pushNotification('Order Rejected', validation.error || 'Invalid order parameters.', 'error');
        return { ok: false, error: validation.error };
      }

      const effectiveSide =
        input.orderType === 'MARKET'
          ? input.side
          : input.orderType === 'BUY_LIMIT' || input.orderType === 'BUY_STOP'
          ? 'BUY'
          : 'SELL';

      const isMarket = input.orderType === 'MARKET';
      const markPrice = effectiveSide === 'BUY' ? quote.bid : quote.ask;
      const pnl = isMarket
        ? calculatePositionPnl(
            input.symbol,
            effectiveSide,
            input.volume,
            validation.executionPrice,
            markPrice
          )
        : { grossPnl: 0, commission: validation.estimatedCommission, netPnl: 0 };

      const newOrder: TradeOrderRecord = {
        id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ticketId: `TKT-${Math.floor(100000 + Math.random() * 900000)}`,
        accountId: account.id,
        userId: effectiveOwnerUid,
        symbol: input.symbol,
        side: effectiveSide,
        orderType: input.orderType,
        volume: Number(input.volume.toFixed(2)),
        entryPrice: validation.executionPrice,
        currentPrice: markPrice,
        exitPrice: 0,
        stopLoss: input.stopLoss && input.stopLoss > 0 ? roundPrice(input.stopLoss, input.symbol) : 0,
        takeProfit: input.takeProfit && input.takeProfit > 0 ? roundPrice(input.takeProfit, input.symbol) : 0,
        grossPnl: pnl.grossPnl,
        commission: pnl.commission,
        netPnl: pnl.netPnl,
        status: isMarket ? 'OPEN' : 'PENDING',
        openTime: new Date().toISOString(),
        closeTime: '',
      };

      const nextOrders = [newOrder, ...orders];
      setOrders(nextOrders);

      if (isMarket) {
        const openForAcc = nextOrders.filter((o) => o.accountId === account.id && o.status === 'OPEN');
        const closedForAcc = nextOrders.filter((o) => o.accountId === account.id && o.status === 'CLOSED');
        const rules = resolveChallengeRulesForAccount(account);
        const withdrawnGross = payouts
          .filter((p) => p.accountId === account.id && p.status !== 'Rejected')
          .reduce(
            (s, p) =>
              s + (p.grossProfitDeducted || p.amountUsd / ((rules.profitSplitPct || 80) / 100)),
            0
          );
        const reconciledBal =
          Math.round(
            (account.startingBalance +
              closedForAcc.reduce((s, o) => s + (o.netPnl || 0), 0) -
              withdrawnGross) *
              100
          ) / 100;
        const metrics = evaluateAccountRiskMetrics({ ...account, balance: reconciledBal }, openForAcc);
        const isBreachedOnEntry = metrics.nextStatus === 'failed';
        const settledEntryBal = isBreachedOnEntry
          ? Math.round((reconciledBal + metrics.floatingPnl) * 100) / 100
          : reconciledBal;

        const today = new Date().toISOString().split('T')[0];
        const needsDailyReset = account.lastDailyResetDate !== today;
        const currentDailyStart = needsDailyReset ? metrics.equity : account.dailyStartingEquity;

        setAccounts((prev) =>
          prev.map((a) =>
            a.id === account.id
              ? {
                  ...a,
                  balance: settledEntryBal,
                  equity: isBreachedOnEntry ? settledEntryBal : metrics.equity,
                  usedMargin: isBreachedOnEntry ? 0 : metrics.usedMargin,
                  freeMargin: isBreachedOnEntry ? settledEntryBal : metrics.freeMargin,
                  peakEquity: metrics.peakEquity,
                  dailyStartingEquity: currentDailyStart,
                  lastDailyResetDate: today,
                  status: isBreachedOnEntry ? 'failed' : a.status,
                  terminalPassword: isBreachedOnEntry ? '' : a.terminalPassword,
                  breachReason: isBreachedOnEntry ? metrics.breachReason || a.breachReason : a.breachReason,
                  updatedAt: new Date().toISOString(),
                }
              : a
          )
        );

        if (isBreachedOnEntry) {
          setOrders((prev) =>
            prev.map((o) => {
              if (o.accountId !== account.id) return o;
              if (o.status === 'OPEN') {
                return { ...o, exitPrice: o.currentPrice, status: 'CLOSED', closeTime: new Date().toISOString() };
              }
              if (o.status === 'PENDING') {
                return { ...o, status: 'CANCELLED', closeTime: new Date().toISOString() };
              }
              return o;
            })
          );
          setIsTerminalUnlocked(false);
          dispatchFundedApexEmail(
            buildChallengeStatusUpdateEmailPayload({
              recipientEmail: user.email,
              recipientName: user.fullName,
              accountId: account.id,
              accountNumber: account.accountNumber,
              challengeId: account.challengeId,
              challengeTitle: account.challengeTitle,
              accountSize: account.accountSize,
              status: 'failed',
              reason: metrics.breachReason || 'Drawdown limit violated on trade entry',
              currentBalance: settledEntryBal,
              currentEquity: settledEntryBal,
              currentStep: account.currentStep,
              totalSteps: account.totalSteps,
              profitSplitPct: account.profitSplitPct,
            })
          );
          pushNotification(
            `Account #${account.accountNumber} Breached — Email Sent`,
            `${metrics.breachReason || 'Drawdown limit violated'}. Terminal password removed & breach email dispatched.`,
            'error'
          );
          return { ok: false, error: metrics.breachReason || 'Account breached.' };
        }
      }

      pushNotification(
        isMarket ? 'Market Order Executed on Chart' : 'Pending Order Placed on Chart',
        `${newOrder.ticketId}: ${effectiveSide} ${newOrder.volume.toFixed(2)} lots ${newOrder.symbol} @ ${newOrder.entryPrice}`,
        'success'
      );

      return { ok: true, order: newOrder };
    },
    [user, accounts, challenges, quotes, orders, payouts, openStripeCheckout, dispatchFundedApexEmail, pushNotification]
  );

  const modifyOrder = useCallback(
    (orderId: string, updates: { stopLoss: number; takeProfit: number; entryPrice?: number }) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return { ok: false, error: 'Order not found.' };

      const spec = INSTRUMENTS[target.symbol];
      const quote = quotesRef.current[target.symbol] || quotes[target.symbol];
      const minPip = Math.pow(10, -(spec?.decimals || 2));
      const minDist = Math.max(minPip * 2, (spec?.spread || minPip) * 0.5);

      let sl =
        Number.isFinite(updates.stopLoss) && updates.stopLoss > 0
          ? roundPrice(updates.stopLoss, target.symbol)
          : 0;
      let tp =
        Number.isFinite(updates.takeProfit) && updates.takeProfit > 0
          ? roundPrice(updates.takeProfit, target.symbol)
          : 0;

      // For OPEN positions, ensure SL & TP sit on the valid side of live market price by at least 2 pips so editing never glitches or self-closes immediately
      if (target.status === 'OPEN' && quote) {
        const markPrice = target.side === 'BUY' ? quote.bid : quote.ask;
        if (target.side === 'BUY') {
          if (sl > 0 && sl >= markPrice - minDist) {
            sl = roundPrice(markPrice - minDist, target.symbol);
          }
          if (tp > 0 && tp <= markPrice + minDist) {
            tp = roundPrice(markPrice + minDist, target.symbol);
          }
        } else {
          if (sl > 0 && sl <= markPrice + minDist) {
            sl = roundPrice(markPrice + minDist, target.symbol);
          }
          if (tp > 0 && tp >= markPrice - minDist) {
            tp = roundPrice(markPrice - minDist, target.symbol);
          }
        }
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                stopLoss: sl,
                takeProfit: tp,
                entryPrice:
                  o.status === 'PENDING' && updates.entryPrice
                    ? roundPrice(updates.entryPrice, o.symbol)
                    : o.entryPrice,
              }
            : o
        )
      );

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('apex-terminal-banner', {
            detail: {
              title: 'SL / TP PROTECTION UPDATED',
              subtitle: `${target.symbol} ${target.side} · SL: ${sl > 0 ? sl : 'OFF'} · TP: ${tp > 0 ? tp : 'OFF'}`,
              tone: 'emerald',
            },
          })
        );
      }

      return { ok: true };
    },
    [orders, quotes]
  );

  const closePosition = useCallback(
    (orderId: string, partialRatio = 1) => {
      const target = orders.find((o) => o.id === orderId && o.status === 'OPEN');
      if (!target) return { ok: false, error: 'Open position not found.' };

      const quote = quotesRef.current[target.symbol] || quotes[target.symbol];
      const fillPrice = target.side === 'BUY' ? quote.bid : quote.ask;
      const closeVolume = Math.max(0.01, Math.round(target.volume * partialRatio * 100) / 100);
      const isPartial = closeVolume < target.volume;

      const closedPnl = calculatePositionPnl(
        target.symbol,
        target.side,
        closeVolume,
        target.entryPrice,
        fillPrice
      );

      let nextOrders: TradeOrderRecord[] = [];
      if (isPartial) {
        const remainingVolume = Math.round((target.volume - closeVolume) * 100) / 100;
        const remPnl = calculatePositionPnl(
          target.symbol,
          target.side,
          remainingVolume,
          target.entryPrice,
          fillPrice
        );
        const closedChild: TradeOrderRecord = {
          ...target,
          id: `ord-closed-${Date.now()}`,
          ticketId: `${target.ticketId}-P`,
          volume: closeVolume,
          currentPrice: fillPrice,
          exitPrice: fillPrice,
          grossPnl: closedPnl.grossPnl,
          commission: closedPnl.commission,
          netPnl: closedPnl.netPnl,
          status: 'CLOSED',
          closeTime: new Date().toISOString(),
        };
        nextOrders = [
          closedChild,
          ...orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  volume: remainingVolume,
                  currentPrice: fillPrice,
                  grossPnl: remPnl.grossPnl,
                  commission: remPnl.commission,
                  netPnl: remPnl.netPnl,
                }
              : o
          ),
        ];
      } else {
        nextOrders = orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                currentPrice: fillPrice,
                exitPrice: fillPrice,
                grossPnl: closedPnl.grossPnl,
                commission: closedPnl.commission,
                netPnl: closedPnl.netPnl,
                status: 'CLOSED',
                closeTime: new Date().toISOString(),
              }
            : o
        );
      }

      setOrders(nextOrders);
      let breachedAccountNum = '';
      let breachMsg = '';
      let promotedPhaseMsg = '';

      const nextAccounts = accounts.map((acc) => {
        if (acc.id !== target.accountId) return acc;
        const closedForAcc = nextOrders.filter(
          (o) => o.accountId === acc.id && o.status === 'CLOSED'
        );
        const rules = resolveChallengeRulesForAccount(acc);
        const withdrawnGross = payouts
          .filter((p) => p.accountId === acc.id && p.status !== 'Rejected')
          .reduce(
            (s, p) =>
              s + (p.grossProfitDeducted || p.amountUsd / ((rules.profitSplitPct || 80) / 100)),
            0
          );
        const nextBal =
          Math.round(
            (acc.startingBalance +
              closedForAcc.reduce((s, o) => s + (o.netPnl || 0), 0) -
              withdrawnGross) *
              100
          ) / 100;
        const openForAcc = nextOrders.filter((o) => o.accountId === acc.id && o.status === 'OPEN');
        const tempAcc = { ...acc, balance: nextBal };
        const metrics = evaluateAccountRiskMetrics(tempAcc, openForAcc);

        let nextStatus = metrics.nextStatus;
        let nextCurrentStep = acc.currentStep ?? 1;
        let nextPhaseStartBal = acc.phaseStartingBalance || acc.startingBalance;
        const totalSteps =
          acc.totalSteps ??
          (acc.challengeType === 'instant'
            ? 0
            : acc.challengeType === 'one_step'
            ? 1
            : acc.challengeType === 'two_step'
            ? 2
            : 3);

        let nextProfitTargetPct = metrics.profitTargetPct;
        const realizedPhaseGain = Math.max(0, Math.round((nextBal - nextPhaseStartBal) * 100) / 100);
        const canAdvanceStep =
          metrics.stepCompleted &&
          acc.status === 'active' &&
          metrics.profitTargetUsd > 0 &&
          realizedPhaseGain >= metrics.profitTargetUsd;

        if (nextStatus === 'failed' && acc.status !== 'failed') {
          breachedAccountNum = acc.accountNumber;
          breachMsg = metrics.breachReason || 'Drawdown limit violated.';
        } else if (metrics.stepCompleted && acc.status === 'active' && !canAdvanceStep) {
          nextStatus = 'active';
        } else if (canAdvanceStep) {
          if (totalSteps > 1 && nextCurrentStep < totalSteps) {
            nextCurrentStep += 1;
            nextStatus = 'active';
            nextPhaseStartBal = nextBal;
            const stepRules = resolveChallengeRulesForAccount({
              ...tempAcc,
              currentStep: nextCurrentStep,
              totalSteps,
            });
            nextProfitTargetPct = stepRules.profitTargetPct;
            promotedPhaseMsg = `Account #${acc.accountNumber} passed Phase ${nextCurrentStep - 1} (+${metrics.profitTargetPct}%) and advanced to Phase ${nextCurrentStep} of ${totalSteps}!`;
          } else {
            nextStatus = 'passed';
            nextCurrentStep = totalSteps;
            promotedPhaseMsg = `Congratulations! Account #${acc.accountNumber} passed all evaluation steps and is now FUNDED & Payout-Eligible!`;
          }
        }

        const isBreachedNow = nextStatus === 'failed';
        const today = new Date().toISOString().split('T')[0];
        const needsDailyReset = acc.lastDailyResetDate !== today;
        const currentDailyStart = needsDailyReset ? metrics.equity : acc.dailyStartingEquity;

        return {
          ...tempAcc,
          phaseStartingBalance: nextPhaseStartBal,
          equity: isBreachedNow ? nextBal : metrics.equity,
          usedMargin: isBreachedNow ? 0 : metrics.usedMargin,
          freeMargin: isBreachedNow ? nextBal : metrics.freeMargin,
          profitTargetPct: nextProfitTargetPct,
          dailyDrawdownPct: metrics.dailyDrawdownPct,
          maxDrawdownPct: metrics.maxDrawdownPct,
          peakEquity: metrics.peakEquity,
          dailyStartingEquity: currentDailyStart,
          lastDailyResetDate: today,
          status: nextStatus,
          currentStep: nextCurrentStep,
          totalSteps,
          terminalPassword: isBreachedNow ? '' : tempAcc.terminalPassword,
          breachReason: metrics.breachReason || acc.breachReason,
          updatedAt: new Date().toISOString(),
        };
      });

      setAccounts(nextAccounts);

      const updatedTargetAcc = nextAccounts.find((a) => a.id === target.accountId);
      const targetAccOwner = updatedTargetAcc
        ? allUsers.find(
            (u) =>
              u.uid === updatedTargetAcc.userId ||
              (updatedTargetAcc.userEmail &&
                u.email.toLowerCase() === updatedTargetAcc.userEmail.toLowerCase())
          )
        : null;

      if (breachedAccountNum) {
        setOrders((prev) =>
          prev.map((o) => {
            if (o.accountId !== target.accountId) return o;
            if (o.status === 'OPEN') {
              return { ...o, exitPrice: o.currentPrice, status: 'CLOSED', closeTime: new Date().toISOString() };
            }
            if (o.status === 'PENDING') {
              return { ...o, status: 'CANCELLED', closeTime: new Date().toISOString() };
            }
            return o;
          })
        );
        setIsTerminalUnlocked(false);
        if (updatedTargetAcc) {
          dispatchFundedApexEmail(
            buildChallengeStatusUpdateEmailPayload({
              recipientEmail:
                targetAccOwner?.email || updatedTargetAcc.userEmail || user?.email || 'trader@fundedapex.com',
              recipientName: targetAccOwner?.fullName || user?.fullName || 'FUNDED APEX Trader',
              accountId: updatedTargetAcc.id,
              accountNumber: updatedTargetAcc.accountNumber,
              challengeId: updatedTargetAcc.challengeId,
              challengeTitle: updatedTargetAcc.challengeTitle,
              accountSize: updatedTargetAcc.accountSize,
              status: 'failed',
              reason: breachMsg,
              currentBalance: updatedTargetAcc.balance,
              currentEquity: updatedTargetAcc.equity,
              currentStep: updatedTargetAcc.currentStep,
              totalSteps: updatedTargetAcc.totalSteps,
              profitSplitPct: updatedTargetAcc.profitSplitPct,
            })
          );
        }
        pushNotification(
          `Account #${breachedAccountNum} Breached — Email Sent`,
          `${breachMsg}. All open positions have been liquidated, Terminal Password removed, and breach email sent.`,
          'error'
        );
      } else if (promotedPhaseMsg) {
        if (updatedTargetAcc) {
          dispatchFundedApexEmail(
            buildChallengeStatusUpdateEmailPayload({
              recipientEmail:
                targetAccOwner?.email || updatedTargetAcc.userEmail || user?.email || 'trader@fundedapex.com',
              recipientName: targetAccOwner?.fullName || user?.fullName || 'FUNDED APEX Trader',
              accountId: updatedTargetAcc.id,
              accountNumber: updatedTargetAcc.accountNumber,
              challengeId: updatedTargetAcc.challengeId,
              challengeTitle: updatedTargetAcc.challengeTitle,
              accountSize: updatedTargetAcc.accountSize,
              status: updatedTargetAcc.status === 'passed' ? 'passed' : 'active',
              reason: promotedPhaseMsg,
              currentBalance: updatedTargetAcc.balance,
              currentEquity: updatedTargetAcc.equity,
              currentStep: updatedTargetAcc.currentStep,
              totalSteps: updatedTargetAcc.totalSteps,
              profitSplitPct: updatedTargetAcc.profitSplitPct,
            })
          );
        }
        pushNotification('Evaluation Milestone Reached & Email Sent ✓', promotedPhaseMsg, 'success');
      } else {
        pushNotification(
          isPartial ? 'Position Partially Closed' : 'Position Closed',
          `${target.ticketId}: Closed ${closeVolume.toFixed(2)} lots ${target.symbol} @ ${fillPrice} | Net P&L: ${
            closedPnl.netPnl >= 0 ? '+' : ''
          }$${closedPnl.netPnl.toFixed(2)}`,
          closedPnl.netPnl >= 0 ? 'success' : 'warning'
        );
      }

      return { ok: true };
    },
    [user, accounts, allUsers, payouts, orders, quotes, dispatchFundedApexEmail, pushNotification]
  );

  const requestAccountPayout = useCallback(
    (input: { accountId: string; amountUsd: number; method: string; destination: string }) => {
      if (!user) {
        return { ok: false, error: 'Please sign in to request a payout.' };
      }
      const rawAccount =
        userAccounts.find((a) => a.id === input.accountId) ||
        accounts.find((a) => a.id === input.accountId);
      if (!rawAccount) {
        return { ok: false, error: 'Selected trading account not found.' };
      }
      const openForAcc = orders.filter((o) => o.accountId === rawAccount.id && o.status === 'OPEN');
      if (openForAcc.length > 0) {
        return {
          ok: false,
          error: 'Please close all open positions on this account before requesting a profit payout.',
        };
      }
      const closedForAcc = orders.filter((o) => o.accountId === rawAccount.id && o.status === 'CLOSED');
      const rules = resolveChallengeRulesForAccount(rawAccount);
      const withdrawnGross = payouts
        .filter((p) => p.accountId === rawAccount.id && p.status !== 'Rejected')
        .reduce(
          (s, p) =>
            s + (p.grossProfitDeducted || p.amountUsd / ((rules.profitSplitPct || 80) / 100)),
          0
        );
      const syncedBalance =
        rawAccount.status === 'failed'
          ? rawAccount.balance
          : Math.round(
              (rawAccount.startingBalance +
                closedForAcc.reduce((s, o) => s + (o.netPnl || 0), 0) -
                withdrawnGross) *
                100
            ) / 100;

      const account: TradingAccountRecord = {
        ...rawAccount,
        balance: syncedBalance,
        equity: syncedBalance,
        freeMargin: syncedBalance,
      };

      const eligibility = evaluateAccountPayoutEligibility(account, openForAcc, closedForAcc);
      if (!eligibility.eligible) {
        return {
          ok: false,
          error: eligibility.reason,
          eligibility,
        };
      }

      const requestedUsd = Math.round(Number(input.amountUsd) * 100) / 100;
      if (!Number.isFinite(requestedUsd) || requestedUsd < 20) {
        return {
          ok: false,
          error: 'Minimum payout withdrawal amount is $20.00 USD.',
          eligibility,
        };
      }
      if (requestedUsd > eligibility.maxWithdrawableUsd) {
        return {
          ok: false,
          error: `Requested amount ($${requestedUsd.toFixed(2)}) exceeds your ${eligibility.profitSplitPct}% profit split limit ($${eligibility.maxWithdrawableUsd.toFixed(2)}).`,
          eligibility,
        };
      }
      if (!input.destination.trim()) {
        return {
          ok: false,
          error: 'Please enter your receiving wallet address or bank wire details.',
          eligibility,
        };
      }

      const grossProfitDeducted =
        Math.round((requestedUsd / (eligibility.profitSplitPct / 100)) * 100) / 100;

      const nextBal = Math.max(
        account.startingBalance,
        Math.round((account.balance - grossProfitDeducted) * 100) / 100
      );
      const updatedAccount: TradingAccountRecord = {
        ...account,
        balance: nextBal,
        equity: nextBal,
        freeMargin: nextBal,
        updatedAt: new Date().toISOString(),
      };

      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? updatedAccount : a))
      );

      const newPayout: PayoutRecordItem = {
        id: `payout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        traderName: user.fullName,
        username: `@${user.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 14)}`,
        userEmail: user.email.toLowerCase(),
        userId: user.uid,
        amountUsd: requestedUsd,
        grossProfitDeducted,
        profitSplitPct: eligibility.profitSplitPct,
        currency: input.method,
        status: 'Pending',
        paymentDate: new Date().toISOString().slice(0, 10),
        accountSize: account.accountSize,
        programType: account.challengeTitle,
        accountId: account.id,
        accountNumber: account.accountNumber,
        destination: input.destination.trim(),
        isTraderRequest: true,
        createdAt: new Date().toISOString(),
      };

      setPayouts((prev) => [newPayout, ...prev]);

      // Immediately sync payout request and updated account to server vault & Firestore so Admin Panel updates in real time
      fetch('/api/vault/payout-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayout),
      }).catch(() => {});

      fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payouts: [newPayout],
          accounts: [updatedAccount],
        }),
      }).catch(() => {});

      void safeFirestoreWrite('payouts', newPayout.id, newPayout);
      void safeFirestoreWrite('trading_accounts', updatedAccount.id, updatedAccount);
      void safeFirestoreWrite('accounts', updatedAccount.id, updatedAccount);

      recordAdminLog(
        'TRADER_PAYOUT_REQUEST',
        newPayout.id,
        `Account #${account.accountNumber} (${account.challengeTitle}): Trader ${user.email} requested $${requestedUsd.toFixed(2)} (${eligibility.profitSplitPct}% split) via ${input.method} -> ${input.destination.trim()}`
      );
      pushNotification(
        'Payout Request Submitted to Admin Panel ✓',
        `Submitted $${requestedUsd.toFixed(2)} (${eligibility.profitSplitPct}% split) withdrawal from Account #${account.accountNumber} via ${input.method}. Synced to Admin Panel for verification!`,
        'success'
      );

      return { ok: true, payout: newPayout, eligibility };
    },
    [user, userAccounts, accounts, orders, payouts, safeFirestoreWrite, recordAdminLog, pushNotification]
  );

  const adminApprovePayoutRequest = useCallback(
    (payoutId: string) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required.' };
      }
      const target = payouts.find((p) => p.id === payoutId);
      if (!target) {
        return { ok: false, error: 'Payout request not found.' };
      }
      const verifiedPayout: PayoutRecordItem = {
        ...target,
        status: 'Verified',
        reviewedAt: new Date().toISOString(),
      };
      setPayouts((prev) => prev.map((p) => (p.id === payoutId ? verifiedPayout : p)));
      void safeFirestoreWrite('payouts', verifiedPayout.id, verifiedPayout);
      fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payouts: [verifiedPayout] }),
      }).catch(() => {});

      if (target.userEmail) {
        dispatchFundedApexEmail(
          buildCustomManualEmailPayload({
            recipientEmail: target.userEmail,
            recipientName: target.traderName,
            subject: `Payout Approved & Disbursed — $${target.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD (#${target.accountNumber || 'FUNDED'})`,
            headline: 'Your Profit Payout Has Been Verified & Disbursed',
            subheadline: `Settlement processed via ${target.currency}`,
            badgeText: 'PAYOUT VERIFIED ✓',
            badgeColor: '#00FFA3',
            bodyTextOrHtml: `Congratulations ${target.traderName},\n\nYour performance profit withdrawal of $${target.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD from Account #${target.accountNumber || 'FA-FUNDED'} (${target.programType}) has been approved and verified by the FUNDED APEX Treasury Desk.\n\nDestination Wallet / Account: ${target.destination || 'On-File Settlement Address'}`,
            ctaLabel: 'View Verified Payout Certificate',
            ctaUrl: 'https://fundedapex.com/?page=dashboard',
          })
        );
      }

      recordAdminLog(
        'APPROVE_TRADER_PAYOUT',
        verifiedPayout.id,
        `Approved & Verified $${verifiedPayout.amountUsd.toFixed(2)} payout for ${verifiedPayout.traderName} (${verifiedPayout.userEmail || verifiedPayout.username}) on Account #${verifiedPayout.accountNumber || 'N/A'}`
      );
      pushNotification(
        'Trader Payout Approved & Verified ✓',
        `Verified $${verifiedPayout.amountUsd.toFixed(2)} payout for ${verifiedPayout.traderName} (#${verifiedPayout.accountNumber || 'Funded'}).`,
        'success'
      );
      return { ok: true };
    },
    [user, payouts, safeFirestoreWrite, dispatchFundedApexEmail, recordAdminLog, pushNotification]
  );

  const adminRejectPayoutRequest = useCallback(
    (payoutId: string) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required.' };
      }
      const target = payouts.find((p) => p.id === payoutId);
      if (!target) {
        return { ok: false, error: 'Payout request not found.' };
      }
      const rejectedPayout: PayoutRecordItem = {
        ...target,
        status: 'Rejected',
        reviewedAt: new Date().toISOString(),
      };
      setPayouts((prev) => prev.map((p) => (p.id === payoutId ? rejectedPayout : p)));
      void safeFirestoreWrite('payouts', rejectedPayout.id, rejectedPayout);

      // Refund the deducted gross profit back to the trader's account balance
      let refundedAcc: TradingAccountRecord | undefined;
      if (target.accountId && target.status !== 'Rejected') {
        const refundAmount =
          target.grossProfitDeducted ||
          Math.round((target.amountUsd / ((target.profitSplitPct || 80) / 100)) * 100) / 100;
        setAccounts((prev) =>
          prev.map((a) => {
            if (a.id !== target.accountId) return a;
            const restoredBal = Math.round((a.balance + refundAmount) * 100) / 100;
            refundedAcc = {
              ...a,
              balance: restoredBal,
              equity: restoredBal,
              freeMargin: restoredBal,
              updatedAt: new Date().toISOString(),
            };
            return refundedAcc;
          })
        );
      }

      fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payouts: [rejectedPayout],
          ...(refundedAcc ? { accounts: [refundedAcc] } : {}),
        }),
      }).catch(() => {});

      recordAdminLog(
        'REJECT_TRADER_PAYOUT',
        rejectedPayout.id,
        `Rejected $${rejectedPayout.amountUsd.toFixed(2)} payout request for ${rejectedPayout.traderName} (#${rejectedPayout.accountNumber || 'N/A'}) and refunded balance`
      );
      pushNotification(
        'Payout Request Rejected & Balance Refunded',
        `Marked payout request for ${rejectedPayout.traderName} as Rejected and restored profit to Account #${rejectedPayout.accountNumber || ''}.`,
        'warning'
      );
      return { ok: true };
    },
    [user, payouts, safeFirestoreWrite, recordAdminLog, pushNotification]
  );

  const cancelPendingOrder = useCallback(
    (orderId: string) => {
      const target = orders.find((o) => o.id === orderId && o.status === 'PENDING');
      if (!target) return { ok: false, error: 'Pending order not found.' };

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'CANCELLED', closeTime: new Date().toISOString() }
            : o
        )
      );
      pushNotification(
        'Pending Order Cancelled',
        `Cancelled ${target.orderType} order ${target.ticketId} on ${target.symbol}.`,
        'info'
      );
      return { ok: true };
    },
    [user, orders, pushNotification]
  );

  const spinDailyWheel = useCallback(
    (_options?: { requireAuth?: boolean }) => {
      if (!user) {
        setRoute('login');
        return {
          ok: false,
          requiresLogin: true,
          error: 'Login Required.',
        };
      }
      return {
        ok: false,
        error: 'Spin promotion is disabled. Use an official Admin coupon code at checkout.',
      };
    },
    [user]
  );

  const redeemSpinCodeOrAddAccount = useCallback(
    (codeInput: string, fallbackChallengeId = 'two-step-5000') => {
      if (!user) {
        setRoute('login');
        return {
          ok: false,
          message: 'Please sign in first to apply a coupon code.',
        };
      }

      const normalized = codeInput.trim().toUpperCase();
      if (!normalized) {
        return {
          ok: false,
          message: 'Please enter a valid coupon code.',
        };
      }

      const targetTemplate =
        challenges.find((c) => c.id === fallbackChallengeId) ||
        INITIAL_CHALLENGES.find((c) => c.id === fallbackChallengeId) ||
        INITIAL_CHALLENGES[0];

      const breakdown = computeStripeCheckoutBreakdown(
        targetTemplate,
        normalized,
        userCoupons,
        adminCoupons
      );
      if (!breakdown.validCode) {
        pushNotification('Invalid Coupon Code', breakdown.errorMessage || 'Code not recognized.', 'error');
        return {
          ok: false,
          message: breakdown.errorMessage || 'Invalid or expired coupon code.',
        };
      }

      openStripeCheckout(breakdown.targetChallengeId, normalized);
      return {
        ok: true,
        openedCheckout: true,
        message: `${breakdown.discountPct}% OFF coupon (${normalized}) applied in Checkout.`,
      };
    },
    [user, challenges, userCoupons, adminCoupons, openStripeCheckout, pushNotification]
  );

  const adminSaveChallenge = useCallback(
    (challenge: ChallengeTemplate) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) return;
      const existingChallenge = challenges.find((c) => c.id === challenge.id);
      const passwordChanged =
        Boolean(challenge.terminalPassword) &&
        challenge.terminalPassword !== existingChallenge?.terminalPassword;
      const userIdChanged =
        Boolean(challenge.terminalUserId) &&
        challenge.terminalUserId !== existingChallenge?.terminalUserId;

      setChallenges((prev) => {
        const exists = prev.some((c) => c.id === challenge.id);
        return exists
          ? prev.map((c) => (c.id === challenge.id ? challenge : c))
          : [challenge, ...prev];
      });

      if (passwordChanged || userIdChanged) {
        const matchingAccounts = accounts.filter((a) => a.challengeId === challenge.id);
        matchingAccounts.forEach((acc) => {
          const owner = allUsers.find((u) => u.uid === acc.userId);
          const nextUserId = challenge.terminalUserId || acc.terminalUserId || `APEX-ID-${acc.accountNumber.replace(/[^0-9]/g, '').slice(-4)}`;
          const nextPass = challenge.terminalPassword || acc.terminalPassword || 'APEX-2026';
          if (owner) {
            dispatchTerminalCredentialsEmail({
              recipientEmail: owner.email,
              recipientName: owner.fullName,
              accountId: acc.id,
              accountNumber: acc.accountNumber,
              challengeId: challenge.id,
              challengeTitle: challenge.title,
              terminalUserId: nextUserId,
              terminalPassword: nextPass,
              triggeredBy: 'admin_challenge_update',
            });
          }
        });
      }

      recordAdminLog(
        'CONFIGURE_CHALLENGE',
        challenge.id,
        `Configured challenge template: ${challenge.title} ($${challenge.accountSize.toLocaleString()})`
      );
      pushNotification(
        'Challenge Saved & Notification Triggered ✓',
        `Updated ${challenge.title}${passwordChanged || userIdChanged ? ` and emailed updated terminal credentials from ${FUNDED_APEX_SUPPORT_EMAIL}` : ''}.`,
        'success'
      );
    },
    [user, challenges, accounts, allUsers, dispatchTerminalCredentialsEmail, recordAdminLog, pushNotification]
  );

  const adminToggleArchiveChallenge = useCallback(
    (challengeId: string) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) return;
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === challengeId
            ? { ...c, status: c.status === 'available' ? 'archived' : 'available' }
            : c
        )
      );
      recordAdminLog('ARCHIVE_TOGGLE_CHALLENGE', challengeId, `Toggled archive status for ${challengeId}`);
      pushNotification('Challenge Status Updated', `Updated availability for ${challengeId}.`, 'info');
    },
    [user, recordAdminLog, pushNotification]
  );

  const adminUpdateAccountStatus = useCallback(
    (accountId: string, status: AccountStatus) => {
      if (!user || !['admin', 'super_admin', 'support'].includes(user.role)) return;
      const targetAcc = accounts.find((a) => a.id === accountId);
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === accountId
            ? {
                ...a,
                status,
                currentStep:
                  status === 'passed'
                    ? a.totalSteps ?? (a.challengeType === 'three_step' ? 3 : a.challengeType === 'two_step' ? 2 : 1)
                    : a.currentStep,
                terminalUserId:
                  a.terminalUserId || `APEX-ID-${(a.accountNumber || '1001').replace(/[^0-9]/g, '').slice(-4) || '2026'}`,
                terminalPassword:
                  status === 'failed' || status === 'suspended'
                    ? ''
                    : a.terminalPassword || `APEX-${Math.floor(1000 + Math.random() * 9000)}`,
                breachReason:
                  status === 'failed'
                    ? a.breachReason || 'Marked Breached by Administrator'
                    : status === 'suspended'
                    ? 'Account Suspended by Compliance & Risk Desk'
                    : undefined,
                updatedAt: new Date().toISOString(),
              }
            : a
        )
      );
      if ((status === 'failed' || status === 'suspended') && activeAccountId === accountId) {
        setIsTerminalUnlocked(false);
      } else if ((status === 'active' || status === 'passed') && activeAccountId === accountId) {
        setIsTerminalUnlocked(true);
      }
      if (targetAcc) {
        const owner = allUsers.find(
          (u) =>
            u.uid === targetAcc.userId ||
            (targetAcc.userEmail && u.email.toLowerCase() === targetAcc.userEmail.toLowerCase())
        );
        dispatchFundedApexEmail(
          buildChallengeStatusUpdateEmailPayload({
            recipientEmail: owner?.email || targetAcc.userEmail || 'trader@fundedapex.com',
            recipientName: owner?.fullName || 'FUNDED APEX Trader',
            accountId: targetAcc.id,
            accountNumber: targetAcc.accountNumber,
            challengeId: targetAcc.challengeId,
            challengeTitle: targetAcc.challengeTitle,
            accountSize: targetAcc.accountSize,
            status: status as ChallengeStatusEmailType,
            reason:
              status === 'passed'
                ? 'Evaluation verified and promoted to Funded Trader status by FUNDED APEX Risk Desk.'
                : status === 'failed'
                ? targetAcc.breachReason || 'Evaluation marked failed due to rule breach.'
                : status === 'suspended'
                ? 'Account temporarily suspended pending Risk & Compliance review.'
                : 'Account reactivated and ready for live market execution.',
            currentBalance: targetAcc.balance,
            currentEquity: targetAcc.equity,
            currentStep:
              status === 'passed'
                ? targetAcc.totalSteps ?? 2
                : targetAcc.currentStep,
            totalSteps: targetAcc.totalSteps,
            profitSplitPct: targetAcc.profitSplitPct,
          })
        );
      }
      recordAdminLog('UPDATE_ACCOUNT_STATUS', accountId, `Changed account status to ${status.toUpperCase()} and emailed trader`);
      pushNotification(
        'Account Status Updated & Email Dispatched ✓',
        `Set account status to ${status.toUpperCase()} and sent branded FUNDED APEX status notification email.`,
        status === 'passed' || status === 'active' ? 'success' : 'warning'
      );
    },
    [user, accounts, allUsers, activeAccountId, dispatchFundedApexEmail, recordAdminLog, pushNotification]
  );

  const adminUpdateAccountTerminalPassword = useCallback(
    (accountId: string, newPasscode: string, newUserId?: string) => {
      if (!user || !['admin', 'super_admin', 'support'].includes(user.role)) return;
      const cleanPass = newPasscode.trim();
      if (!cleanPass) return;
      const targetAcc = accounts.find((a) => a.id === accountId);
      const cleanUserId =
        newUserId?.trim() ||
        targetAcc?.terminalUserId ||
        `APEX-ID-${(targetAcc?.accountNumber || '1001').replace(/[^0-9]/g, '').slice(-4)}`;

      setAccounts((prev) =>
        prev.map((a) =>
          a.id === accountId
            ? {
                ...a,
                terminalUserId: cleanUserId,
                terminalPassword: cleanPass,
                updatedAt: new Date().toISOString(),
              }
            : a
        )
      );
      void safeFirestoreWrite('trading_accounts', accountId, {
        terminalUserId: cleanUserId,
        terminalPassword: cleanPass,
      });

      if (targetAcc) {
        const owner = allUsers.find((u) => u.uid === targetAcc.userId);
        dispatchTerminalCredentialsEmail({
          recipientEmail: owner?.email || 'trader@fundedapex.com',
          recipientName: owner?.fullName || 'FUNDED APEX Trader',
          accountId: targetAcc.id,
          accountNumber: targetAcc.accountNumber,
          challengeId: targetAcc.challengeId,
          challengeTitle: targetAcc.challengeTitle,
          terminalUserId: cleanUserId,
          terminalPassword: cleanPass,
          triggeredBy: 'admin_account_update',
        });
      }

      recordAdminLog(
        'UPDATE_ACCOUNT_PASSCODE',
        accountId,
        `Updated Terminal User ID (${cleanUserId}) & Password (${cleanPass}) and dispatched email via Firebase Cloud Functions`
      );
      pushNotification(
        'Terminal Credentials Updated & Emailed ✓',
        `Saved ID: ${cleanUserId} | Pass: ${cleanPass} & emailed trader from ${FUNDED_APEX_SUPPORT_EMAIL}.`,
        'success'
      );
    },
    [user, accounts, allUsers, safeFirestoreWrite, dispatchTerminalCredentialsEmail, recordAdminLog, pushNotification]
  );

  const adminGenerateAllAccountPasscodes = useCallback(() => {
    if (!user || !['admin', 'super_admin', 'support'].includes(user.role)) return;
    const usedPass = new Set<string>();
    const usedIds = new Set<string>();
    setAccounts((prev) =>
      prev.map((acc) => {
        let code = `APEX-${Math.floor(1000 + Math.random() * 9000)}`;
        while (usedPass.has(code)) {
          code = `APEX-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        usedPass.add(code);

        let termId = `APEX-ID-${Math.floor(1000 + Math.random() * 9000)}`;
        while (usedIds.has(termId)) {
          termId = `APEX-ID-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        usedIds.add(termId);

        void safeFirestoreWrite('trading_accounts', acc.id, {
          terminalUserId: termId,
          terminalPassword: code,
        });

        const owner = allUsers.find((u) => u.uid === acc.userId);
        dispatchTerminalCredentialsEmail({
          recipientEmail: owner?.email || 'trader@fundedapex.com',
          recipientName: owner?.fullName || 'FUNDED APEX Trader',
          accountId: acc.id,
          accountNumber: acc.accountNumber,
          challengeId: acc.challengeId,
          challengeTitle: acc.challengeTitle,
          terminalUserId: termId,
          terminalPassword: code,
          triggeredBy: 'admin_account_update',
        });

        return {
          ...acc,
          terminalUserId: termId,
          terminalPassword: code,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    recordAdminLog(
      'REGENERATE_ALL_PASSCODES',
      'ALL_ACCOUNTS',
      'Generated unique Terminal User IDs & Passwords for all trading accounts and emailed all traders'
    );
    pushNotification(
      'All Terminal IDs & Passwords Generated + Emailed ✓',
      `Every account received a unique Terminal User ID & Password and automated email notification from ${FUNDED_APEX_SUPPORT_EMAIL}.`,
      'success'
    );
  }, [user, allUsers, safeFirestoreWrite, dispatchTerminalCredentialsEmail, recordAdminLog, pushNotification]);

  const adminUpdateUserRole = useCallback(
    (targetUid: string, newRole: UserRole) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) return;
      setAllUsers((prev) =>
        prev.map((u) => (u.uid === targetUid ? { ...u, role: newRole } : u))
      );
      if (user.uid === targetUid) {
        setUser((prev) => (prev ? { ...prev, role: newRole } : prev));
      }
      recordAdminLog('ASSIGN_USER_ROLE', targetUid, `Assigned role ${newRole.toUpperCase()} to user ${targetUid}`);
      pushNotification(
        'Admin Status Updated',
        `User role updated to ${newRole === 'admin' || newRole === 'super_admin' ? 'ADMIN' : 'TRADER (USER)'}.`,
        'success'
      );
    },
    [user, recordAdminLog, pushNotification]
  );

  const adminAddOrVerifyPayout = useCallback(
    (payout: PayoutRecordItem) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) return;
      setPayouts((prev) => {
        const exists = prev.some((p) => p.id === payout.id);
        return exists ? prev.map((p) => (p.id === payout.id ? payout : p)) : [payout, ...prev];
      });
      void safeFirestoreWrite('payouts', payout.id, payout);
      fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payouts: [payout] }),
      }).catch(() => {});
      recordAdminLog(
        'VERIFY_PAYOUT',
        payout.id,
        `Recorded ${payout.status} payout of $${payout.amountUsd.toLocaleString()} for ${payout.username}`
      );
      pushNotification('Payout Registry Updated', `Saved payout record for ${payout.username}.`, 'success');
    },
    [user, safeFirestoreWrite, recordAdminLog, pushNotification]
  );

  const adminSaveSpinReward = useCallback(
    (reward: SpinRewardSegment) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) return;
      setSpinRewards((prev) => {
        const exists = prev.some((r) => r.id === reward.id);
        return exists ? prev.map((r) => (r.id === reward.id ? reward : r)) : [...prev, reward];
      });
    },
    [user]
  );

  const adminAddTestimonial = useCallback(
    (testimonial: TestimonialRecord) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) return;
      setTestimonials((prev) => [testimonial, ...prev]);
      recordAdminLog('VERIFY_TESTIMONIAL', testimonial.id, `Verified trader review by ${testimonial.traderName}`);
      pushNotification('Testimonial Verified', `Published review from ${testimonial.traderName}.`, 'success');
    },
    [user, recordAdminLog, pushNotification]
  );

  const adminCreateUserAndAccount = useCallback(
    (input: AdminCreateUserInput) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required to create user credentials.' };
      }
      const cleanEmail = input.email.trim().toLowerCase();
      const cleanPass = input.password.trim();
      const cleanName = input.fullName.trim();

      if (!cleanEmail || !cleanPass || !cleanName) {
        return { ok: false, error: 'Full name, email address, and initial password are required.' };
      }
      if (cleanPass.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters.' };
      }

      const existing = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        return { ok: false, error: `A user with email ${cleanEmail} is already registered.` };
      }

      const uid = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const passwordHash = hashPasswordVerifier(cleanEmail, cleanPass);

      const newProfile: UserProfileData = {
        uid,
        fullName: cleanName,
        email: cleanEmail,
        country: input.country || 'India',
        referralCode: `APEX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        role: input.role || 'user',
        rewardPoints: 100,
        mfaEnabled: false,
        deletionRequested: false,
        passwordHash,
        passwordUpdatedAt: Date.now(),
        isSeedDefault: false,
        createdAt: new Date().toISOString(),
      };

      setAllUsers((prev) => mergeUserDirectories(prev, [newProfile]));
      fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: [newProfile] }),
      }).catch(() => {});

      void safeFirestoreWrite('users', uid, newProfile);

      dispatchFundedApexEmail(
        buildRegistrationWelcomeEmailPayload({
          recipientEmail: cleanEmail,
          recipientName: cleanName,
          referralCode: newProfile.referralCode,
          country: newProfile.country,
        })
      );

      let createdAccount: TradingAccountRecord | undefined = undefined;
      const shouldCreateAccount = input.createAccount !== false;
      if (shouldCreateAccount) {
        const initialBal = input.accountSize || 50000;
        const chType = input.challengeType || 'two_step';
        const typeLabels: Record<ChallengeType, string> = {
          instant: 'Instant Funding',
          one_step: 'One Step Challenge',
          two_step: 'Two Step Challenge',
          three_step: 'Three Step Challenge',
        };
        const acctNum = `FA-${Math.floor(100000 + Math.random() * 900000)}`;
        const termUserId = `APEX-ID-${Math.floor(1000 + Math.random() * 9000)}`;
        const termPassword = `APEX-${Math.floor(1000 + Math.random() * 9000)}`;
        createdAccount = {
          id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          accountNumber: acctNum,
          userId: uid,
          userEmail: cleanEmail,
          challengeId: `${chType.replace('_', '-')}-${initialBal}`,
          challengeTitle: `${typeLabels[chType]} ($${initialBal.toLocaleString()})`,
          challengeType: chType,
          accountSize: initialBal,
          startingBalance: initialBal,
          balance: initialBal,
          equity: initialBal,
          usedMargin: 0,
          freeMargin: initialBal,
          profitTargetPct: chType === 'instant' ? 0 : chType === 'one_step' ? 10 : 8,
          dailyDrawdownPct: chType === 'instant' ? 3 : chType === 'one_step' ? 4 : 5,
          maxDrawdownPct: chType === 'instant' ? 6 : chType === 'three_step' ? 12 : 10,
          minTradingDays: chType === 'instant' ? 5 : 3,
          tradingDaysCount: 1,
          leverage: input.leverage || 100,
          profitSplitPct: chType === 'instant' ? 80 : chType === 'one_step' ? 85 : 90,
          currentStep: 1,
          totalSteps: chType === 'instant' ? 0 : chType === 'one_step' ? 1 : chType === 'two_step' ? 2 : 3,
          peakEquity: initialBal,
          dailyStartingEquity: initialBal,
          lastDailyResetDate: new Date().toISOString().split('T')[0],
          status: 'active',
          terminalUserId: termUserId,
          terminalPassword: termPassword,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setAccounts((prev) => [createdAccount!, ...prev]);
        void safeFirestoreWrite('trading_accounts', createdAccount.id, createdAccount);

        dispatchTerminalCredentialsEmail({
          recipientEmail: cleanEmail,
          recipientName: cleanName,
          accountId: createdAccount.id,
          accountNumber: createdAccount.accountNumber,
          challengeId: createdAccount.challengeId,
          challengeTitle: createdAccount.challengeTitle,
          terminalUserId: termUserId,
          terminalPassword: termPassword,
          triggeredBy: 'account_allocation',
        });
      }

      recordAdminLog(
        'CREATE_USER_CREDENTIALS',
        uid,
        `Admin created credentials for ${cleanEmail} (Role: ${newProfile.role.toUpperCase()}) with ${
          createdAccount
            ? `allocated account #${createdAccount.accountNumber} ($${createdAccount.startingBalance.toLocaleString()})`
            : 'no initial account'
        }`
      );

      pushNotification(
        'Trader Account Created & Credentials Emailed ✓',
        `Generated login & terminal credentials for ${cleanEmail} and dispatched email notification.`,
        'success'
      );

      return {
        ok: true,
        user: newProfile,
        account: createdAccount,
        plainPassword: cleanPass,
      };
    },
    [user, allUsers, safeFirestoreWrite, dispatchFundedApexEmail, dispatchTerminalCredentialsEmail, recordAdminLog, pushNotification]
  );

  // Manual Account Allocation to any existing user by Admin
  const adminAllocateAccountToUser = useCallback(
    (input: { targetUid: string; challengeId: string }) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required.' };
      }
      const targetUser = allUsers.find((u) => u.uid === input.targetUid);
      if (!targetUser) {
        return { ok: false, error: 'Target trader not found.' };
      }
      const template =
        challenges.find((c) => c.id === input.challengeId) ||
        INITIAL_CHALLENGES.find((c) => c.id === input.challengeId) ||
        INITIAL_CHALLENGES[0];

      const acctNum = `FA-${Math.floor(100000 + Math.random() * 900000)}`;
      const termUserId =
        template.terminalUserId || `APEX-ID-${Math.floor(1000 + Math.random() * 9000)}`;
      const termPassword =
        template.terminalPassword || `APEX-${Math.floor(1000 + Math.random() * 9000)}`;
      const allocatedAcc: TradingAccountRecord = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        accountNumber: acctNum,
        userId: targetUser.uid,
        userEmail: targetUser.email.toLowerCase(),
        challengeId: template.id,
        challengeTitle: template.title,
        challengeType: template.type,
        accountSize: template.accountSize,
        startingBalance: template.startingBalance,
        balance: template.startingBalance,
        equity: template.startingBalance,
        usedMargin: 0,
        freeMargin: template.startingBalance,
        profitTargetPct: template.profitTargetPct,
        dailyDrawdownPct: template.dailyDrawdownPct,
        maxDrawdownPct: template.maxDrawdownPct,
        minTradingDays: template.minTradingDays,
        tradingDaysCount: 1,
        leverage: template.leverage,
        profitSplitPct: template.profitSplitPct,
        currentStep: 1,
        totalSteps: template.type === 'instant' ? 0 : template.type === 'one_step' ? 1 : template.type === 'two_step' ? 2 : 3,
        peakEquity: template.startingBalance,
        dailyStartingEquity: template.startingBalance,
        lastDailyResetDate: new Date().toISOString().split('T')[0],
        status: 'active',
        terminalUserId: termUserId,
        terminalPassword: termPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setAccounts((prev) => [allocatedAcc, ...prev]);
      void safeFirestoreWrite('trading_accounts', allocatedAcc.id, allocatedAcc);

      dispatchTerminalCredentialsEmail({
        recipientEmail: targetUser.email,
        recipientName: targetUser.fullName,
        accountId: allocatedAcc.id,
        accountNumber: allocatedAcc.accountNumber,
        challengeId: allocatedAcc.challengeId,
        challengeTitle: allocatedAcc.challengeTitle,
        terminalUserId: termUserId,
        terminalPassword: termPassword,
        triggeredBy: 'account_allocation',
      });

      recordAdminLog(
        'MANUAL_ACCOUNT_ALLOCATION',
        allocatedAcc.id,
        `Admin manually allocated #${acctNum} (${template.title}) to ${targetUser.email}`
      );
      pushNotification(
        'Account Allocated & Credentials Emailed ✓',
        `Assigned #${acctNum} (${template.title}) to ${targetUser.fullName} and emailed Terminal User ID & Password.`,
        'success'
      );

      return { ok: true, account: allocatedAcc };
    },
    [user, allUsers, challenges, safeFirestoreWrite, dispatchTerminalCredentialsEmail, recordAdminLog, pushNotification]
  );

  const adminResetUserPassword = useCallback(
    (targetUid: string, newPassword: string) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required to reset passwords.' };
      }
      const cleanPass = newPassword.trim();
      if (cleanPass.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters.' };
      }
      const target = allUsers.find((u) => u.uid === targetUid);
      if (!target) {
        return { ok: false, error: 'Target user not found in directory.' };
      }

      const newHash = hashPasswordVerifier(target.email.toLowerCase(), cleanPass);
      const updatedTarget: UserProfileData = {
        ...target,
        passwordHash: newHash,
        passwordUpdatedAt: Date.now(),
        isSeedDefault: false,
      };
      setAllUsers((prev) => mergeUserDirectories(prev, [updatedTarget]));

      if (user.uid === targetUid || user.email.toLowerCase() === target.email.toLowerCase()) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                passwordHash: newHash,
                passwordUpdatedAt: updatedTarget.passwordUpdatedAt,
                isSeedDefault: false,
              }
            : prev
        );
      }

      fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: [updatedTarget] }),
      }).catch(() => {});

      void safeFirestoreWrite('users', targetUid, { passwordHash: newHash });

      dispatchFundedApexEmail(
        buildPasswordResetEmailPayload({
          recipientEmail: target.email,
          recipientName: target.fullName,
          resetCodeOrPassword: cleanPass,
          initiatedBy: 'admin_reset',
        })
      );

      recordAdminLog('ADMIN_RESET_PASSWORD', targetUid, `Admin reset password for ${target.email} and dispatched email`);
      pushNotification(
        'Password Reset & Email Dispatched ✓',
        `Updated login password for ${target.email} and emailed new credentials.`,
        'success'
      );

      return { ok: true, message: `Password for ${target.email} has been updated and emailed.` };
    },
    [user, allUsers, safeFirestoreWrite, dispatchFundedApexEmail, recordAdminLog, pushNotification]
  );

  const adminDeleteUser = useCallback(
    (targetUid: string) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required.' };
      }
      const target = allUsers.find((u) => u.uid === targetUid);
      if (!target) return { ok: false, error: 'User not found.' };

      setAllUsers((prev) => prev.filter((u) => u.uid !== targetUid));
      setAccounts((prev) => prev.filter((a) => a.userId !== targetUid));

      recordAdminLog('DELETE_USER', targetUid, `Deleted user ${target.email} and associated evaluation accounts`);
      pushNotification('User Removed', `Removed ${target.email} from the registry.`, 'info');
      return { ok: true };
    },
    [user, allUsers, recordAdminLog, pushNotification]
  );

  // Admin Coupon Code Creator & Manager
  const adminCreateCoupon = useCallback(
    (input: { code: string; discountPct: number; description: string }) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required.' };
      }
      const cleanCode = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!cleanCode || cleanCode.length < 3) {
        return { ok: false, error: 'Coupon code must be at least 3 characters (letters/numbers).' };
      }
      if (adminCoupons.some((c) => c.code.toUpperCase() === cleanCode)) {
        return { ok: false, error: `Coupon code ${cleanCode} already exists.` };
      }
      const pct = Math.min(100, Math.max(1, Math.round(input.discountPct)));
      const newCoupon: AdminCouponRecord = {
        id: `adm-cpn-${Date.now()}`,
        code: cleanCode,
        discountPct: pct,
        description: input.description.trim() || `${pct}% OFF Evaluation Coupon`,
        active: true,
        createdAt: new Date().toISOString(),
      };
      setAdminCoupons((prev) => [newCoupon, ...prev]);
      dispatchFundedApexEmail(
        buildPromotionalOfferEmailPayload({
          recipientEmail: 'all@fundedapex.com',
          recipientName: 'FUNDED APEX Traders',
          offerTitle: newCoupon.description,
          discountPct: pct,
          promoCode: cleanCode,
          challengeId: 'two-step-5000',
          challengeTitle: '$5K – $200K Evaluation Programs',
        })
      );
      recordAdminLog('CREATE_COUPON', newCoupon.id, `Created coupon ${cleanCode} (${pct}% OFF) and broadcast promotional email`);
      pushNotification('Coupon Created & Promo Email Broadcast ✓', `Coupon ${cleanCode} (${pct}% OFF) is now live and emailed to traders.`, 'success');
      return { ok: true, coupon: newCoupon };
    },
    [user, adminCoupons, dispatchFundedApexEmail, recordAdminLog, pushNotification]
  );

  const adminBroadcastPromotionalEmail = useCallback(
    (input: {
      recipientEmail?: string;
      recipientName?: string;
      offerTitle: string;
      discountPct: number;
      promoCode: string;
      challengeId?: string;
      challengeTitle?: string;
      originalPriceUsd?: number;
      discountedPriceUsd?: number;
    }) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required.' };
      }
      const cleanPromo = input.promoCode.trim().toUpperCase() || '5K30OFF';
      const cleanTitle = input.offerTitle.trim() || `${input.discountPct}% OFF Evaluation Flash Promo`;
      const targetEmail = (input.recipientEmail || 'all@fundedapex.com').trim().toLowerCase();
      const targetName = (input.recipientName || (targetEmail === 'all@fundedapex.com' ? 'FUNDED APEX Traders' : targetEmail.split('@')[0])).trim();

      const mail = dispatchFundedApexEmail(
        buildPromotionalOfferEmailPayload({
          recipientEmail: targetEmail,
          recipientName: targetName,
          offerTitle: cleanTitle,
          discountPct: Math.min(100, Math.max(1, Math.round(input.discountPct || 30))),
          promoCode: cleanPromo,
          challengeId: input.challengeId || 'two-step-5000',
          challengeTitle: input.challengeTitle || '$5K Starter Two-Step Evaluation',
          originalPriceUsd: input.originalPriceUsd,
          discountedPriceUsd: input.discountedPriceUsd,
        })
      );

      recordAdminLog(
        'BROADCAST_PROMO_EMAIL',
        mail.id,
        `Dispatched promotional offer "${cleanTitle}" (Code: ${cleanPromo}) to ${targetEmail}`
      );
      pushNotification(
        'Promotional Offer Email Dispatched ✓',
        `Sent "${cleanTitle}" (Code: ${cleanPromo}) to ${targetEmail}.`,
        'success'
      );
      return { ok: true, email: mail };
    },
    [user, dispatchFundedApexEmail, recordAdminLog, pushNotification]
  );

  const adminSendEmailNotification = useCallback(
    (input: {
      eventType: EmailEventType;
      recipientEmail: string;
      recipientName: string;
      challengeStatus?: ChallengeStatusEmailType;
      accountNumber?: string;
      challengeTitle?: string;
      accountSize?: number;
      breachOrStatusReason?: string;
      promoCode?: string;
      discountPct?: number;
    }) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required.' };
      }
      const cleanEmail = input.recipientEmail.trim().toLowerCase() || 'all@fundedapex.com';
      const cleanName = input.recipientName.trim() || 'FUNDED APEX Trader';

      let payload: FundedApexEmailPayload;
      if (input.eventType === 'registration_welcome') {
        payload = buildRegistrationWelcomeEmailPayload({
          recipientEmail: cleanEmail,
          recipientName: cleanName,
          referralCode: 'APEX-VIP',
          country: 'Global',
        });
      } else if (input.eventType === 'password_reset') {
        payload = buildPasswordResetEmailPayload({
          recipientEmail: cleanEmail,
          recipientName: cleanName,
          resetCodeOrPassword: `APEX-RST-${Math.floor(100000 + Math.random() * 900000)}`,
          initiatedBy: 'admin_reset',
        });
      } else if (input.eventType === 'challenge_status_update') {
        payload = buildChallengeStatusUpdateEmailPayload({
          recipientEmail: cleanEmail,
          recipientName: cleanName,
          accountNumber: input.accountNumber || 'FA-882410',
          challengeId: 'two-step-50000',
          challengeTitle: input.challengeTitle || 'Two Step Challenge ($50,000)',
          accountSize: input.accountSize || 50000,
          status: input.challengeStatus || 'passed',
          reason: input.breachOrStatusReason,
          currentBalance: input.accountSize || 50000,
          currentEquity: input.accountSize || 50000,
          currentStep: 1,
          totalSteps: 2,
          profitSplitPct: 90,
        });
      } else if (input.eventType === 'promotional_offer') {
        payload = buildPromotionalOfferEmailPayload({
          recipientEmail: cleanEmail,
          recipientName: cleanName,
          offerTitle: `${input.discountPct || 30}% OFF Exclusive Prop Firm Evaluation Offer`,
          discountPct: input.discountPct || 30,
          promoCode: (input.promoCode || '5K30OFF').toUpperCase(),
          challengeId: 'two-step-5000',
          challengeTitle: input.challengeTitle || '$5K Starter Two-Step Evaluation',
          originalPriceUsd: 10,
          discountedPriceUsd: 7,
        });
      } else {
        payload = buildTerminalCredentialsEmailPayload({
          recipientEmail: cleanEmail,
          recipientName: cleanName,
          accountId: 'acc-manual',
          accountNumber: input.accountNumber || 'FA-882410',
          challengeId: 'two-step-50000',
          challengeTitle: input.challengeTitle || 'Two Step Challenge ($50,000)',
          terminalUserId: 'APEX-ID-8410',
          terminalPassword: 'APEX-2026',
          triggeredBy: 'admin_account_update',
        });
      }

      dispatchFundedApexEmail(payload);
      recordAdminLog(
        'DISPATCH_EMAIL_NOTIFICATION',
        payload.id,
        `Sent ${input.eventType.toUpperCase()} email to ${cleanEmail}`
      );
      pushNotification(
        'Branded Email Dispatched ✓',
        `Sent ${payload.subject} to ${cleanEmail}.`,
        'success'
      );
      return { ok: true, email: payload };
    },
    [user, dispatchFundedApexEmail, recordAdminLog, pushNotification]
  );

  const adminSendManualEmail = useCallback(
    (input: CustomManualEmailInput) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required.' };
      }
      const cleanEmail = (input.recipientEmail || '').trim();
      if (!cleanEmail) {
        return { ok: false, error: 'Recipient email address is required.' };
      }
      if (!input.subject || !input.subject.trim()) {
        return { ok: false, error: 'Email subject line is required.' };
      }
      if (!input.bodyTextOrHtml || !input.bodyTextOrHtml.trim()) {
        return { ok: false, error: 'Email message body cannot be empty.' };
      }

      const payload = buildCustomManualEmailPayload({
        ...input,
        adminSenderEmail: user.email || FUNDED_APEX_SUPPORT_EMAIL,
      });

      dispatchFundedApexEmail(payload);
      recordAdminLog(
        'DISPATCH_MANUAL_EMAIL',
        payload.id,
        `Sent manual professional email "${payload.subject}" to ${cleanEmail}`
      );
      pushNotification(
        'Professional Email Dispatched ✓',
        `Delivered "${payload.subject}" to ${cleanEmail}.`,
        'success'
      );
      return { ok: true, email: payload };
    },
    [user, dispatchFundedApexEmail, recordAdminLog, pushNotification]
  );

  const adminToggleCoupon = useCallback(
    (couponId: string) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) return;
      setAdminCoupons((prev) =>
        prev.map((c) => (c.id === couponId ? { ...c, active: !c.active } : c))
      );
      pushNotification('Coupon Updated', 'Toggled coupon active status.', 'info');
    },
    [user, pushNotification]
  );

  const adminDeleteCoupon = useCallback(
    (couponId: string) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) return;
      setAdminCoupons((prev) => prev.filter((c) => c.id !== couponId));
      pushNotification('Coupon Deleted', 'Removed coupon code from system.', 'info');
    },
    [user, pushNotification]
  );

  // Admin Payment Gateway Details Config (Crypto Wallets & Terminal Passcode)
  const adminSavePaymentSettings = useCallback(
    (settings: PaymentGatewaySettings) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) return;
      setPaymentSettings(settings);
      recordAdminLog(
        'UPDATE_PAYMENT_METHODS',
        'payment_gateway',
        `Updated USDT BEP20 (${(settings.cryptoUsdtBep20 || settings.cryptoUsdtTrc20).slice(0, 10)}...) and Terminal Access Passcode settings`
      );
      pushNotification(
        'USDT (BEP-20) & Passcode Saved ✓',
        'USDT (BEP-20) deposit details and Terminal Access Passcode have been updated.',
        'success'
      );
    },
    [user, recordAdminLog, pushNotification]
  );

  // Admin Approval / Rejection of Client Account Purchase Requests
  const adminApprovePurchaseRequest = useCallback(
    (requestId: string) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required.' };
      }
      const req = purchaseRequests.find((r) => r.id === requestId);
      if (!req) {
        return { ok: false, error: 'Purchase request not found.' };
      }
      if (req.status === 'approved') {
        return { ok: false, error: 'This request has already been approved.' };
      }

      const template =
        challenges.find((c) => c.id === req.challengeId) ||
        INITIAL_CHALLENGES.find((c) => c.id === req.challengeId) ||
        INITIAL_CHALLENGES[0];

      const cleanReqEmail = (req.userEmail || '').trim().toLowerCase();
      const matchedDirectoryUser = allUsers.find(
        (u) => u.uid === req.userId || (cleanReqEmail && u.email.toLowerCase() === cleanReqEmail)
      );
      const effectiveOwnerUid = matchedDirectoryUser?.uid || req.userId;

      if (!matchedDirectoryUser && cleanReqEmail) {
        const autoProfile: UserProfileData = {
          uid: effectiveOwnerUid,
          fullName: req.userFullName || 'FUNDED APEX Trader',
          email: cleanReqEmail,
          country: 'United States',
          referralCode: `APEX-${effectiveOwnerUid.slice(-6).toUpperCase()}`,
          role: 'user',
          rewardPoints: 0,
          mfaEnabled: false,
          deletionRequested: false,
          createdAt: new Date().toISOString(),
        };
        setAllUsers((prev) => [autoProfile, ...prev]);
        void safeFirestoreWrite('users', effectiveOwnerUid, autoProfile);
      }

      const acctNum = `FA-${Math.floor(100000 + Math.random() * 900000)}`;
      const termUserId =
        template.terminalUserId || `APEX-ID-${Math.floor(1000 + Math.random() * 9000)}`;
      const termPassword =
        template.terminalPassword || `APEX-${Math.floor(1000 + Math.random() * 9000)}`;
      const newAcc: TradingAccountRecord = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        accountNumber: acctNum,
        userId: effectiveOwnerUid,
        userEmail: cleanReqEmail || matchedDirectoryUser?.email.toLowerCase(),
        challengeId: template.id,
        challengeTitle: template.title,
        challengeType: template.type,
        accountSize: template.accountSize,
        startingBalance: template.startingBalance,
        balance: template.startingBalance,
        equity: template.startingBalance,
        usedMargin: 0,
        freeMargin: template.startingBalance,
        profitTargetPct: template.profitTargetPct,
        dailyDrawdownPct: template.dailyDrawdownPct,
        maxDrawdownPct: template.maxDrawdownPct,
        minTradingDays: template.minTradingDays,
        tradingDaysCount: 1,
        leverage: template.leverage,
        profitSplitPct: template.profitSplitPct,
        currentStep: 1,
        totalSteps: template.type === 'instant' ? 0 : template.type === 'one_step' ? 1 : template.type === 'two_step' ? 2 : 3,
        peakEquity: template.startingBalance,
        dailyStartingEquity: template.startingBalance,
        lastDailyResetDate: new Date().toISOString().split('T')[0],
        status: 'active',
        terminalUserId: termUserId,
        terminalPassword: termPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setAccounts((prev) => [newAcc, ...prev]);
      void safeFirestoreWrite('accounts', newAcc.id, newAcc);
      void safeFirestoreWrite('trading_accounts', newAcc.id, newAcc);
      if (effectiveOwnerUid === user.uid || cleanReqEmail === user.email.toLowerCase()) {
        setActiveAccountId(newAcc.id);
        setIsTerminalUnlocked(true);
      }

      dispatchTerminalCredentialsEmail({
        recipientEmail: req.userEmail,
        recipientName: req.userFullName,
        accountId: newAcc.id,
        accountNumber: newAcc.accountNumber,
        challengeId: newAcc.challengeId,
        challengeTitle: newAcc.challengeTitle,
        terminalUserId: termUserId,
        terminalPassword: termPassword,
        triggeredBy: 'account_allocation',
      });

      const approvedReq: AccountPurchaseRequest = {
        ...req,
        status: 'approved',
        allocatedAccountNumber: acctNum,
        reviewedAt: new Date().toISOString(),
      };

      setPurchaseRequests((prev) =>
        prev.map((r) => (r.id === requestId ? approvedReq : r))
      );

      void safeFirestoreWrite('purchaseRequests', approvedReq.id, approvedReq);
      void safeFirestoreWrite('purchase_requests', approvedReq.id, approvedReq);

      fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: [newAcc],
          purchaseRequests: [approvedReq],
        }),
      }).catch(() => {});

      recordAdminLog(
        'APPROVE_ACCOUNT_PURCHASE',
        req.id,
        `Approved Order ${req.orderNumber} (${req.paymentMethod} Ref: ${req.transactionRef}) -> Activated Account #${acctNum} for ${req.userEmail}`
      );

      pushNotification(
        'Purchase Confirmed & Credentials Emailed ✓',
        `Approved Order #${req.orderNumber}. Activated Account #${acctNum} & emailed Terminal ID/Pass to ${req.userEmail}!`,
        'success'
      );

      return { ok: true, account: newAcc };
    },
    [user, purchaseRequests, challenges, safeFirestoreWrite, dispatchTerminalCredentialsEmail, recordAdminLog, pushNotification]
  );

  const adminRejectPurchaseRequest = useCallback(
    (requestId: string) => {
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        return { ok: false, error: 'Unauthorized: Admin role required.' };
      }
      const req = purchaseRequests.find((r) => r.id === requestId);
      if (!req) return { ok: false, error: 'Purchase request not found.' };

      const rejectedReq: AccountPurchaseRequest = {
        ...req,
        status: 'rejected',
        reviewedAt: new Date().toISOString(),
      };

      setPurchaseRequests((prev) =>
        prev.map((r) => (r.id === requestId ? rejectedReq : r))
      );

      void safeFirestoreWrite('purchaseRequests', rejectedReq.id, rejectedReq);
      void safeFirestoreWrite('purchase_requests', rejectedReq.id, rejectedReq);

      fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequests: [rejectedReq],
        }),
      }).catch(() => {});

      recordAdminLog(
        'REJECT_ACCOUNT_PURCHASE',
        req.id,
        `Rejected Order ${req.orderNumber} (${req.userEmail}, Ref: ${req.transactionRef})`
      );
      pushNotification(
        'Purchase Request Rejected',
        `Order #${req.orderNumber} for ${req.userEmail} has been marked as rejected.`,
        'warning'
      );
      return { ok: true };
    },
    [user, purchaseRequests, safeFirestoreWrite, recordAdminLog, pushNotification]
  );

  const uploadAccountCertificateImage = useCallback(
    (accountId: string, imageUrl: string) => {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id !== accountId) return acc;
          const updated = {
            ...acc,
            certificateImageUrl: imageUrl,
            updatedAt: new Date().toISOString(),
          };
          void safeFirestoreWrite('trading_accounts', acc.id, updated);
          return updated;
        })
      );
      setPaymentSettings((prev) => {
        const nextAccountCerts = { ...(prev.accountCertificates || {}) };
        if (imageUrl) {
          nextAccountCerts[accountId] = imageUrl;
        } else {
          delete nextAccountCerts[accountId];
        }
        const nextSettings: PaymentGatewaySettings = {
          ...prev,
          accountCertificates: nextAccountCerts,
        };
        void safeFirestoreWrite('platform_config', 'payment_settings', nextSettings);
        return nextSettings;
      });
      pushNotification(
        imageUrl ? 'Account Certificate Image Uploaded ✓' : 'Account Certificate Reset',
        imageUrl
          ? 'Custom certificate image saved for this specific trading account.'
          : 'Reverted to default certificate template for this account.',
        'success'
      );
    },
    [pushNotification]
  );

  const uploadChallengeCertificateImage = useCallback(
    (challengeType: ChallengeType, imageUrl: string) => {
      setPaymentSettings((prev) => {
        const nextChallengeCerts = { ...(prev.challengeCertificates || {}) };
        if (imageUrl) {
          nextChallengeCerts[challengeType] = imageUrl;
        } else {
          delete nextChallengeCerts[challengeType];
        }
        const nextSettings: PaymentGatewaySettings = {
          ...prev,
          challengeCertificates: nextChallengeCerts,
        };
        void safeFirestoreWrite('platform_config', 'payment_settings', nextSettings);
        return nextSettings;
      });
      pushNotification(
        imageUrl ? 'Challenge Certificate Image Uploaded ✓' : 'Challenge Certificate Reset',
        imageUrl
          ? `Custom certificate image saved for ${challengeType.replace('_', ' ').toUpperCase()} challenge.`
          : `Reverted ${challengeType.replace('_', ' ').toUpperCase()} certificate template to default.`,
        'success'
      );
    },
    [pushNotification]
  );

  return (
    <PlatformContext.Provider
      value={{
        route,
        navigate,
        user,
        authLoading,
        quotes,
        liveFeedStatus,
        refreshLiveQuotes,
        refreshVaultData,
        challenges,
        accounts: userAccounts,
        allAccounts: accounts,
        activeAccountId,
        setActiveAccountId,
        activeAccount,
        orders,
        notifications,
        adminLogs,
        allUsers,
        userCoupons,
        adminCoupons,
        paymentSettings,
        purchaseRequests,
        userPurchaseRequests,
        emailNotifications,
        userEmailNotifications,
        markEmailNotificationRead,
        adminBroadcastPromotionalEmail,
        adminSendEmailNotification,
        adminSendManualEmail,
        payouts,
        userPayoutRequests,
        verifiedPayouts,
        leaderboard,
        testimonials,
        spinRewards,
        liveStats,
        toastMessage,
        clearToast,
        pushNotification,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        completeGoogleSignInWithProfile,
        sendPasswordReset,
        resendVerificationEmail,
        logout,
        updateUserProfile,
        changeUserPassword,
        stripeCheckoutSession,
        openStripeCheckout,
        closeStripeCheckout,
        submitAccountPurchaseRequest,
        completeStripeCheckoutPayment,
        startChallengeEvaluation,
        redeemSpinCodeOrAddAccount,
        submitOrder,
        modifyOrder,
        closePosition,
        cancelPendingOrder,
        requestAccountPayout,
        spinDailyWheel,
        adminSaveChallenge,
        adminToggleArchiveChallenge,
        adminUpdateAccountStatus,
        adminUpdateAccountTerminalPassword,
        adminGenerateAllAccountPasscodes,
        adminUpdateUserRole,
        adminAddOrVerifyPayout,
        adminApprovePayoutRequest,
        adminRejectPayoutRequest,
        adminSaveSpinReward,
        adminAddTestimonial,
        adminCreateUserAndAccount,
        adminAllocateAccountToUser,
        adminResetUserPassword,
        adminDeleteUser,
        adminCreateCoupon,
        adminToggleCoupon,
        adminDeleteCoupon,
        adminSavePaymentSettings,
        uploadAccountCertificateImage,
        uploadChallengeCertificateImage,
        adminApprovePurchaseRequest,
        adminRejectPurchaseRequest,
        isTerminalUnlocked,
        unlockTerminal,
        lockTerminal,
        quotesRef,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used inside PlatformProvider');
  return ctx;
}
