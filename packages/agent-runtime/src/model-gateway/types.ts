// Model Gateway 共享类型

export interface ModelAnalysisInput {
  symbol: string;
  name: string;
  status: string;
  returnPct: number;
  maxDrawdownPct: number;
  hasCriticalRisk: boolean;
  hasRiskSignals: boolean;
  asOfDate: string;
}

export interface ModelAnalysisOutput {
  symbol: string;
  modelAction: 'HOLD' | 'CAUTIOUS_HOLD' | 'EXCLUDE';
  modelConfidence: number;
  modelReasoning: string;
  bullPoints: string[];
  bearPoints: string[];
}
