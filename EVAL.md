# EVAL.md — 测试与验收标准

## 验收命令

```bash
pnpm demo:monthly-review     # 运行 demo
pnpm eval:monthly            # 集成测试（6 项检查）
pnpm eval:monthly:unit       # 单元测试（14 cases）
pnpm init:db                 # 初始化数据库
pnpm fetch:sample-data       # 采集样本数据
```

## 当前 Eval Cases (14/14 通过)

| # | Case ID | 期望 | 验证点 |
|---|---|---|---|
| 1 | st-risk | EXCLUDE | ST/退市硬规则覆盖 |
| 2 | missing-data | DATA_INSUFFICIENT | 无数据不可 HOLD |
| 3 | cashflow-deterioration | DATA_INSUFFICIENT | V0.4 数据不足 |
| 4 | high-valuation | HOLD | Mock 无估值信号→默认 HOLD |
| 5 | normal-quality | HOLD | 正常优质持仓 |
| 6 | llm-illegal-hold-for-st | EXCLUDE | LLM 误判→硬规则覆盖 |
| 7 | llm-missing-evidence | HOLD | 正常带 evidence |
| 8 | llm-forbidden-words | HOLD | 无禁用语 |
| 9 | llm-invalid-decision-enum | HOLD | 非法枚举→fallback |
| 10 | data-quality-fail | DATA_INSUFFICIENT | 日K<30 条 |
| 11 | stale-market-data | DATA_INSUFFICIENT | 数据>90 天陈旧 |
| 12 | data-low-confidence (V1.2) | CAUTIOUS_HOLD | 低置信度不可 HOLD |
| 13 | volatile-market (V1.2) | CAUTIOUS_HOLD | BEAR regime 降级 |
| 14 | mixed-quality (V1.2) | CAUTIOUS_HOLD | MEDIUM 质量不可 HOLD |

## 验收标准

- [x] ST 股票 → EXCLUDE
- [x] 数据缺失 → DATA_INSUFFICIENT
- [x] 正常持仓 + 足够日K → HOLD
- [x] 日K不足(<30) → DATA_INSUFFICIENT
- [x] 报告无禁用语
- [x] 所有决策有 evidence + decisionSource
- [x] Budget / Trace 统计完整
- [x] DataConfidence 注入 toolCtx
- [x] Risk Judge regime 加权生效
- [ ] 真实 DeepSeek 调用（需 API key）
- [ ] 真实行情数据接入（需 API key）
