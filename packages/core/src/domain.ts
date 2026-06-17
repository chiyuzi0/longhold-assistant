export type Market = 'A_SHARE' | 'HK';

export type LongHoldAction =
  | 'HOLD'
  | 'WATCH'
  | 'CAUTIOUS_HOLD'
  | 'REDUCE_EXIT'
  | 'EXCLUDE'
  | 'DATA_INSUFFICIENT';

export interface StockProfile {
  symbol: string;
  name: string;
  market: Market;
  exchange?: string;
  industry?: string;
  listDate?: string;
  status?: 'NORMAL' | 'ST' | 'DELISTING' | 'SUSPENDED' | 'UNKNOWN';
}

export interface DailyBar {
  symbol: string;
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  amount?: number;
}

export interface FactorSnapshot {
  symbol: string;
  asOfDate: string;
  qualityScore: number;
  growthScore: number;
  valuationScore: number;
  stabilityScore: number;
  shareholderReturnScore: number;
  momentumScore: number;
  totalScore: number;
}

export interface Evidence {
  source: string;
  title: string;
  value?: string | number | boolean;
  asOfDate?: string;
  detail?: unknown;
}

export interface RiskFinding {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskType: string;
  title: string;
  suggestedAction: LongHoldAction;
  evidence: Evidence[];
  nextCheck?: string;
}

export interface LongHoldDecision {
  symbol: string;
  action: LongHoldAction;
  confidence: number;
  summary: string;
  evidence: Evidence[];
  risks: RiskFinding[];
  nextWatchPoints: string[];
}
