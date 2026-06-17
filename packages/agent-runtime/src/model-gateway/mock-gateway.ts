// MockModelGateway — V0.1 模拟 LLM 层，不接真实 DeepSeek
// V0.2 中作为 DeepSeek 不可用时的回退选项

import type { ModelAnalysisInput, ModelAnalysisOutput } from './types';

export { type ModelAnalysisInput, type ModelAnalysisOutput } from './types';

/**
 * MockModelGateway — 模拟 LLM 分析输出。
 *
 * 在 V0.1 中 Risk Judge 优先级高于此输出。
 * 在 V0.2 中作为 DeepSeek 不可用时的回退。
 */
export class MockModelGateway {
  async analyze(input: ModelAnalysisInput): Promise<ModelAnalysisOutput> {
    // 模拟"模型分析"延迟
    await new Promise((r) => setTimeout(r, 10));

    if (input.hasCriticalRisk) {
      return {
        symbol: input.symbol,
        modelAction: 'EXCLUDE',
        modelConfidence: 0.85,
        modelReasoning: `[${input.symbol}] 触发重大风险规则，根据硬规则建议剔除。`,
        bullPoints: [],
        bearPoints: ['触发退市/ST 风险规则'],
      };
    }

    if (input.hasRiskSignals) {
      return {
        symbol: input.symbol,
        modelAction: 'CAUTIOUS_HOLD',
        modelConfidence: 0.55,
        modelReasoning: `[${input.symbol}] 存在风险信号，模型建议谨慎持有并继续观察。`,
        bullPoints: input.returnPct > 0 ? ['近期市场表现尚可'] : [],
        bearPoints: input.status === 'SUSPENDED' ? ['股票停牌中'] : ['存在风险信号'],
      };
    }

    // 正常
    return {
      symbol: input.symbol,
      modelAction: 'HOLD',
      modelConfidence: 0.7,
      modelReasoning: `[${input.symbol}] 未发现重大风险信号，基本面正常，建议继续持有。`,
      bullPoints: [
        input.returnPct > 0 ? `250日收益 ${input.returnPct.toFixed(1)}%` : '波动可控',
      ],
      bearPoints: [],
    };
  }
}
