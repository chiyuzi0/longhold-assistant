#!/usr/bin/env node
/**
 * LongHold Assistant V0.3 — Eval: monthly-hold-review
 * 
 * 通过 HarnessRunner 执行每个 Eval Case，不使用手写流程。
 * 
 * 模式:
 *   pnpm eval:monthly             — Demo 结果验证
 *   pnpm eval:monthly --fixture   — Fixture 离线验证（通过 HarnessRunner）
 */

const fs = require('fs');
const path = require('path');
const { HarnessRunner } = require('../packages/harness/src/runner/harness-runner');
const { createFixtureTools, DeterministicJudge } = require('./eval-tools');

const REPORT_PATH = path.resolve('data/reports/monthly/monthly_hold_review_2026-06.md');
const CASES_DIR = path.resolve('evals/cases/monthly-hold-review');

// ===== Demo Verification =====

function verifyDemoDecisions(decisions) {
  const map = {};
  for (const d of decisions) map[d.symbol] = d;

  const checks = [
    { name: 'ST 股票 → EXCLUDE', pass: map['000003.SZ']?.action === 'EXCLUDE', detail: map['000003.SZ']?.action || 'N/A' },
    { name: '数据缺失 → DATA_INSUFFICIENT', pass: map['9988.HK']?.action === 'DATA_INSUFFICIENT', detail: map['9988.HK']?.action || 'N/A' },
    { name: '正常持仓 + 足够日K → HOLD', pass: map['000001.SZ']?.action === 'HOLD', detail: map['000001.SZ']?.action || 'N/A' },
    { name: '日K不足 → CAUTIOUS_HOLD', pass: map['0700.HK']?.action === 'CAUTIOUS_HOLD', detail: map['0700.HK']?.action || 'N/A' },
  ];

  // Report check
  const reportClean = (() => {
    if (!fs.existsSync(REPORT_PATH)) return false;
    const report = fs.readFileSync(REPORT_PATH, 'utf-8');
    return !/(必涨|保证收益|推荐买入|无风险|保本|抄底|稳赚)/.test(report);
  })();
  checks.push({ name: '报告无禁用语', pass: reportClean, detail: reportClean ? '通过' : '包含禁用语' });

  // Evidence check
  const hasEvidence = Object.values(map).every(d => d.evidence && d.evidence.length > 0);
  checks.push({ name: '所有决策有 evidence', pass: hasEvidence, detail: `${Object.keys(map).length} 均有证据链` });

  return checks;
}

// ===== Main =====

async function main() {
  const useFixture = process.argv.includes('--fixture');
  console.log('=== LongHold Assistant V0.3 Eval: monthly-hold-review ===\n');

  if (useFixture) {
    // ---- Fixture 模式：通过 HarnessRunner 执行 ----
    console.log('模式: Fixture 离线验证（HarnessRunner）\n');

    const caseFiles = fs.existsSync(CASES_DIR)
      ? fs.readdirSync(CASES_DIR).filter(f => f.endsWith('.json'))
      : [];

    const cases = caseFiles.map(f => JSON.parse(fs.readFileSync(path.resolve(CASES_DIR, f), 'utf-8')));
    console.log(`  加载 ${cases.length} 个 Eval Case\n`);

    const judge = new DeterministicJudge();
    let passCount = 0;
    let totalScore = 0;

    for (const evalCase of cases) {
      // 创建 fixture-aware registry
      const fixtureTools = createFixtureTools(evalCase);

      // 创建 HarnessRunner 并注入 fixture tools
      const harness = new HarnessRunner({
        budget: { maxModelCalls: 10, maxToolCalls: 50, maxTotalTokens: 80000 },
      });
      // 覆盖 tool registry
      harness.toolRegistry = fixtureTools;

      // 执行
      const result = await harness.runMonthlyReview({
        asOfDate: '2026-06',
      });

      if (!result.ok) {
        console.log(`  ❌ FAIL ${evalCase.case_id} — ${evalCase.name} (执行错误)`);
        continue;
      }

      const decisions = result.data.decisions;
      const verdict = judge.evaluate(evalCase, decisions);
      const status = verdict.passed ? '✅ PASS' : '❌ FAIL';

      console.log(`  ${status} ${evalCase.case_id} — ${evalCase.name}`);
      if (verdict.errors.length > 0) {
        for (const err of verdict.errors) console.log(`         错误: ${err}`);
      }
      if (verdict.passed) passCount++;
      totalScore += verdict.score;
    }

    console.log(`\n=== 结果 ===`);
    console.log(`  通过: ${passCount}/${cases.length}`);
    const avgScore = cases.length > 0 ? (totalScore / cases.length) * 100 : 0;
    console.log(`  平均分: ${avgScore.toFixed(1)}%`);
    console.log(`  整体: ${passCount === cases.length ? '✅ 通过' : '❌ 失败'}`);

  } else {
    // ---- Demo 模式：读取报告验证 ----
    console.log('模式: Demo 结果验证\n');

    // 先运行 demo 以确保数据最新
    console.log('  运行 demo:monthly-review...');
    await require('./demo-monthly-review');

    // 读报告解析决策
    const decisions = [];
    if (fs.existsSync(REPORT_PATH)) {
      const report = fs.readFileSync(REPORT_PATH, 'utf-8');
      for (const line of report.split('\n')) {
        if (line.startsWith('| ') && !line.includes('---')) {
          const cols = line.split('|').map(c => c.trim());
          if (cols.length >= 6 && cols[1] && cols[2] && !['股票', '决策', '数量'].includes(cols[1])) {
            decisions.push({
              symbol: cols[1],
              action: cols[2],
              evidence: cols[5] ? [{ source: 'report', title: 'evidence', value: cols[5] }] : [],
            });
          }
        }
      }
    }

    // 也尝试从 decision log 读
    const logDir = path.resolve('memory/decision-log');
    if (fs.existsSync(logDir)) {
      for (const f of fs.readdirSync(logDir).filter(f => f.endsWith('.json'))) {
        const log = JSON.parse(fs.readFileSync(path.resolve(logDir, f), 'utf-8'));
        if (!decisions.find(d => d.symbol === log.symbol)) {
          decisions.push({
            symbol: log.symbol,
            action: log.action,
            evidence: [{ source: 'decision_log', title: 'evidence', value: log.evidenceJson }],
          });
        }
      }
    }

    console.log(`\n  决策数: ${decisions.length}\n`);
    for (const d of decisions) {
      const ev = d.evidence?.[0]?.value?.substring(0, 60) || '';
      console.log(`  ${d.symbol}: ${d.action} ${ev}`);
    }

    console.log('\n--- 验证项 ---\n');
    const checks = verifyDemoDecisions(decisions);
    for (const c of checks) {
      console.log(`  ${c.pass ? '✅' : '❌'} ${c.name}: ${c.detail}`);
    }

    const allPass = checks.every(c => c.pass);
    console.log(`\n  整体: ${allPass ? '✅ 通过' : `❌ 失败 (${checks.filter(c => !c.pass).length} 项未通过)`}`);
  }
}

main().catch(console.error);
