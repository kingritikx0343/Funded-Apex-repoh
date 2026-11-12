import { ChallengeType, PayoutRecordItem } from '../engine/tradingEngine';

export const ACCOUNT_SIZES = [5000, 10000, 25000, 50000, 100000, 200000] as const;

export interface ChallengeTemplate {
  id: string;
  title: string;
  type: ChallengeType;
  typeLabel: string;
  accountSize: number;
  priceUsd: number;
  startingBalance: number;
  profitTargetPct: number;
  phase2TargetPct?: number;
  phase3TargetPct?: number;
  dailyDrawdownPct: number;
  maxDrawdownPct: number;
  minTradingDays: number;
  maxTradingDays: number; // 0 = unlimited
  leverage: number;
  profitSplitPct: number;
  instruments: string[];
  status: 'available' | 'archived';
  expirationDays: number;
  terminalUserId?: string;
  terminalPassword?: string;
}

const INSTANT_PRICES: Record<number, number> = {
  5000: 39,
  10000: 79,
  25000: 159,
  50000: 289,
  100000: 549,
  200000: 999,
};

const ONE_STEP_PRICES: Record<number, number> = {
  5000: 24,
  10000: 49,
  25000: 99,
  50000: 189,
  100000: 349,
  200000: 649,
};

const TWO_STEP_PRICES: Record<number, number> = {
  5000: 17,
  10000: 35,
  25000: 79,
  50000: 149,
  100000: 279,
  200000: 499,
};

const THREE_STEP_PRICES: Record<number, number> = {
  5000: 14,
  10000: 29,
  25000: 59,
  50000: 119,
  100000: 219,
  200000: 399,
};

const ALL_INSTRUMENTS = [
  'XAUUSD',
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'BTCUSD',
  'ETHUSD',
  'NAS100',
  'US30',
  'US500',
];

export const INITIAL_CHALLENGES: ChallengeTemplate[] = [
  // INSTANT FUNDING ($5K to $200K) — Direct Funded from Day 1 (No Profit Target)
  ...ACCOUNT_SIZES.map((size) => ({
    id: `instant-${size}`,
    title: `$${size.toLocaleString()} Instant Funding`,
    type: 'instant' as ChallengeType,
    typeLabel: 'Instant Funding',
    accountSize: size,
    priceUsd: INSTANT_PRICES[size] ?? 39,
    startingBalance: size,
    profitTargetPct: 0,
    dailyDrawdownPct: 3,
    maxDrawdownPct: 6,
    minTradingDays: 5,
    maxTradingDays: 0,
    leverage: 30,
    profitSplitPct: 80,
    instruments: ALL_INSTRUMENTS,
    status: 'available' as const,
    expirationDays: 365,
  })),
  // ONE STEP CHALLENGE ($5K to $200K)
  ...ACCOUNT_SIZES.map((size) => ({
    id: `one-step-${size}`,
    title: `$${size.toLocaleString()} One Step Challenge`,
    type: 'one_step' as ChallengeType,
    typeLabel: 'One Step Challenge',
    accountSize: size,
    priceUsd: ONE_STEP_PRICES[size] ?? 24,
    startingBalance: size,
    profitTargetPct: 10,
    dailyDrawdownPct: 4,
    maxDrawdownPct: 6,
    minTradingDays: 3,
    maxTradingDays: 0,
    leverage: 50,
    profitSplitPct: 85,
    instruments: ALL_INSTRUMENTS,
    status: 'available' as const,
    expirationDays: 365,
  })),
  // TWO STEP CHALLENGE ($5K = $17, up to $200K)
  ...ACCOUNT_SIZES.map((size) => ({
    id: `two-step-${size}`,
    title: `$${size.toLocaleString()} Two Step Challenge`,
    type: 'two_step' as ChallengeType,
    typeLabel: 'Two Step Challenge',
    accountSize: size,
    priceUsd: TWO_STEP_PRICES[size] ?? 17,
    startingBalance: size,
    profitTargetPct: 8,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    maxDrawdownPct: 10,
    minTradingDays: 3,
    maxTradingDays: 0,
    leverage: 100,
    profitSplitPct: 90,
    instruments: ALL_INSTRUMENTS,
    status: 'available' as const,
    expirationDays: 365,
  })),
  // THREE STEP CHALLENGE ($5K to $200K)
  ...ACCOUNT_SIZES.map((size) => ({
    id: `three-step-${size}`,
    title: `$${size.toLocaleString()} Three Step Challenge`,
    type: 'three_step' as ChallengeType,
    typeLabel: 'Three Step Challenge',
    accountSize: size,
    priceUsd: THREE_STEP_PRICES[size] ?? 14,
    startingBalance: size,
    profitTargetPct: 6,
    phase2TargetPct: 6,
    phase3TargetPct: 6,
    dailyDrawdownPct: 5,
    maxDrawdownPct: 12,
    minTradingDays: 3,
    maxTradingDays: 0,
    leverage: 100,
    profitSplitPct: 90,
    instruments: ALL_INSTRUMENTS,
    status: 'available' as const,
    expirationDays: 365,
  })),
];

export interface SpinRewardSegment {
  id: string;
  label: string;
  points: number;
  description: string;
  accent: string;
  rewardType: 'coupon' | 'free_account';
  discountPct?: number;
  challengeId?: string;
  codePrefix: string;
}

export const SPIN_REWARDS: SpinRewardSegment[] = [
  {
    id: 'sp-80-off',
    label: '80% OFF Coupon',
    points: 200,
    description: '80% discount coupon code for any FUNDED APEX Evaluation Account',
    accent: '#10B981',
    rewardType: 'coupon',
    discountPct: 80,
    codePrefix: 'APEX80',
  },
  {
    id: 'sp-90-off',
    label: '90% OFF Coupon',
    points: 300,
    description: '90% super discount coupon code for any FUNDED APEX Evaluation Account',
    accent: '#00FFA3',
    rewardType: 'coupon',
    discountPct: 90,
    codePrefix: 'APEX90',
  },
  {
    id: 'sp-65-off',
    label: '65% OFF Coupon',
    points: 150,
    description: '65% discount coupon code for any FUNDED APEX Evaluation Account',
    accent: '#10B981',
    rewardType: 'coupon',
    discountPct: 65,
    codePrefix: 'APEX65',
  },
  {
    id: 'sp-5k-2step',
    label: 'Free $5K 2-Step',
    points: 500,
    description: 'Instant Free $5,000 Two Step Challenge Account ($17 Value)',
    accent: '#00FFA3',
    rewardType: 'free_account',
    discountPct: 100,
    challengeId: 'two-step-5000',
    codePrefix: 'FREE5K2S',
  },
  {
    id: 'sp-10k-2step',
    label: 'Free $10K 2-Step',
    points: 1000,
    description: 'Instant Free $10,000 Two Step Challenge Account ($35 Value)',
    accent: '#10B981',
    rewardType: 'free_account',
    discountPct: 100,
    challengeId: 'two-step-10000',
    codePrefix: 'FREE10K2S',
  },
  {
    id: 'sp-50-off',
    label: '50% OFF Coupon',
    points: 100,
    description: '50% discount coupon code for any FUNDED APEX Evaluation Account',
    accent: '#00FFA3',
    rewardType: 'coupon',
    discountPct: 50,
    codePrefix: 'APEX50',
  },
];

export const INITIAL_PAYOUTS: PayoutRecordItem[] = [
  {
    id: 'payout-101',
    traderName: 'Marcus Vance',
    username: '@marcus_quant',
    amountUsd: 16578.45,
    currency: 'USD (USDC)',
    status: 'Verified',
    paymentDate: '2026-10-29',
    accountSize: 200000,
    programType: 'Two Step Challenge',
  },
  {
    id: 'payout-102',
    traderName: 'Elena Rostova',
    username: '@elena_nas100',
    amountUsd: 13506.50,
    currency: 'USD (Wire)',
    status: 'Verified',
    paymentDate: '2026-10-28',
    accountSize: 100000,
    programType: 'One Step Challenge',
  },
  {
    id: 'payout-103',
    traderName: 'Kenji Takahashi',
    username: '@kenji_fx',
    amountUsd: 6876.22,
    currency: 'USD (USDT)',
    status: 'Verified',
    paymentDate: '2026-10-27',
    accountSize: 50000,
    programType: 'Two Step Challenge',
  },
  {
    id: 'payout-104',
    traderName: 'David Reynolds',
    username: '@dreynolds_us30',
    amountUsd: 10488.64,
    currency: 'USD (USDC)',
    status: 'Verified',
    paymentDate: '2026-10-25',
    accountSize: 100000,
    programType: 'Instant Funding',
  },
  {
    id: 'payout-105',
    traderName: 'Sofia Rossi',
    username: '@sofia_macro',
    amountUsd: 5308.33,
    currency: 'USD (Wire)',
    status: 'Verified',
    paymentDate: '2026-10-24',
    accountSize: 50000,
    programType: 'Three Step Challenge',
  },
  {
    id: 'payout-106',
    traderName: 'Lucas Baumann',
    username: '@lucas_gold',
    amountUsd: 2682.36,
    currency: 'USD (USDC)',
    status: 'Verified',
    paymentDate: '2026-10-22',
    accountSize: 25000,
    programType: 'Two Step Challenge',
  },
];

export interface LeaderboardEntry {
  rank: number;
  traderName: string;
  username: string;
  country: string;
  accountSize: number;
  challengeType: string;
  netProfitUsd: number;
  returnPct: number;
  winRatePct: number;
  primarySymbol: string;
  isSample: boolean;
}

export const SAMPLE_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    traderName: 'Marcus Vance',
    username: '@marcus_quant',
    country: 'United Kingdom',
    accountSize: 200000,
    challengeType: 'Two Step Challenge',
    netProfitUsd: 36840.5,
    returnPct: 18.42,
    winRatePct: 71.4,
    primarySymbol: 'XAUUSD',
    isSample: false,
  },
  {
    rank: 2,
    traderName: 'Elena Rostova',
    username: '@elena_nas100',
    country: 'Germany',
    accountSize: 100000,
    challengeType: 'One Step Challenge',
    netProfitUsd: 15890.0,
    returnPct: 15.89,
    winRatePct: 68.2,
    primarySymbol: 'NAS100',
    isSample: false,
  },
  {
    rank: 3,
    traderName: 'Kenji Takahashi',
    username: '@kenji_fx',
    country: 'Japan',
    accountSize: 50000,
    challengeType: 'Two Step Challenge',
    netProfitUsd: 7640.25,
    returnPct: 15.28,
    winRatePct: 65.8,
    primarySymbol: 'USDJPY',
    isSample: false,
  },
  {
    rank: 4,
    traderName: 'David Reynolds',
    username: '@dreynolds_us30',
    country: 'United States',
    accountSize: 100000,
    challengeType: 'Instant Funding',
    netProfitUsd: 13110.8,
    returnPct: 13.11,
    winRatePct: 64.0,
    primarySymbol: 'US30',
    isSample: false,
  },
  {
    rank: 5,
    traderName: 'Sofia Rossi',
    username: '@sofia_macro',
    country: 'Singapore',
    accountSize: 50000,
    challengeType: 'Three Step Challenge',
    netProfitUsd: 6245.1,
    returnPct: 12.49,
    winRatePct: 69.5,
    primarySymbol: 'EURUSD',
    isSample: false,
  },
  {
    rank: 6,
    traderName: 'Lucas Baumann',
    username: '@lucas_gold',
    country: 'Switzerland',
    accountSize: 25000,
    challengeType: 'Two Step Challenge',
    netProfitUsd: 2980.4,
    returnPct: 11.92,
    winRatePct: 62.1,
    primarySymbol: 'BTCUSD',
    isSample: false,
  },
];

export interface TestimonialRecord {
  id: string;
  traderName: string;
  username: string;
  country: string;
  accountSize: number;
  programType: string;
  rating: number;
  feedback: string;
  verified: boolean;
  date: string;
}

export const INITIAL_TESTIMONIALS: TestimonialRecord[] = [
  {
    id: 'rev-1',
    traderName: 'Marcus Vance',
    username: '@marcus_quant',
    country: 'United Kingdom',
    accountSize: 200000,
    programType: 'Two Step Challenge',
    rating: 5,
    feedback:
      'Executing directly on the FUNDED APEX TradingView terminal with zero MT4/MT5 plugin lag changed my execution precision. Drawdown telemetry is crystal clear and my $16,578 payout was verified within hours.',
    verified: true,
    date: 'Oct 2026',
  },
  {
    id: 'rev-2',
    traderName: 'Elena Rostova',
    username: '@elena_nas100',
    country: 'Germany',
    accountSize: 100000,
    programType: 'One Step Challenge',
    rating: 5,
    feedback:
      'The One Step Challenge rules are completely transparent. Having real-time margin and daily drawdown buffers calculated before every order helped me stay disciplined and pass in 6 trading days.',
    verified: true,
    date: 'Oct 2026',
  },
  {
    id: 'rev-3',
    traderName: 'Kenji Takahashi',
    username: '@kenji_fx',
    country: 'Japan',
    accountSize: 50000,
    programType: 'Two Step Challenge',
    rating: 5,
    feedback:
      'Started with the $5K Two-Step for $17 to test the execution engine, then scaled up to a $50K and $100K allocation. Up to 90% profit split and responsive trader support make FUNDED APEX stand out.',
    verified: true,
    date: 'Oct 2026',
  },
];

export const FAQ_ITEMS = [
  {
    category: 'Platform Overview',
    q: 'What is FUNDED APEX?',
    a: 'FUNDED APEX is a modern simulated proprietary trading firm where skilled traders demonstrate their discipline across structured trading challenges and receive allocated simulated capital up to $600,000 powered by our custom TradingView terminal and in-house order execution engine.',
  },
  {
    category: 'Funding Process',
    q: 'How does funding work?',
    a: 'You select your preferred program (Instant Funding, One Step, Two Step, or Three Step Challenge) in account sizes from $5K to $200K. Once you achieve the program profit target while respecting the daily and maximum drawdown rules over the minimum required trading days, your account is upgraded to a Funded Account with up to a 90% profit split.',
  },
  {
    category: 'Risk Governance',
    q: 'What are the trading rules?',
    a: 'Every program enforces transparent, automated risk parameters: stay within your Daily Drawdown limit (3%–5% depending on program), never breach the Maximum Drawdown floor (6%–12%), trade for at least the minimum required trading days (3–5 days), and execute all trades directly inside the authorized FUNDED APEX Trading Terminal.',
  },
  {
    category: 'Payouts & Rewards',
    q: 'How do payouts work?',
    a: 'Funded traders can request performance payouts directly from their dashboard. Verified payouts are processed via USD Wire, USDC, or USDT with up to a 90% profit split, and all verified payouts are recorded in our public payout registry.',
  },
  {
    category: 'Risk Governance',
    q: 'What is maximum drawdown?',
    a: 'Maximum drawdown is the overall static equity floor of your account relative to your initial starting balance (6% on Instant and One Step, 10% on Two Step, and 12% on Three Step). Your account balance or floating equity may never drop below this threshold.',
  },
  {
    category: 'Risk Governance',
    q: 'What is daily drawdown?',
    a: 'Daily drawdown is the maximum permitted loss within a single trading day, calculated dynamically against your starting daily balance/equity baseline (3% on Instant Funding, 4% on One Step, and 5% on Two Step and Three Step programs). Both realized and floating P&L are included.',
  },
  {
    category: 'Getting Started',
    q: 'How do I purchase a challenge?',
    a: 'Choose your desired program type (Instant, One Step, Two Step, or Three Step) and account size ($5K to $200K) in the Trading Programs section, then click "Buy Now" or redeem a Daily Free Spin reward code to activate your evaluation account immediately.',
  },
  {
    category: 'Account Management',
    q: 'Can I have multiple accounts?',
    a: 'Yes! Traders can hold and manage multiple evaluation and funded accounts simultaneously, up to a combined maximum simulated capital allocation of $600,000 per trader profile.',
  },
  {
    category: 'Support Desk',
    q: 'How can I contact support?',
    a: 'You can reach our Dedicated Trader Support team 24/7 via the Contact Us page, the in-dashboard Support Ticket center, or through our official community channels linked in the footer.',
  },
];

export const COUNTRIES = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hong Kong',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
  'Other',
];

