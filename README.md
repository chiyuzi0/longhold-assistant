# LongHold Assistant — A/H 股长线持仓 AI Agent 研究工作台

> 目标：构建一个有数据、有规则、有工具、有 Skills、有 Memory、有 Eval 的长线投资分析助手。

LongHold Assistant 不是"AI 荐股软件"，也不是纯聊天机器人，而是一个 **受控多 Agent 架构的长线持仓研究助手**。

- 这家公司是否仍然符合长期持有逻辑？
- 当前风险是价格波动还是基本面恶化？
- 投资假设是否被证伪？
- 月度、季度、年度复盘应该看什么？

---

## 1. 技术栈

| 层级 | 技术 |
|---|---|
| 桌面应用 | Tauri 2 |
| 主语言 | TypeScript (strict) |
| 前端 | React + TypeScript |
| 图表 | ECharts + Lightweight Charts |
| 数据库 | DuckDB |
| 数据格式 | Parquet / CSV |
| 模型 | DeepSeek V4 系列（Pro / Flash） |
| Agent 架构 | 受控状态机式 Agent Loop — 不做无线自由循环 |
| 包管理 | pnpm (Monorepo) |
| 测试 | Vitest |

---

## 2. 架构分层

```text
                        ┌────────────────────────┐
                        │     Desktop UI           │  (Tauri + React)
                        └───────────┬────────────┘
                                    │
                        ┌───────────▼────────────┐
                        │    Control Plane        │  (agent-runtime)
                        │  Task Router → Loop     │
                        │  Skill Runner → Tool    │
                        │  Evidence → Validator   │
                        └───────────┬────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
┌──────▼──────┐  ┌──────────┐  ┌────▼─────┐  ┌──────────┐  ┌───▼────────┐
│   Skills    │  │  Agents  │  │  Tools   │  │   MCP    │  │  Memory    │
│  工作流编排  │  │ 多角色分析│  │ 确定性计算│  │ 外部能力  │  │  长期记忆   │
└──────┬──────┘  └──────────┘  └────┬─────┘  └──────────┘  └─────┬──────┘
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    │
                        ┌───────────▼────────────┐
                        │        Harness          │  (约束与控制)
                        │ Registry / Permission   │
                        │ Budget / Risk Gate      │
                        │ Bash / Replay / Eval    │
                        └───────────┬────────────┘
                                    │
                        ┌───────────▼────────────┐
                        │   Data Layer            │
                        │ DuckDB / Parquet / CSV  │
                        └────────────────────────┘
```

### 10 个核心包

| 包 | 定位 |
|---|---|
| `core` | 领域模型、评分模型、风险规则 |
| `data` | DuckDB、Parquet、数据导入/导出 |
| `tools` | 工具层 — 确定性、可测试、可审计的函数 |
| `skills` | Skills 层 — 可复用研究工作流 |
| `agent-runtime` | Control Plane — 受控状态机式 Agent Loop |
| `harness` | 安全笼 — Registry / 权限 / 预算 / Bash / Replay / Eval Gate |
| `mcp` | MCP 层 — 外部能力适配（不承载业务逻辑） |
| `memory` | 记忆层 — 用户偏好、持仓记忆、投资假设、决策日志 |
| `evals` | 评估层 — 五层 Agent Eval（Tool/Skill/Trajectory/Output/Business） |
| `report` | 报告层 — Markdown / PDF 生成 |

---

## 3. Agent 架构（重点）

### 受控 Agent Loop（不是 ReAct）

```
INIT → LOAD_CONTEXT → SELECT_SKILL → PLAN → EXECUTE_STEP
  → VALIDATE_RESULT → COLLECT_EVIDENCE → ANALYZE → JUDGE
  → REPORT → WRITE_MEMORY → FINISH
```

硬约束：
- 最大步数：12
- 最大 LLM 调用次数：6
- 最大时间：300s
- 硬规则 Gate：ST/退市 → 强制 EXCLUDE（不可被 LLM 覆盖）

详见 `docs/agent-loop.md` 和 `docs/control-plane.md`。

### Harness 控制

Harness 是 Agent 的"安全笼"，管控一切：
- Tool / Skill / MCP / Bash 注册表
- 权限策略
- 预算策略（token/步数/时间）
- 硬规则 Gate
- 证据链 Gate
- Bash 命令白名单
- Replay 回放
- Regression Gate

详见 `docs/harness-design.md` 和 `docs/bash-layer.md`。

### 五层 Eval

| Layer | 名称 | 评估对象 |
|---|---|---|
| 1 | Tool Eval | 工具计算正确性 |
| 2 | Skill Eval | Skill 流程完整性 |
| 3 | Trajectory Eval | Agent 路径效率 |
| 4 | Output Eval | 输出正确性 |
| 5 | Business Eval | 投资逻辑合理性 |

详见 `docs/agent-eval.md`。

---

## 4. 目录结构

```text
longhold-assistant/
├─ apps/desktop/                    # Tauri + React 桌面应用
├─ packages/
│  ├─ core/                         # 领域模型 / 评分 / 风险规则
│  ├─ data/                         # DuckDB / Parquet / 仓储
│  ├─ tools/                        # 工具层（确定性函数）
│  ├─ skills/                       # Skills 层（工作流编排）
│  ├─ agent-runtime/                # Control Plane（Agent Loop）
│  ├─ harness/                      # 约束与控制（安全笼）
│  ├─ mcp/                          # MCP 层（外部能力适配）
│  ├─ memory/                       # 记忆层（长期上下文）
│  ├─ evals/                        # 评估层（五层 Eval）
│  ├─ report/                       # 报告层
│  └─ charts/                       # 图表封装
├─ configs/                         # 配置文件
├─ docs/                            # 架构文档
├─ evals/cases/                     # Eval 用例
├─ memory/                          # 记忆存储
├─ scripts/                         # 数据采集脚本
├─ prompts/                         # 提示词模板
└─ tests/                           # 测试
```

---

## 5. 决策输出格式

| 结论 | 含义 |
|---|---|
| HOLD | 长线逻辑仍成立，未触发重大风险 |
| WATCH | 加入观察池 |
| CAUTIOUS_HOLD | 有风险信号，需跟踪下一期数据 |
| REDUCE_EXIT | 投资假设被部分或明显证伪 |
| EXCLUDE | 不符合长线跟踪标准 |

每个结论必须包含：关键证据、风险点、反方观点、下一次观察点、触发撤出条件。

---

## 6. 启动

```bash
pnpm install
pnpm data:init
pnpm dev:desktop   # 启动桌面应用
pnpm test          # 运行测试
pnpm typecheck     # 类型检查
```

---

## 7. MVP 路线

| 版本 | 目标 |
|---|---|
| V0.1 | 本地工作台骨架 + 月度持仓体检闭环 + Eval |
| V0.2 | 财报数据接入 + 财务风险规则 + 单股研究 |
| V0.3 | 港股支持 + 观察池管理 |
| V0.4 | Agent 多角色分析 + 报告中心 |
| V1.0 | 可用 EXE + 加密存储 + 完整文档 |

---

## 8. 免责声明

本项目用于个人研究、数据整理和长期投资复盘，不构成任何投资建议。
所有模型输出必须附带数据来源、计算过程和风险提示。
用户应自行判断并承担投资风险。
