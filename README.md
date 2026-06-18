# LongHold Assistant — A/H 股长线持仓 AI Agent 研究工作台

> 版本 0.1.0 · 14/14 Eval 通过 · [GitHub](https://github.com/chiyuzi0/longhold-assistant)

---

## 1. 当前状态（V1.2）

```
每月持仓体检确定性闭环   ✅ 完全实现
DuckDB 数据层             ✅ 完全实现
Data Provider 抽象层      ✅ V1.1 完成 (Mock + Live)
Data Reliability 层       ✅ V1.2 完成 (Confidence + Regime + Scorer)
Tauri 桌面端               🔧 骨架就绪
多 Agent 协作              🔧 规划中
实时数据源接入             🔧 规划中
```

---

## 2. 技术栈

| 层级 | 技术 |
|---|---|
| 主语言 | TypeScript (strict) + JavaScript (CommonJS runtime) |
| 桌面框架 | Tauri 2 (骨架) |
| 前端 | React + TypeScript |
| 图表 | ECharts / Lightweight Charts |
| 本地数据库 | DuckDB (CLI) / JSON-fallback |
| 数据格式 | Parquet / CSV |
| 模型 | DeepSeek V4 (Pro / Flash) + Mock |
| Agent 架构 | 受控状态机 (11 states, 非 ReAct) |
| 包管理 | pnpm (Monorepo) |

---

## 3. 架构分层

```
                        ┌──────────────────────┐
                        │  Skills Layer         │  (工作流编排, 不感知数据源)
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  Tool Layer           │  (9 个确定性工具)
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  DataProvider         │  ← V1.1: Mock/Live 切换
                        ├───────────────────────┤
                        │  Data Reliability     │  ← V1.2: Confidence + Regime
                        └──────────┬───────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
     DuckDB/CSV              ProviderFactory       HTTP API (Live)
     (V0.4)                  (V1.1)                (V1.1 规划)
```

### 核心包

| 包 | 定位 |
|---|---|
| `core` | 领域模型 / 评分 / 风险规则 |
| `data` | 数据层 (DuckDB / Provider / Cache / Reliability) |
| `tools` | 工具层 — 9 个确定性工具 |
| `skills` | Skills 层 — monthly-hold-review 工作流 |
| `agent-runtime` | 受控状态机 Agent Loop |
| `harness` | 安全笼 (Registry / Budget / Risk Gate / Trace) |
| `evals` | 14 个 Eval Cases |
| `report` | 报告生成 |
| `memory` | 记忆层 schema |
| `mcp` | MCP 适配 (规划) |

---

## 4. V1.2 新增能力

### DataConfidence Score

每次数据请求计算 0~1 置信度：

```
+0.3 live source  +0.2 kline≥250  +0.1 no gaps
+0.1 fresh data   +0.1 volume>0   +0.1 cache hit
-0.3 stale warn   -0.5 stale fail -0.7 fallback
```

### Risk Judge V1.2

```
qualityLevel LOW/UNTRUSTED  → HOLD 降级 CAUTIOUS_HOLD
qualityLevel MEDIUM         → HOLD 不允许
BEAR regime                 → HOLD→WATCH, WATCH→CAUTIOUS_HOLD
BULL + HIGH confidence      → 允许温和升级
```

### 市场环境检测

```
250日收益 > +20%  → BULL
250日收益 < -20%  → BEAR
otherwise         → SIDEWAYS
```

---

## 5. 验收命令

```bash
pnpm demo:monthly-review     # 月度持仓体检
pnpm eval:monthly            # 集成验证 (6 项)
pnpm eval:monthly:unit       # 单元测试 (14 cases)
pnpm init:db                 # 初始化数据库
pnpm fetch:sample-data       # 拉取样本数据
```

---

## 6. 决策输出

| 结论 | 含义 |
|---|---|
| HOLD | 长线逻辑成立，无重大风险 |
| WATCH | 加入观察池 |
| CAUTIOUS_HOLD | 有风险信号，需跟踪 |
| REDUCE_EXIT | 投资假设被证伪 |
| EXCLUDE | 不符合长线标准 |
| DATA_INSUFFICIENT | 数据不足，不可判定 |

---

## 7. Roadmap

| 版本 | 完成 |
|---|---|
| V0.1-deterministic | 确定性体检闭环 |
| V0.2-model | DeepSeek Mock + Live 双模式 |
| V0.3-harness | HarnessRunner / ToolRegistry / Budget |
| V0.3.1-hardening | DecisionSource / LLM mode / unified stats |
| V0.4-data | DuckDB / DataQuality Gate / 样本数据 |
| V1.1-live-layer | MarketDataProvider / Cache / RateLimit / Fallback |
| V1.2-reliability | Confidence Score / Regime Detection / Risk Judge V2 |
| V1.3-multi-agent | Bull/Bear/Risk Judge (规划) |
| V1.4-ui | Tauri 桌面端 (规划) |
| V1.5-real-data | AKShare/Tushare (规划) |

---

## 8. 免责声明

个人投资研究工具，不构成投资建议。所有输出必须有证据链。
