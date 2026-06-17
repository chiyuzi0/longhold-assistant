# 数据模型与表设计

## 1. 原始数据目录

```text
data/raw/         原始下载数据
data/parquet/     标准化列式数据
data/processed/   中间计算结果
data/reports/     报告输出
```

## 2. DuckDB 核心表

### stock_profile

| 字段 | 类型 | 说明 |
|---|---|---|
| symbol | string | 股票代码 |
| name | string | 股票名称 |
| market | string | A_SHARE / HK |
| exchange | string | 交易所 |
| industry | string | 行业 |
| list_date | date | 上市日期 |
| status | string | 正常/ST/退市/停牌 |

### daily_bar

| 字段 | 类型 | 说明 |
|---|---|---|
| symbol | string | 股票代码 |
| trade_date | date | 交易日期 |
| open | double | 开盘价 |
| high | double | 最高价 |
| low | double | 最低价 |
| close | double | 收盘价 |
| volume | double | 成交量 |
| amount | double | 成交额 |

### financial_statement

| 字段 | 类型 | 说明 |
|---|---|---|
| symbol | string | 股票代码 |
| report_period | date | 报告期 |
| revenue | double | 营收 |
| net_profit | double | 净利润 |
| operating_cashflow | double | 经营现金流 |
| total_assets | double | 总资产 |
| total_liabilities | double | 总负债 |
| equity | double | 股东权益 |

### factor_snapshot

| 字段 | 类型 | 说明 |
|---|---|---|
| symbol | string | 股票代码 |
| as_of_date | date | 计算日期 |
| quality_score | double | 质量分 |
| growth_score | double | 成长分 |
| valuation_score | double | 估值分 |
| stability_score | double | 稳定分 |
| shareholder_return_score | double | 股东回报分 |
| momentum_score | double | 趋势分 |
| total_score | double | 综合分 |

### user_position

| 字段 | 类型 | 说明 |
|---|---|---|
| position_id | string | 持仓 ID |
| symbol | string | 股票代码 |
| quantity | double | 数量 |
| cost_price | double | 成本价 |
| thesis_id | string | 投资假设 ID |
| created_at | datetime | 创建时间 |

### decision_log

| 字段 | 类型 | 说明 |
|---|---|---|
| decision_id | string | 决策 ID |
| symbol | string | 股票代码 |
| decision_date | date | 决策日期 |
| action | string | HOLD/WATCH/CAUTIOUS_HOLD/REDUCE_EXIT/EXCLUDE |
| reason | string | 决策原因 |
| evidence_json | json | 证据链 |
