import type { LongHoldAction } from '@longhold/core';

export interface UserPreference {
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  preferredMarkets: Array<'A_SHARE' | 'HK'>;
  preferredStyles: Array<'DIVIDEND' | 'GROWTH' | 'VALUE' | 'QUALITY' | 'CYCLICAL'>;
  maxSinglePositionPct?: number;
  excludedIndustries?: string[];
  watchedIndustries?: string[];
}

export interface ThesisMemory {
  thesisId: string;
  symbol: string;
  thesis: string;
  supportingEvidence: string[];
  invalidationConditions: string[];
  status: 'ACTIVE' | 'WEAKENED' | 'INVALIDATED';
  updatedAt: string;
}

export interface PortfolioMemory {
  symbol: string;
  buyReason?: string;
  expectedHoldingPeriod?: string;
  thesisId?: string;
  exitConditions?: string[];
  lastReviewSummary?: string;
  updatedAt: string;
}

export interface ReviewMemory {
  reviewId: string;
  symbol?: string;
  periodType: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  period: string;
  conclusion: string;
  riskChanges: string[];
  nextWatchPoints: string[];
  dataSnapshotId?: string;
  createdAt: string;
}

export interface DecisionLog {
  decisionId: string;
  symbol: string;
  decisionDate: string;
  action: LongHoldAction;
  reason: string;
  evidenceIds: string[];
  followUpResult?: string;
}
