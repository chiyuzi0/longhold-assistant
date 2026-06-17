# 工具层设计

## 1. 工具层定义

工具层是系统中最底层的可调用能力。

工具必须满足：

- 输入结构化；
- 输出结构化；
- 可测试；
- 可审计；
- 不做主观判断；
- 不调用 LLM 做数据计算。

## 2. 工具分类

### 2.1 数据查询工具

| 工具名 | 说明 |
|---|---|
| queryStockProfile | 查询股票基础信息 |
| queryDailyBars | 查询日 K 数据 |
| queryFinancialStatements | 查询财报数据 |
| queryValuationHistory | 查询估值历史 |
| queryDividendHistory | 查询分红历史 |

### 2.2 数据准备工具

| 工具名 | 说明 |
|---|---|
| importCsvToDuckDB | 导入 CSV |
| importParquetToDuckDB | 导入 Parquet |
| validateMarketData | 校验行情数据 |
| validateFinancialData | 校验财报数据 |
| rebuildFactorViews | 重建因子视图 |

### 2.3 分析计算工具

| 工具名 | 说明 |
|---|---|
| computeMarketPerformance250d | 计算 250 日市场表现 |
| computeQualityFactors | 计算质量因子 |
| computeGrowthFactors | 计算成长因子 |
| computeValuationFactors | 计算估值因子 |
| computeLongHoldScore | 计算长线综合评分 |

### 2.4 风险工具

| 工具名 | 说明 |
|---|---|
| screenDelistingRisk | 退市/ST/停牌风险筛查 |
| screenFinancialRisk | 财务风险筛查 |
| screenLiquidityRisk | 流动性风险筛查 |
| screenGovernanceRisk | 治理风险筛查 |

### 2.5 报告工具

| 工具名 | 说明 |
|---|---|
| generateMonthlyReviewMarkdown | 生成月报 Markdown |
| generateQuarterlyReviewMarkdown | 生成季报 Markdown |
| exportReportToPdf | 导出 PDF |
| exportReportToDocx | 导出 Word |

## 3. 工具返回要求

所有工具返回应包含：

```ts
{
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    detail?: unknown;
  };
  evidence?: Evidence[];
}
```

## 4. 边界

工具层不负责：

- 主观投资建议；
- 语言润色；
- 多角色辩论；
- 用户偏好解释；
- 模型调用。
