# PROGRESS.md — 执行状态

## 当前步骤

轮次: 多个 | 状态: V1.2-reliability 已完成

## 已完成版本

| 版本 | 内容 | 状态 |
|---|---|---|
| V0.1-deterministic | 确定性体检闭环 | ✅ |
| V0.2-model | DeepSeek Mock + Live | ✅ |
| V0.3-harness | HarnessRunner / ToolRegistry / Budget | ✅ |
| V0.3.1-hardening | DecisionSource / LLM mode / stats | ✅ |
| V0.4-data | DuckDB / DataQuality Gate / 样本 | ✅ |
| V1.1-live-layer | Provider / Cache / RateLimit / Fallback | ✅ |
| V1.2-reliability | Confidence / Regime / Risk Judge V2 | ✅ |

## 当前卡点

1. 无真实 DeepSeek API key → Mock 模式
2. 无 duckdb CLI → JSON fallback
3. Tauri 桌面端骨架未接入 CLI

## 下一步方向

- V1.3-multi-agent: Bull/Bear/Risk Judge 三 Agent
- V1.4-ui: Tauri 桌面看板
- V1.5-real-data: AKShare/Tushare 接入
