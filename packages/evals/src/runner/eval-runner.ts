// Eval Runner — 离线/在线评估执行器

import type { Trace } from '@longhold/agent-runtime';

export interface EvalCase {
  caseId: string;
  task: string;
  portfolio: unknown;
  fixtures: unknown;
  expected: {
    action: string;
    riskLevel?: string;
    riskType?: string;
  };
  forbiddenOutputs: string[];
  requiredEvidence: string[];
}

export interface EvalResult {
  caseId: string;
  passed: boolean;
  layerScores: Record<number, number>;
  totalScore: number;
  failures: EvalFailure[];
  trace: Trace;
}

export interface EvalFailure {
  layer: number;
  check: string;
  expected: unknown;
  actual: unknown;
  message: string;
}

export interface EvalSuite {
  suiteName: string;
  cases: EvalCase[];
}

export interface EvalReport {
  suiteName: string;
  totalCases: number;
  passed: number;
  failed: number;
  skipped: number;
  averageScore: number;
  results: EvalResult[];
}

/**
 * EvalRunner 执行 Eval Case 并生成报告。
 *
 * 五层评估：
 * 1. Tool Eval — 工具计算正确性
 * 2. Skill Eval — Skill 流程完整性
 * 3. Trajectory Eval — Agent 路径效率
 * 4. Output Eval — 输出正确性
 * 5. Business Eval — 投资逻辑合理性
 *
 * TODO:
 * - 实现完整的五层评估逻辑
 * - 集成 DeterministicJudge 和 LLMJudge
 * - 实现 Regression Gate
 */
export class EvalRunner {
  /**
   * 执行单个 Eval Case。
   */
  async runCase(_evalCase: EvalCase): Promise<EvalResult> {
    // TODO: 用 fixtures 初始化环境
    // TODO: 运行 Agent Loop
    // TODO: 在五层上评估
    // TODO: 返回结果

    return {
      caseId: '',
      passed: true,
      layerScores: {},
      totalScore: 0,
      failures: [],
      trace: {} as Trace,
    };
  }

  /**
   * 执行 Eval Suite。
   */
  async runSuite(suite: EvalSuite): Promise<EvalReport> {
    const results: EvalResult[] = [];

    // TODO: 逐个执行 case
    // for (const c of suite.cases) {
    //   results.push(await this.runCase(c));
    // }

    const passed = results.filter((r) => r.passed).length;
    const totalScore = results.reduce((sum, r) => sum + r.totalScore, 0) / Math.max(results.length, 1);

    return {
      suiteName: suite.suiteName,
      totalCases: suite.cases.length,
      passed,
      failed: results.length - passed,
      skipped: 0,
      averageScore: totalScore,
      results,
    };
  }

  /**
   * Regression Gate: 用 baseline traces 验证代码变更。
   */
  async regressionTest(_baselineTraces: Trace[]): Promise<{ passed: boolean; report: EvalReport }> {
    // TODO: 重放 baseline traces，对比输出
    return {
      passed: true,
      report: { suiteName: 'regression', totalCases: 0, passed: 0, failed: 0, skipped: 0, averageScore: 0, results: [] },
    };
  }
}
