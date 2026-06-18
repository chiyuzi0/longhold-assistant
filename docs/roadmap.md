# Roadmap

## V0.1-deterministic ✅
- 确定性月度持仓体检闭环
- ToolRegistry 9 工具
- Eval 验收体系

## V0.2-model ✅
- DeepSeek Mock + Live 双模式
- Risk Gate 硬规则优先

## V0.3-harness ✅
- HarnessRunner 统一入口
- BudgetPolicy / TraceRecorder
- SkillRunner 12 步固定流程

## V0.3.1-hardening ✅
- DecisionSource 枚举（无 model_only）
- LLM 模式配置（mock/auto/deepseek）
- 统一 traceStats + budgetStats
- pre_model_risk_gate 优先于 data_quality_gate

## V0.4-data ✅
- DuckDB 6 表（init_duckdb.sql）
- DuckDBClient（CLI + JSON 双后端）
- 6 个 Repository
- data_quality_gate（5 条规则）
- 样本数据采集（8 只股票，mock/real）
- 11 Eval Cases

## V1.1-live-data-layer ✅
- MarketDataProvider 接口（Mock + Live）
- TokenBucket 限流
- Staleness-aware Cache（4 级）
- 安全 Fallback（禁止静默 Mock 降级）
- RequestValidator 显式校验层

## V1.2-reliability ✅
- DataConfidence Score（10 因子 0~1）
- Market Regime Detection（BULL/BEAR/SIDEWAYS）
- Reliability Scorer（0~100 综合分）
- Risk Judge V2（regime + confidence 加权）
- 14 Eval Cases

## V1.3-multi-agent 🔧 规划
- Bull Agent
- Bear Agent
- Risk Judge Agent
- 并行调用，单次裁决

## V1.4-ui 🔧 规划
- Tauri 桌面端看板
- 持仓导入 → 生成体检 → 查看报告 → Trace 摘要

## V1.5-real-data 🔧 规划
- AKShare / Tushare 接入
- 真实 A 股 / 港股行情
- 数据刷新与增量更新

## V2.0 🔧 规划
- 全市场股票池重建
- 季度财报复盘
- 年度策略复盘
- 多账户管理
- 加密存储
- 完整安装包
