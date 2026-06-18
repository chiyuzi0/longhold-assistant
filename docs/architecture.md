# 架构设计

## 1. 总体架构

```text
Desktop UI
  ↓
Skills 工作流层
  ↓
Tools 工具层
  ↓
Core 领域模型 / Data 数据层 / Memory 记忆层
  ↓
DuckDB / Parquet / Local Files
```

## 2. 层级职责

### UI 层

负责展示和交互，不做复杂业务判断。

### Skills 层

负责把多个工具编排成稳定流程。

例如：月度持仓体检 Skill 会调用：

1. 获取用户持仓；
2. 查询最新行情；
3. 计算 250 日表现；
4. 查询风险规则；
5. 查询持仓投资假设；
6. 生成结构化结论；
7. 调用报告模板。

### Tools 层

负责确定性操作。

工具输入输出必须结构化，方便测试与审计。

### Core 层

定义：

- 股票；
- 行情；
- 财报；
- 因子；
- 风险规则；
- 决策等级；
- 证据链。

### Data 层

负责：

- DuckDB 连接（CLI + JSON 双后端）；
- MarketDataProvider 抽象层（Mock + Live 切换）；
- 数据缓存（Staleness-aware，4 级：fresh/stale_ok/stale_warn/stale_fail）；
- 限流（TokenBucketRateLimiter）；
- 安全 Fallback（禁止 Mock 静默降级 → DATA_INSUFFICIENT）；
- RequestValidator 显式请求校验（symbol 格式/退市/黑名单）；
- DataConfidence Score（10 因子 0~1）、Market Regime Detection（BULL/BEAR/SIDEWAYS）、Reliability Scorer（0~100 综合分）；
- 数据导入；
- 数据校验；
- Parquet 管理；
- 数据版本管理。

### Memory 层

负责用户长期上下文，不替代事实数据。

### Agent 层

负责基于证据做解释、反方观点、风险总结和报告语言润色。

## 3. 数据流

```text
原始数据源
  → raw CSV/JSON
  → parquet 标准化
  → DuckDB 建表/视图
  → Tools 查询计算
  → Skills 组织分析
  → Agent 解释
  → Report 输出
```

## 4. V1.2 增强架构

```text
Skills Layer  (不改, 不感知数据源)
  ↓
Tool Layer   (9 工具, 不改)
  ↓
┌─────────────────────────────────────┐
│    MarketDataProvider Interface      │  ← V1.1
├─────────────────────────────────────┤
│  MockProvider  |  LiveProvider       │
├─────────────────────────────────────┤
│  Cache (Staleness-aware 4-level)    │
│  TokenBucketRateLimiter             │
│  RequestValidator                   │
│  FallbackPolicy (hard stop model)   │
├─────────────────────────────────────┤
│    Data Reliability Layer           │  ← V1.2
├─────────────────────────────────────┤
│  ConfidenceCalculator (0~1 score)   │
│  MarketRegime (BULL/BEAR/SIDEWAYS)  │
│  ReliabilityScorer (0~100)          │
└─────────────────────────────────────┘
  ↓
Risk Judge V2 (regime + confidence 加权)
  ↓
HarnessRunner (Trace + Budget + Eval)
```

## 5. 本地优先原则

默认所有数据保存在本地：

- 用户持仓；
- 投资假设；
- 决策日志；
- 报告；
- 历史分析结果。

只有用户显式启用 LLM 时，才把必要的结构化摘要发送给模型。
