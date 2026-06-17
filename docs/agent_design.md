# Agent 设计

## 1. Agent 层职责

Agent 不直接计算数据，不直接编造结论。Agent 的职责是：

- 解释工具层返回的数据；
- 归纳财报变化；
- 总结政策影响；
- 枚举多头观点；
- 枚举空头观点；
- 基于规则与证据输出风控裁决；
- 生成可读报告。

## 2. 多角色设计

| Agent | 职责 |
|---|---|
| Data Auditor | 检查数据缺失、异常、口径不一致 |
| Bull Analyst | 总结长期优势与正面证据 |
| Bear Analyst | 寻找风险、证伪点、财务雷 |
| Financial Analyst | 解读财报指标变化 |
| Policy Analyst | 解读政策、行业、监管变化 |
| Risk Officer | 进行最终风控裁决 |
| Report Writer | 生成报告文本 |

## 3. 风控裁决原则

Risk Officer 必须优先遵守：

1. 硬风险规则；
2. 投资假设是否被证伪；
3. 财务质量变化；
4. 估值与趋势；
5. 用户风险偏好。

## 4. Agent 输入

Agent 输入应该是结构化上下文：

```json
{
  "stockProfile": {},
  "factorSnapshot": {},
  "riskFindings": [],
  "financialSummary": {},
  "marketPerformance": {},
  "memory": {},
  "evidence": []
}
```

## 5. Agent 输出

Agent 输出必须结构化：

```json
{
  "action": "CAUTIOUS_HOLD",
  "confidence": 0.72,
  "summary": "...",
  "bullPoints": [],
  "bearPoints": [],
  "riskTriggers": [],
  "nextWatchPoints": [],
  "evidence": []
}
```
