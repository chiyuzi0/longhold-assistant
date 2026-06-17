# Skill: monthly-holding-review

## 目标

对用户当前持仓进行月度体检，输出持有、谨慎持有、减仓/撤出、剔除等建议。

## 输入

- 持仓列表；
- 股票基础信息；
- 250 日日 K；
- 风险规则结果；
- 用户投资假设；
- 上次复盘记忆。

## 工具调用

1. queryStockProfile
2. queryDailyBars
3. computeMarketPerformance250d
4. screenDelistingRisk
5. screenFinancialRisk
6. readPortfolioMemory
7. writeDecisionLog
8. generateMonthlyReviewMarkdown

## 流程

1. 读取持仓；
2. 补齐股票基础信息；
3. 计算 250 日市场表现；
4. 执行硬风险筛查；
5. 读取上次投资假设；
6. 判断投资假设是否出现证伪信号；
7. 形成结构化决策；
8. 写入决策日志；
9. 生成月报草稿。

## 输出

```json
{
  "asOfDate": "2026-06-30",
  "items": [],
  "summary": {
    "hold": 0,
    "watch": 0,
    "cautiousHold": 0,
    "reduceExit": 0,
    "exclude": 0
  }
}
```

## 边界

- 不做短线涨跌预测；
- 不输出无证据买入建议；
- 财报未更新时，只能做月度风险体检，不能替代季度财报复盘。
