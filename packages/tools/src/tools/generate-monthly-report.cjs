// generate-monthly-report.js — 生成月报

const fs = require('fs');
const path = require('path');

async function execute(input, ctx) {
  const summary = {};
  for (const item of (input.items || [])) {
    const a = item.action;
    summary[a] = (summary[a] || 0) + 1;
  }

  const rows = (input.items || []).map(item => {
    const evIds = (item.evidence || []).map((_, i) => `ev-${String(i + 1).padStart(3, '0')}`).join(', ');
    return `| ${item.symbol} | ${item.action} | ${(item.confidence * 100).toFixed(0)}% | ${item.summary} | ${evIds} | ${(item.nextWatchPoints || []).join('；')} |`;
  }).join('\n');

  const summaryRows = Object.entries(summary).map(([a, c]) => `| ${a} | ${c} |`).join('\n');
  const budgetInfo = input.budgetInfo || '';

  const markdown = `# 月度持仓体检报告

**分析日期**: ${input.asOfDate}
**生成时间**: ${new Date().toISOString()}

## 汇总

| 决策 | 数量 |
|---|---|
${summaryRows}
${budgetInfo}

## 明细

| 股票 | 建议 | 置信度 | 摘要 | Evidence ID | 下次观察点 |
|---|---|---|---|---|---|
${rows}

---

> 本报告由 LongHold Assistant V0.3.1 自动生成，仅用于个人研究和复盘，不构成投资建议。
> 硬规则覆盖标记 (hard_rule_override): 当股票触发退市/ST/数据缺失等硬规则时，系统自动覆盖模型输出。
`;

  const reportDir = path.resolve('data/reports/monthly');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.resolve(reportDir, `monthly_hold_review_${input.asOfDate}.md`);
  fs.writeFileSync(reportPath, markdown, 'utf-8');

  return { ok: true, data: { reportPath, markdown } };
}

module.exports = {
  name: 'generate_monthly_report',
  description: '生成月度持仓体检 Markdown 报告（含 budget info 和 PARTAIL_REPORT 标记）',
  category: 'report',
  permission: 'write',
  inputSchema: { type: 'object', properties: { asOfDate: { type: 'string' }, items: { type: 'array' }, budgetInfo: { type: 'string' } } },
  outputSchema: { type: 'object', properties: { reportPath: { type: 'string' }, markdown: { type: 'string' } } },
  execute,
};
