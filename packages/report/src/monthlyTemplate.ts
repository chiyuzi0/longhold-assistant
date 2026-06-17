import type { MonthlyHoldingReviewOutput } from '@longhold/skills';

export function renderMonthlyReviewMarkdown(review: MonthlyHoldingReviewOutput): string {
  const rows = review.items
    .map((item) => {
      return `| ${item.symbol} | ${item.decision.action} | ${item.decision.summary} | ${item.decision.nextWatchPoints.join('；')} |`;
    })
    .join('\n');

  return `# 月度持仓体检报告\n\n分析日期：${review.asOfDate}\n\n## 汇总\n\n- 持有：${review.summary.hold}\n- 观察：${review.summary.watch}\n- 谨慎持有：${review.summary.cautiousHold}\n- 减仓/撤出：${review.summary.reduceExit}\n- 剔除：${review.summary.exclude}\n\n## 明细\n\n| 股票 | 建议 | 摘要 | 下次观察点 |\n|---|---|---|---|\n${rows}\n\n> 本报告仅用于个人研究和复盘，不构成投资建议。\n`;
}
