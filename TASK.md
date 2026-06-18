# TASK.md — 当前任务定义

## 项目状态

- 版本: 0.1.0
- 阶段: V0.4-data（已完成）
- 最后完成: DuckDB 数据层 + data_quality_gate + 8 只样本股票数据采集
- URL: https://github.com/chiyuzi0/longhold-assistant

## 已实现的闭环

- ✅ 确定性月度持仓体检（HarnessRunner → SkillRunner → ToolRegistry）
- ✅ 9 个注册工具（get_portfolio → write_decision_log）
- ✅ MockModelGateway + DeepSeekModelGateway（auto fallback）
- ✅ Risk Judge 硬规则优先（severity map）
- ✅ BudgetPolicy（toolExecs / modelCalls / tokens / runtime）
- ✅ pre_model_risk_gate + data_quality_gate
- ✅ 统一 DecisionSource（无 model_only）
- ✅ DuckDBClient（CLI + JSON 双后端）
- ✅ 6 个 Repository（StockBasic / Portfolio / Kline / RiskFlag / DecisionLog / DataQuality）
- ✅ 样本数据采集（8 只股票，mock/real 双模式）
- ✅ 11 个 Eval Case（全部通过）
- ✅ LLM 模式配置（mock / auto / deepseek）

## 当前卡点

1. 无真实 DeepSeek API key → Mock 模式无法验证估值类判断
2. 无真实行情 API key → 样本数据为模拟生成
3. 无 duckdb CLI → JSON fallback 性能有限
4. Tauri 桌面端尚未接入 CLI

## 提议的下一步

备选方向（需用户确认）:

### A: V0.5-multi-agent
引入 Bull / Bear / Risk Judge 三 Agent 协作分析。
Mock 模式下三 Agent 固定输出占位 JSON，为接真实 LLM 做准备。

### B: V0.4.1-real-data
完善真实数据采集（AKShare / Tushare 接入），替换 mock 样本。
包含：数据刷新脚本、增量更新、错误重试。

### C: V0.4-ui
搭建 Tauri 桌面端首页看板。
最少可行：导入持仓 CSV → 生成体检报告 → 查看 Trace。

### D: V0.4.2-eval-extend
扩展 eval 体系：新增 Trajectory Eval、Output Eval、Business Eval 层。
当前只有 Layer 1-2（Tool + Skill），缺失 Layer 3-5。

## 命令速查

```bash
pnpm demo:monthly-review     # 运行月度持仓体检
pnpm eval:monthly            # HarnessRunner 集成验证
pnpm eval:monthly:unit       # 单元测试（11 cases）
pnpm init:db                 # 初始化 DuckDB（JSON fallback）
pnpm fetch:sample-data       # 拉取样本数据
```
