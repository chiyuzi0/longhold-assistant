#!/usr/bin/env node
/**
 * LongHold Assistant V0.3.1 — Eval: monthly-hold-review
 * 
 * 使用 HarnessRunner 验证 demo 输出。
 * 单元测试请使用 pnpm eval:monthly:unit。
 * 
 * 运行: pnpm eval:monthly
 */

const fs = require('fs');
const path = require('path');
const { HarnessRunner } = require('../packages/harness/src/runner/harness-runner');

const AS_OF_DATE = '2026-06';
const REPORT_PATH = path.resolve(`data/reports/monthly/monthly_hold_review_${AS_OF_DATE}.md`);

function verifyDemoDecisions(map) {
  const checks = [
    { name: 'ST 股票 → EXCLUDE', pass: map['000003.SZ']?.action === 'EXCLUDE', detail: map['000003.SZ']?.action || 'N/A' },
    { name: '数据缺失 → DATA_INSUFFICIENT', pass: map['9988.HK']?.action === 'DATA_INSUFFICIENT', detail: map['9988.HK']?.action || 'N/A' },
    { name: '正常持仓 + 足够日K → HOLD', pass: map['000001.SZ']?.action === 'HOLD', detail: map['000001.SZ']?.action || 'N/A' },
    { name: '日K不足(<30) → DATA_INSUFFICIENT', pass: map['0700.HK']?.action === 'DATA_INSUFFICIENT', detail: map['0700.HK']?.action || 'N/A' },
  ];
  const reportClean = (() => {
    if (!fs.existsSync(REPORT_PATH)) return false;
    return !/(必涨|保证收益|推荐买入|无风险|保本|抄底|稳赚)/.test(fs.readFileSync(REPORT_PATH, 'utf-8'));
  })();
  checks.push({ name: '报告无禁用语', pass: reportClean, detail: reportClean ? '通过' : '包含禁用语' });
  const hasEvidence = Object.values(map).every(d => d.evidence && d.evidence.length > 0);
  checks.push({ name: '所有决策有 evidence', pass: hasEvidence, detail: `${Object.keys(map).length} 均有证据链` });
  return checks;
}

async function main() {
  console.log('=== LongHold Assistant V0.3.1 Eval: monthly-hold-review ===\n');
  console.log('模式: HarnessRunner 集成验证\n');

  // 通过 HarnessRunner 运行
  const harness = new HarnessRunner();
  const result = await harness.runMonthlyReview({
    portfolioCsv: path.resolve('data/samples/portfolio.sample.csv'),
    klineCsv: path.resolve('data/samples/kline_250d.sample.csv'),
    asOfDate: AS_OF_DATE,
  });

  if (!result.ok) {
    console.error('❌ 任务执行失败:', JSON.stringify(result.error, null, 2));
    process.exit(1);
  }

  // 从结果中提取决策 map
  const decisions = result.data.decisions || [];
  const decisionMap = {};
  for (const d of decisions) decisionMap[d.symbol] = d;

  console.log(`  HarnessRunner 生成 ${Object.keys(decisionMap).length} 个决策\n`);
  for (const d of decisions) {
    const evCount = d.evidence ? d.evidence.length : 0;
    console.log(`  ${d.symbol}: ${d.action} (source: ${d.decisionSource}, evidence: ${evCount})`);
  }

  console.log('\n--- 验证项 ---\n');
  const checks = verifyDemoDecisions(decisionMap);
  for (const c of checks) {
    console.log(`  ${c.pass ? '✅' : '❌'} ${c.name}: ${c.detail}`);
  }

  // Trace 与 Budget 统计
  const ts = result.data.traceStats || {};
  const bs = result.data.budgetStats || {};
  console.log(`\n--- Trace & Budget ---`);
  console.log(`  traceEvents: ${ts.traceEvents || 0}`);
  console.log(`  toolExecutions: ${ts.toolExecutions || 0}`);
  console.log(`  toolTraceEvents: ${ts.toolTraceEvents || 0}`);
  console.log(`  modelCalls: ${ts.modelCalls || 0}`);
  console.log(`  modelSkips: ${ts.modelSkips || 0}`);
  console.log(`  budget: ${bs.toolCalls || 0} tools / ${bs.modelCalls || 0} model / ${bs.totalTokens || 0} tokens / ${bs.runtimeMs || 0}ms`);

  const allPass = checks.every(c => c.pass);
  console.log(`\n  整体: ${allPass ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  Trace: ${result.tracePath}`);
  console.log(`  报告: ${REPORT_PATH}`);

  if (!allPass) process.exit(1);
}

main().catch(console.error);
