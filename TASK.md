# TASK.md — 当前任务定义

## 项目状态

- 版本: 0.1.0
- 阶段: V1.2-reliability（已完成）
- 最后完成: Data Reliability Layer (Confidence Score / Regime / Scorer)
- Eval: 14/14 通过
- URL: https://github.com/chiyuzi0/longhold-assistant

## 已实现的闭环

- ✅ 确定性月度持仓体检（HarnessRunner → SkillRunner → ToolRegistry）
- ✅ 9 个注册工具（get_portfolio → write_decision_log）
- ✅ MockModelGateway + DeepSeekModelGateway（auto fallback）
- ✅ Risk Judge V1.2（severity + reliability + regime 加权）
- ✅ BudgetPolicy（toolExecs / modelCalls / tokens / runtime）
- ✅ pre_model_risk_gate + data_quality_gate
- ✅ 统一 DecisionSource（无 model_only）
- ✅ DuckDBClient（CLI + JSON 双后端）
- ✅ 6 个 Repository
- ✅ 样本数据采集（8 只股票，mock/real）
- ✅ 14 个 Eval Case（全部通过）
- ✅ LLM 模式配置（mock / auto / deepseek）
- ✅ MarketDataProvider（V1.1: Mock + Live）
- ✅ TokenBucket 限流 + Staleness Cache
- ✅ 安全 Fallback（禁止 Mock 静默降级）
- ✅ RequestValidator 显式校验层
- ✅ DataConfidence Score（V1.2: 10 因子 0~1）
- ✅ Market Regime Detection（BULL/BEAR/SIDEWAYS）
- ✅ Reliability Scorer（0~100 综合分）

## 命令速查

```bash
pnpm demo:monthly-review     # 运行月度持仓体检
pnpm eval:monthly            # HarnessRunner 集成验证
pnpm eval:monthly:unit       # 单元测试（14 cases）
pnpm init:db                 # 初始化 DuckDB
pnpm fetch:sample-data       # 拉取样本数据
```
