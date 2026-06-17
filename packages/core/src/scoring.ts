import type { FactorSnapshot } from './domain';

export interface ScoreWeights {
  quality: number;
  growth: number;
  valuation: number;
  stability: number;
  shareholderReturn: number;
  momentum: number;
}

export const defaultScoreWeights: ScoreWeights = {
  quality: 0.30,
  growth: 0.20,
  valuation: 0.15,
  stability: 0.15,
  shareholderReturn: 0.10,
  momentum: 0.10,
};

export function computeLongHoldTotalScore(
  score: Omit<FactorSnapshot, 'symbol' | 'asOfDate' | 'totalScore'>,
  weights: ScoreWeights = defaultScoreWeights,
): number {
  const total =
    score.qualityScore * weights.quality +
    score.growthScore * weights.growth +
    score.valuationScore * weights.valuation +
    score.stabilityScore * weights.stability +
    score.shareholderReturnScore * weights.shareholderReturn +
    score.momentumScore * weights.momentum;

  return Number(total.toFixed(2));
}

export function scoreToGrade(totalScore: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (totalScore >= 85) return 'A';
  if (totalScore >= 70) return 'B';
  if (totalScore >= 55) return 'C';
  if (totalScore >= 40) return 'D';
  return 'E';
}
