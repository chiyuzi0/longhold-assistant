#!/usr/bin/env node
/**
 * LongHold Assistant V0.3 — 月度持仓体检演示
 * 
 * 这个文件只负责：
 * 1. 创建 HarnessRunner
 * 2. 调用 runMonthlyReview()
 * 3. 打印结果摘要
 * 
 * 不包含：风险裁决 / 工具编排 / LLM prompt / 报告拼接 / memory 写入
 * 以上逻辑全部在 HarnessRunner → SkillRunner → ToolRegistry 中
 */

const path = require('path');
const { HarnessRunner } = require('../packages/harness/src/runner/harness-runner');

const AS_OF_DATE = '2026-06';

async function main() {
  console.log('\n========================================');
  console.log('LongHold Assistant V0.3 — 月度持仓体检');
  console.log(`分析月份: ${AS_OF_DATE}`);
  console.log('========================================\n');

  // ---- 1. 创建 HarnessRunner（唯一入口） ----
  const harness = new HarnessRunner({
    budget: {
      maxModelCalls: 10,
      maxToolCalls: 50,
      maxTotalTokens: 80000,
      maxRuntimeMs: 120000,
      maxStocksPerRun: 20,
    },
  });

  console.log(`模型: ${harness.getGatewayLabel()}\n`);

  // ---- 2. 调用任务 ----
  const result = await harness.runMonthlyReview({
    portfolioCsv: path.resolve('data/samples/portfolio.sample.csv'),
    klineCsv: path.resolve('data/samples/kline_250d.sample.csv'),
    asOfDate: AS_OF_DATE,
  });

  if (!result.ok) {
    console.error('❌ 任务失败:', JSON.stringify(result.error, null, 2));
    process.exit(1);
  }

  // ---- 3. 打印结果摘要 ----
  const data = result.data;

  console.log('=== 决策汇总 ===');
  for (const d of data.decisions) {
    const evIds = d.evidence.map((_, i) => `ev-${String(i + 1).padStart(3, '0')}`).join(', ');
    const hr = d.hardRuleApplied ? ' [硬规则覆盖]' : '';
    console.log(`  ${d.symbol}: ${d.action} (${(d.confidence * 100).toFixed(0)}%)${hr} | ${d.modelSource} | Evidence: ${evIds}`);
  }
  console.log(`\n  模型来源: ${result.gateway}`);

  const bs = data.budgetStats;
  console.log(`  Budget: ${bs.toolCalls} tools / ${bs.modelCalls} models / ${bs.totalTokens} tokens / ${bs.runtimeMs}ms`);
  console.log(`  报告: ${data.reportPath}`);
  console.log(`  决策日志: ${data.logIds.length} 条`);
  console.log(`  Trace: ${result.tracePath}`);
}

main().catch(console.error);
