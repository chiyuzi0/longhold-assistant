# AGENTS.md — AI Coding 工作规则

本文件给 Codex、Claude Code、Cursor、OpenCode、Hermes Agent 等 AI 编程助手使用。

## 1. 项目性质

LongHold Assistant 是一个 **A股 / 港股长线持仓 AI Agent 研究工作台**。它不是纯聊天机器人，也不是全自动荐股软件。

## 2. 架构铁律

### 2.1 数据先行，AI 解释在后

- 不要让 LLM 直接计算财务指标
- 所有计算结果必须由 Tools 层产生
- LLM 只做：解释、总结、枚举观点、语言润色

### 2.2 证据链强制

- 所有投资建议必须有 `evidence_id`
- 每条 evidence 必须能追溯到具体的 Tool 调用和原始数据字段
- 无 evidence 的结论 → 拒绝通过 Evidence Gate

### 2.3 硬规则优先

- 高风险规则（ST/退市/停牌）优先于模型建议
- 硬规则 Gate 触发 → LLM 输出被覆盖（标记 `hard_rule_override: true`）
- 数据缺失时禁止强行给予 HOLD 建议

### 2.4 分层约束

| 层 | 可以做 | 禁止做 |
|---|---|---|
| Tools | 确定性计算、数据查询 | 主观判断、LLM 调用 |
| Skills | 编排工具、流程控制 | 硬编码投资逻辑、绕过规则 |
| Agents | 解释、总结、多视角分析 | 编造数据、绕过硬规则 |
| Harness | 权限检查、预算控制 | 被 Agent 绕过 |
| MCP | 外部能力适配 | 承载业务逻辑 |

## 3. 开发规则

### 3.1 代码规则

- TypeScript 严格模式
- 所有核心函数必须有输入输出类型
- 不在 UI 组件里写复杂业务逻辑
- 不在 Agent 里写数据计算逻辑
- 代码中只允许使用英文
- 注释中不写开发过程式说明

### 3.2 架构同步

- 修改架构必须同步更新 `docs/` 下的对应文档
- 新增 Tool → 更新 `configs/tools.config.yaml`
- 新增 Skill → 更新 `configs/skills.config.yaml` + 创建 eval case
- 新增 Bash 命令 → 更新 `configs/bash.config.yaml`
- 新增 MCP Server → 更新 `configs/mcp.config.yaml`

### 3.3 测试要求

- 所有新增 Tool 必须有测试（`tests/tools/`）
- 所有新增 Skill 必须有至少一个 eval case（`evals/cases/`）
- 修改 Skill 逻辑后 → 运行对应的 eval suite
- 提 PR 前 → Regression Gate 必须通过

### 3.4 Bash 命令

- Bash 命令必须通过 Harness 白名单
- 未列在 `configs/bash.config.yaml` 中的命令一律拒绝
- 危险模式（`rm -rf`、`git push --force`、`curl | bash`）禁止
- 写入型命令需要用户确认

### 3.5 禁止事项

- 禁止硬编码真实账号、token、API key
- 禁止提交真实持仓数据
- 禁止把 LLM 输出当作事实写入数据库
- 禁止没有证据链的投资建议
- 禁止让 LLM 自行编造财报、公告、政策或行情数据
- 禁止在输出中使用"必涨""保证收益""推荐买入""无风险"等表述
- 禁止把用户真实持仓提交到日志、测试样例或公共仓库
- 永远不要使用 `/init`

## 4. 验收标准

### 每个 Skill 至少

- 输入定义（YAML + TS）
- 输出定义（YAML + TS）
- required_tools 列表
- hard_rules 列表
- max_steps / max_llm_calls
- acceptance_criteria
- eval_cases（>= 1）

### 每个 Tool 至少

- name + description
- inputSchema + outputSchema
- 错误处理
- 边界说明
- 测试文件

### 每个 Eval Case 至少

- case_id + description
- task + portfolio + fixtures
- expected action
- forbidden_outputs
- required_evidence

## 5. Trace 要求

所有关键操作必须有 Trace 记录：

- Tool 调用
- MCP 调用
- Bash 命令执行
- LLM 调用（token 消耗）
- 状态机转换
- 最终决策
- Memory 写入

Trace 用于 Replay、Eval 和 Regression Gate。

## 6. 第一个闭环（优先实现）

```text
持仓 CSV 导入 → 250 日表现计算 → 风险规则检查
  → DeepSeek 解释 → 风控裁决 → 月度持仓报告
  → 写入记忆 → Eval 验收
```
