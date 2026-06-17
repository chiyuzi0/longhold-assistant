# 长线因子模型设计

## 1. 总体评分

长线综合分由六类分数构成：

| 维度 | 默认权重 | 说明 |
|---|---:|---|
| Quality | 30% | 盈利质量、ROE、现金流 |
| Growth | 20% | 收入、利润、现金流增长 |
| Valuation | 15% | PE/PB/PS/股息率分位 |
| Stability | 15% | 波动、负债、盈利稳定性 |
| ShareholderReturn | 10% | 分红、回购、派息稳定性 |
| Momentum | 10% | 250 日趋势、相对强弱、回撤 |

## 2. 分类权重

### 稳定分红型

```text
Quality 25%
Valuation 20%
Stability 20%
ShareholderReturn 25%
Momentum 10%
```

### 高 ROE 护城河型

```text
Quality 35%
Growth 20%
Stability 20%
Valuation 15%
ShareholderReturn 10%
```

### 成长制造型

```text
Growth 30%
Quality 25%
Stability 15%
Valuation 15%
Momentum 15%
```

### 周期资源型

```text
CyclePosition 30%
BalanceSheet 20%
ShareholderReturn 20%
Valuation 15%
Momentum 15%
```

### 港股低估型

```text
Valuation 25%
Quality 20%
Liquidity 20%
ShareholderReturn 15%
PolicyRisk 10%
Momentum 10%
```

## 3. 输出等级

| 综合分 | 等级 | 说明 |
|---:|---|---|
| 85–100 | A | 长线重点池 |
| 70–84 | B | 可持有/观察 |
| 55–69 | C | 谨慎观察 |
| 40–54 | D | 不优先关注 |
| <40 | E | 剔除或仅作特殊研究 |

## 4. 注意

因子分不等于投资建议。最终建议必须结合：

- 风险规则；
- 用户持仓成本；
- 用户投资假设；
- 行业分类；
- 财报变化；
- 估值位置。
