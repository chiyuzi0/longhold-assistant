# Harness — Agent 约束与控制层

## 1. 定位

Harness 是 LongHold Assistant 的"安全笼"，负责管住 Agent 的一切行为边界。Agent 不能绕过 Harness 做任何事。

Harness 对 Control Plane 的所有组件进行注册、校验、限制和审计。

## 2. 核心职责

```text
                    ┌────────────────────────┐
                    │        HARNESS         │
                    │  (一切请求的守门人)      │
                    └───────────┬────────────┘
                                │
      ┌──────────┬──────────┬───┴───┬──────────┬──────────┬──────────┐
      │Registry  │Permission│Budget │Evidence  │ Risk     │ Replay   │
      │          │Policy    │Policy │Gate      │ Gate     │          │
      │ Tool Reg │ Bash ACL │Token  │ 证据链   │ 硬规则   │ 回放     │
      │ Skill Reg│ Tool ACL │Time   │ 完整性   │ Gate     │ 测试     │
      │ MCP Reg  │ Skill ACL│Steps  │ 追溯     │          │          │
      │ Bash Reg │ Mem ACL  │       │          │          │          │
      └──────────┴──────────┴───────┴──────────┴──────────┴──────────┘
```

## 3. Tool Registry

注册所有 Internal Tool。每个 Tool 必须有：

| 字段 | 说明 |
|---|---|
| name | 唯一工具名 |
| description | 给 LLM 看的描述 |
| inputSchema | JSON Schema |
| outputSchema | JSON Schema |
| category | market / financial / valuation / risk / report / memory |
| isIdempotent | 是否幂等 |
| maxRetries | 最大重试次数 |
| timeoutMs | 超时 |
| requiredPermissions | 所需权限 |
| testPath | 测试文件路径 |

Tool Registry 启动时校验所有 Tool 定义完整性。

## 4. Skill Registry

注册所有 Skill。每个 Skill 必须有：

| 字段 | 说明 |
|---|---|
| name | 唯一 Skill 名 |
| version | 语义版本 |
| description | 描述 |
| inputSchema | 输入 Schema |
| outputSchema | 输出 Schema |
| requiredTools | 依赖的 Tool 列表 |
| optionalAgents | 可选的 Agent 角色 |
| hardRules | 硬规则列表（不可被 LLM 覆盖） |
| maxSteps | 最大执行步数 |
| maxLlmCalls | 最大 LLM 调用次数 |
| acceptanceCriteria | 验收标准 |
| evalCases | 关联的 Eval Case |

## 5. MCP Registry

注册所有 MCP Server。每个 MCP Server 必须有：

| 字段 | 说明 |
|---|---|
| name | MCP Server 名 |
| transport | stdio / sse / streamable-http |
| command / url | 启动命令或 URL |
| tools | 暴露的工具列表 |
| allowList | 允许使用的工具白名单 |
| timeoutMs | 超时 |

## 6. Bash Command Registry (详见 bash-layer.md)

注册所有允许的 bash 命令。

| 字段 | 说明 |
|---|---|
| pattern | 命令匹配模式 |
| workingDir | 允许的工作目录 |
| timeoutMs | 超时 |
| requireConfirmation | 是否需要用户确认 |
| isDryRun | 是否只做 dry-run |
| captureStdout | 是否捕获 stdout |
| captureStderr | 是否捕获 stderr |

## 7. Permission Policy

控制每个 Tool / Skill / MCP Server / Bash Command 的权限。

```ts
interface PermissionPolicy {
  allowToolCalls: boolean;
  allowMCP: boolean;
  allowBash: boolean;
  allowLLM: boolean;
  allowMemoryWrite: boolean;
  allowMemoryRead: boolean;
  requireUserConfirmationFor: string[]; // 需要确认的操作
  blockedPatterns: string[]; // 完全禁止
}
```

## 8. Budget Policy

控制资源消耗。

```ts
interface BudgetPolicy {
  maxLlmCalls: number;        // 单次任务最大 LLM 调用次数
  maxSteps: number;           // 单次任务最大步数
  maxTimeMs: number;          // 单次任务最大时间
  maxTokensPerCall: number;   // 单次 LLM 调用最大 token
  maxTokensPerTask: number;   // 单次任务总 token 限制
}
```

## 9. Evidence Gate

在 FINISH 前检查：

- evidence 数组非空
- 每个 evidence 有 source + title
- 关键 evidence 有 asOfDate
- evidence_id 可追溯

## 10. Risk Gate

在 JUDGE 阶段，硬规则 Gate 先于 LLM：

1. CRITICAL 风险 → 强制 EXCLUDE
2. 数据缺失 → 不得输出 HOLD
3. 财务恶化 → 不得输出 HOLD

系统输出中标记 `hardRuleOverride: boolean`。

## 11. Replay & Regression Gate

Harness 支持：

- **Replay**：用历史 Trace 重放一次任务，验证确定性
- **Regression Gate**：代码变更后，重放 baseline Trace，检查输出是否一致（定性一致，非完全一致）

## 12. Harness Runner

`harness-runner.ts` 是 Harness 的统一入口：

```ts
interface HarnessRunner {
  executeTask(task: TaskRequest): Promise<HarnessResult>;
  validateRegistry(): Promise<ValidationResult>;
  runEval(evalCase: EvalCase): Promise<EvalResult>;
  replayTrace(trace: Trace): Promise<ReplayResult>;
}
```

Harness Runner 是唯一可以从外部调用的接口。所有内部组件必须通过 Harness Runner 访问。
