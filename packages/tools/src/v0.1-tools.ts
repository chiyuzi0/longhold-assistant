// V0.1 Tool Implementations — 9 tools for monthly-hold-review

import type { DailyBar, Evidence } from '@longhold/core';
import { screenBasicDelistingRisk } from '@longhold/core';
import { computeMarketPerformance250d } from '@longhold/tools';
import type { ToolResult, ToolContext } from './contracts';
import { PortfolioRepository, KlineRepository, RiskFlagRepository, DecisionLogRepository } from '@longhold/data';

// ===================================================================
// 1. import_portfolio_csv
// ===================================================================
export interface ImportPortfolioInput {
  csvPath: string;
}
export interface ImportPortfolioOutput {
  symbols: string[];
  count: number;
}
export async function importPortfolioCsv(
  input: ImportPortfolioInput,
  _ctx: ToolContext,
): Promise<ToolResult<ImportPortfolioOutput>> {
  try {
    const repo = new PortfolioRepository(input.csvPath);
    const all = repo.getAll();
    return {
      ok: true,
      data: { symbols: all.map((r) => r.symbol), count: all.length },
      evidence: [{ source: 'portfolio.csv', title: '持仓记录数', value: all.length }],
    };
  } catch (e) {
    return { ok: false, error: { code: 'IMPORT_FAILED', message: String(e) } };
  }
}

// ===================================================================
// 2. get_portfolio
// ===================================================================
export interface GetPortfolioInput {
  csvPath?: string;
}
export interface GetPortfolioOutput {
  holdings: Array<{
    symbol: string;
    name: string;
    costPrice: number;
    quantity: number;
    buyReason?: string;
  }>;
}
export async function getPortfolio(
  input: GetPortfolioInput,
  _ctx: ToolContext,
): Promise<ToolResult<GetPortfolioOutput>> {
  try {
    const repo = new PortfolioRepository(input.csvPath);
    const all = repo.getAll();
    return {
      ok: true,
      data: { holdings: all },
      evidence: [{ source: 'portfolio', title: '持仓数量', value: all.length }],
    };
  } catch (e) {
    return { ok: false, error: { code: 'FETCH_FAILED', message: String(e) } };
  }
}

// ===================================================================
// 3. get_kline_250d
// ===================================================================
export interface GetKlineInput {
  symbols: string[];
  csvPath?: string;
}
export interface GetKlineOutput {
  bars: Record<string, DailyBar[]>;
}
export async function getKline250d(
  input: GetKlineInput,
  _ctx: ToolContext,
): Promise<ToolResult<GetKlineOutput>> {
  try {
    const repo = new KlineRepository(input.csvPath);
    const map = repo.getBySymbols(input.symbols);
    const bars: Record<string, DailyBar[]> = {};
    for (const [sym, rows] of map) {
      bars[sym] = rows.map((r) => ({
        symbol: r.symbol,
        tradeDate: r.tradeDate,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        amount: r.amount,
      }));
    }
    const total = Object.values(bars).reduce((sum, b) => sum + b.length, 0);
    return {
      ok: true,
      data: { bars },
      evidence: [{ source: 'kline_daily', title: '日K总条数', value: total }],
    };
  } catch (e) {
    return { ok: false, error: { code: 'FETCH_FAILED', message: String(e) } };
  }
}

// ===================================================================
// 4. calculate_250d_performance
// ===================================================================
export interface CalcPerfInput {
  symbol: string;
  bars: DailyBar[];
}
export interface CalcPerfOutput {
  symbol: string;
  returnPct: number;
  maxDrawdownPct: number;
  windowDays: number;
}
export async function calculate250dPerformance(
  input: CalcPerfInput,
  _ctx: ToolContext,
): Promise<ToolResult<CalcPerfOutput>> {
  const result = await computeMarketPerformance250d(input);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return {
    ok: true,
    data: {
      symbol: result.data!.symbol,
      returnPct: result.data!.returnPct,
      maxDrawdownPct: result.data!.maxDrawdownPct,
      windowDays: result.data!.windowDays,
    },
    evidence: result.evidence,
  };
}

// ===================================================================
// 5. check_risk_flags
// ===================================================================
export interface CheckRiskInput {
  symbol: string;
  status?: string;
}
export interface CheckRiskOutput {
  symbol: string;
  status: string;
  actions: string[];
  hasCriticalRisk: boolean;
}
export async function checkRiskFlags(
  input: CheckRiskInput,
  _ctx: ToolContext,
): Promise<ToolResult<CheckRiskOutput>> {
  const profile = { symbol: input.symbol, name: '', market: 'A_SHARE' as const, status: input.status as any };
  const findings = screenBasicDelistingRisk(profile as any);

  const actions = findings.map((f) => f.suggestedAction);
  const hasCritical = findings.some((f) => f.riskLevel === 'CRITICAL');

  return {
    ok: true,
    data: {
      symbol: input.symbol,
      status: input.status ?? 'NORMAL',
      actions,
      hasCriticalRisk: hasCritical,
    },
    evidence: findings.flatMap((f) => f.evidence),
  };
}

// ===================================================================
// 6. build_evidence_list
// ===================================================================
export interface BuildEvidenceInput {
  symbol: string;
  performance?: { returnPct: number; maxDrawdownPct: number };
  riskFlags: { hasCriticalRisk: boolean; actions: string[] };
  profile?: { name: string; status?: string };
  asOfDate: string;
}
export interface BuildEvidenceOutput {
  evidence: Evidence[];
  evidenceIds: string[];
}
export async function buildEvidenceList(
  input: BuildEvidenceInput,
  _ctx: ToolContext,
): Promise<ToolResult<BuildEvidenceOutput>> {
  const evidence: Evidence[] = [];
  const evidenceIds: string[] = [];
  let seq = 0;

  if (input.profile) {
    evidence.push({ source: 'stock_profile', title: '股票名称', value: input.profile.name, asOfDate: input.asOfDate });
    evidence.push({ source: 'stock_profile.status', title: '股票状态', value: input.profile.status ?? 'NORMAL', asOfDate: input.asOfDate });
  }
  if (input.performance) {
    evidence.push({ source: 'market_performance', title: '250日收益率(%)', value: input.performance.returnPct, asOfDate: input.asOfDate });
    evidence.push({ source: 'market_performance', title: '250日最大回撤(%)', value: input.performance.maxDrawdownPct, asOfDate: input.asOfDate });
  }
  evidence.push({ source: 'risk_gate', title: '存在严重风险', value: input.riskFlags.hasCriticalRisk, asOfDate: input.asOfDate });

  for (let i = 0; i < evidence.length; i++) {
    evidenceIds.push(`ev-${String(++seq).padStart(3, '0')}`);
  }

  return {
    ok: true,
    data: { evidence, evidenceIds },
  };
}

// ===================================================================
// 7. risk_judge
// ===================================================================
export interface RiskJudgeInput {
  symbol: string;
  hasCriticalRisk: boolean;
  performanceOk: boolean;
  hasData: boolean;
}
export type RiskJudgeAction = 'EXCLUDE' | 'CAUTIOUS_HOLD' | 'HOLD';
export interface RiskJudgeOutput {
  action: RiskJudgeAction;
  confidence: number;
  summary: string;
  hardRuleApplied: boolean;
}
export async function riskJudge(
  input: RiskJudgeInput,
  _ctx: ToolContext,
): Promise<ToolResult<RiskJudgeOutput>> {
  // Hard-rule gate: critical risk → EXCLUDE (always)
  if (input.hasCriticalRisk) {
    return {
      ok: true,
      data: {
        action: 'EXCLUDE',
        confidence: 0.95,
        summary: `[${input.symbol}] 触发重大风险规则（hard_rule_override），建议剔除。`,
        hardRuleApplied: true,
      },
      evidence: [{ source: 'risk_judge', title: '硬规则覆盖', value: 'EXCLUDE' }],
    };
  }

  // No data → CAUTIOUS_HOLD
  if (!input.hasData) {
    return {
      ok: true,
      data: {
        action: 'CAUTIOUS_HOLD',
        confidence: 0.5,
        summary: `[${input.symbol}] 数据不足，建议谨慎持有。`,
        hardRuleApplied: false,
      },
    };
  }

  // Performance available + no critical risk → HOLD
  if (input.performanceOk) {
    return {
      ok: true,
      data: {
        action: 'HOLD',
        confidence: 0.65,
        summary: `[${input.symbol}] 未触发风险规则，可继续持有。`,
        hardRuleApplied: false,
      },
    };
  }

  // Fallback
  return {
    ok: true,
    data: {
      action: 'CAUTIOUS_HOLD',
      confidence: 0.55,
      summary: `[${input.symbol}] 存在风险信号，建议谨慎持有。`,
      hardRuleApplied: false,
    },
  };
}

// ===================================================================
// 8. generate_monthly_report
// ===================================================================
export interface GenReportInput {
  asOfDate: string;
  items: Array<{
    symbol: string;
    action: string;
    confidence: number;
    summary: string;
    evidence: Evidence[];
    nextWatchPoints: string[];
  }>;
}
export interface GenReportOutput {
  markdown: string;
  reportPath: string;
}
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export async function generateMonthlyReport(
  input: GenReportInput,
  _ctx: ToolContext,
): Promise<ToolResult<GenReportOutput>> {
  const summary: Record<string, number> = {};
  for (const item of input.items) {
    summary[item.action] = (summary[item.action] ?? 0) + 1;
  }

  const rows = input.items
    .map((item) => {
      const evidenceIds = item.evidence.map((_, i) => `ev-${String(i + 1).padStart(3, '0')}`).join(', ');
      const watchPoints = item.nextWatchPoints.join('；');
      return `| ${item.symbol} | ${item.action} | ${(item.confidence * 100).toFixed(0)}% | ${item.summary} | ${evidenceIds} | ${watchPoints} |`;
    })
    .join('\n');

  const summaryRows = Object.entries(summary)
    .map(([action, count]) => `| ${action} | ${count} |`)
    .join('\n');

  const markdown = `# 月度持仓体检报告

**分析日期**: ${input.asOfDate}
**生成时间**: ${new Date().toISOString()}

## 汇总

| 决策 | 数量 |
|---|---|
${summaryRows}

## 明细

| 股票 | 建议 | 置信度 | 摘要 | Evidence ID | 下次观察点 |
|---|---|---|---|---|---|
${rows}

---

> 本报告由 LongHold Assistant V0.1 自动生成，仅用于个人研究和复盘，不构成投资建议。
> 硬规则覆盖标记 (hard_rule_override): 当股票触发退市/ST/数据缺失等硬规则时，系统自动覆盖模型输出。
`;

  const reportDir = resolve(`data/reports/monthly`);
  mkdirSync(reportDir, { recursive: true });
  const reportPath = resolve(reportDir, `monthly_hold_review_${input.asOfDate}.md`);
  writeFileSync(reportPath, markdown, 'utf-8');

  return {
    ok: true,
    data: { markdown, reportPath },
    evidence: [{ source: 'report', title: '报告路径', value: reportPath }],
  };
}

// ===================================================================
// 9. write_decision_log
// ===================================================================
export interface WriteLogInput {
  traceId: string;
  taskId: string;
  skillId: string;
  decisions: Array<{
    symbol: string;
    action: string;
    confidence: number;
    summary: string;
    evidence: Evidence[];
    risks: Array<{ riskLevel: string; riskType: string; title: string }>;
  }>;
}
export interface WriteLogOutput {
  logIds: string[];
}
export async function writeDecisionLog(
  input: WriteLogInput,
  _ctx: ToolContext,
): Promise<ToolResult<WriteLogOutput>> {
  try {
    const repo = new DecisionLogRepository();
    const logIds: string[] = [];

    for (const d of input.decisions) {
      const logId = `log-${d.symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      repo.write({
        logId,
        taskId: input.taskId,
        skillId: input.skillId,
        symbol: d.symbol,
        action: d.action,
        confidence: d.confidence,
        summary: d.summary,
        evidenceJson: JSON.stringify(d.evidence),
        risksJson: JSON.stringify(d.risks),
        traceId: input.traceId,
        createdAt: new Date().toISOString(),
      });
      logIds.push(logId);
    }

    return {
      ok: true,
      data: { logIds },
      evidence: [{ source: 'decision_log', title: '已写入决策日志数', value: logIds.length }],
    };
  } catch (e) {
    return { ok: false, error: { code: 'WRITE_FAILED', message: String(e) } };
  }
}
