#!/usr/bin/env node
/**
 * LongHold Assistant V0.3.1 — Eval: monthly-hold-review (单元测试)
 * 
 * 直接使用 SkillRunner（不经过 HarnessRunner），用于 fixture 离线验证。
 * 
 * 运行: pnpm eval:monthly:unit
 */

const fs = require('fs');
const path = require('path');
const { MonthlyHoldReviewRunner } = require('../packages/skills/src/monthly-hold-review/skill-runner.cjs');
const { ToolRegistry } = require('../packages/harness/src/registries/tool-registry');
const { BudgetPolicy } = require('../packages/harness/src/budget/budget-policy');
const { createFixtureTools, DeterministicJudge } = require('./eval-tools');

const CASES_DIR = path.resolve('evals/cases/monthly-hold-review');

async function runFixtureCase(evalCase) {
  const fixtures = createFixtureTools(evalCase);
  const skill = new MonthlyHoldReviewRunner({
    toolRegistry: new ToolRegistry(),
    budget: new BudgetPolicy(),
    gateway: { hasDeepSeek: false, config: null, llmStrategy: 'mock_fallback' },
  });
  // 覆写 portfolio/kline 工具
  skill.tools._tools['get_portfolio'] = {
    name: 'get_portfolio', execute: fixtures.getPortfolio,
  };
  skill.tools._tools['get_kline_250d'] = {
    name: 'get_kline_250d', execute: async (input) => fixtures.getKline(input.symbols),
  };
  const result = await skill.run({ asOfDate: '2026-06' });
  return { decisions: result.data?.decisions || [], ok: result.ok, error: result.error };
}

async function main() {
  console.log('=== LongHold Assistant V0.3.1 Eval: monthly-hold-review (unit) ===\n');

  const caseFiles = fs.existsSync(CASES_DIR)
    ? fs.readdirSync(CASES_DIR).filter(f => f.endsWith('.json'))
    : [];

  const cases = caseFiles.map(f => JSON.parse(fs.readFileSync(path.resolve(CASES_DIR, f), 'utf-8')));
  console.log(`  加载 ${cases.length} 个 Eval Case\n`);

  const judge = new DeterministicJudge();
  let passCount = 0, totalScore = 0;

  for (const evalCase of cases) {
    const { decisions, ok } = await runFixtureCase(evalCase);
    if (!ok) {
      console.log(`  ❌ FAIL ${evalCase.case_id} — ${evalCase.name} (执行错误)`);
      continue;
    }
    const verdict = judge.evaluate(evalCase, decisions);
    const status = verdict.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} ${evalCase.case_id} — ${evalCase.name}`);
    if (verdict.errors.length > 0) {
      for (const err of verdict.errors) console.log(`         错误: ${err}`);
    }
    if (verdict.passed) passCount++;
    totalScore += verdict.score;
  }

  const avgScore = cases.length > 0 ? (totalScore / cases.length) * 100 : 0;
  console.log(`\n=== 结果 ===`);
  console.log(`  通过: ${passCount}/${cases.length}`);
  console.log(`  平均分: ${avgScore.toFixed(1)}%`);
  console.log(`  整体: ${passCount === cases.length ? '✅ 通过' : '❌ 失败'}`);
}

main().catch(console.error);
