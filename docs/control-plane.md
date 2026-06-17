# Control Plane — Agent Runtime 整体控制层

## 1. 定位

Control Plane 是 LongHold Assistant 的"大脑中枢"，负责调度和执行所有 Agent 任务。它不是 ReAct 的无限循环，而是**受控状态机 + 规则驱动**的任务执行引擎。

## 2. 核心组件

```text
                     ┌──────────────────────────┐
                     │       Task Router         │
                     │  (接收请求 → 匹配 Skill)    │
                     └────────────┬─────────────┘
                                  │
                     ┌────────────▼─────────────┐
                     │       Agent Loop          │
                     │  (受控状态机，无自由循环)    │
                     └────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼───────┐    ┌────────────▼────────────┐   ┌───────▼───────┐
│  Skill Runner │    │     Tool Router          │   │  Memory Mgr   │
│ (流程编排)     │    │ (内部工具 + MCP 路由)      │   │ (读写记忆)    │
└───────┬───────┘    └────────────┬────────────┘   └───────────────┘
        │                         │
┌───────▼───────┐    ┌────────────▼────────────┐
│  Agent Roles  │    │   Bash Executor          │
│ (多角色分析)   │    │ (受控 Shell 执行)         │
└───────────────┘    └─────────────────────────┘

                     ┌──────────────────────────┐
                     │        Harness            │
                     │ (权限/预算/Trace/回放)      │
                     └──────────────────────────┘

                     ┌──────────────────────────┐
                     │       Eval Runner         │
                     │ (离线/在线评估)            │
                     └──────────────────────────┘
```

## 3. Task Router

输入：用户请求（自然语言 + 上下文）
输出：匹配到的 Skill ID

匹配逻辑：
1. 精确匹配 (skill name)
2. 关键词匹配 (skill description + tags)
3. 语义匹配 (LLM 初步筛选，仅匹配阶段)

Task Router 不执行任何工具调用，只负责路由。

## 4. Agent Loop (详见 agent-loop.md)

状态机，不允许自由循环：

```
INIT → LOAD_CONTEXT → SELECT_SKILL → PLAN → EXECUTE_STEP
  → VALIDATE_RESULT → COLLECT_EVIDENCE → ANALYZE → JUDGE
  → REPORT → WRITE_MEMORY → FINISH
```

每个状态都有最大步数限制和超时控制。

## 5. Skill Runner

职责：
- 加载 Skill 定义（YAML + TS）
- 按 Skill.required_tools 注入依赖
- 按 Skill.max_steps 限制执行步数
- 执行完成→输出 SkillResult

Skill Runner 本身不直接调用 LLM，只编排工具和 Agent 角色。

## 6. Tool Router

职责：
- 接收 Tool 调用请求
- 判断是 Internal Tool 还是 MCP Tool
- 路由到对应执行器
- 返回统一 ToolResult

### Internal Tool
- 内置在 `packages/tools/` 中
- 确定性、可测试、无网络依赖
- 例如：calculate_roe、screen_st_risk

### MCP Tool
- 通过 MCP Client 桥接到外部进程
- 例如：duckdb-mcp、web-search-mcp

## 7. Model Gateway

职责：
- 统一 LLM 调用入口
- 支持多模型（DeepSeek V4 Pro / Flash）
- 预算控制（token 消耗追踪）
- 超时控制
- Fallback 策略

## 8. Evidence Manager

职责：
- 收集每一步工具返回的 evidence
- 去重、排序
- 关联到最终决策
- 生成 evidence_id 便于 trace

## 9. Trace Recorder (详见 trace-schema.md)

职责：
- 记录完整任务执行过程
- 支持 Replay（在 Harness 层）
- 支持 Eval 离线评估

## 10. Output Validator

职责：
- Schema 校验（LongHoldDecision 结构）
- 风险规则 Gate（EXCLUDE 是否被覆盖？）
- 证据链完整性检查
- 禁止输出检测（"必涨""保证"等词）

## 11. Memory Manager

职责：
- 读写 Memory 层
- 提供上下文给 Agent Loop
- 在 FINISH 前写入决策日志

## 12. 系统启动流程

```
1. Harness 加载所有 Registry (Tool/Skill/MCP/Bash)
2. Harness 验证所有 Schema、Rule、Policy
3. Control Plane 就绪，等待 Task
4. Task Router 接收请求
5. Agent Loop 执行
6. Eval Gate 检查（如果 enable_eval_gate: true）
7. 返回结果 + Trace
```
