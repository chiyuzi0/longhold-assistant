import type { Evidence, LongHoldDecision } from '@longhold/core';

export interface SkillContext {
  requestId: string;
  asOfDate: string;
  enableLlm?: boolean;
}

export interface SkillResult<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    detail?: unknown;
  };
  evidence?: Evidence[];
}

export interface HoldingReviewItem {
  symbol: string;
  decision: LongHoldDecision;
}

export interface MonthlyHoldingReviewOutput {
  asOfDate: string;
  items: HoldingReviewItem[];
  summary: {
    hold: number;
    watch: number;
    cautiousHold: number;
    reduceExit: number;
    exclude: number;
  };
}
