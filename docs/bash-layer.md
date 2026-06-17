# Bash Execution Layer — 受控 Shell 执行层

## 1. 定位

Bash Execution Layer 是 Agent 执行工程命令的唯一入口。它不是通用 Shell，而是**白名单 + 策略控制**的受控执行器。

Agent 不能直接调用系统 Shell。所有 shell 命令必须通过 Bash Executor，且需要经过 Policy 检查。

## 2. 设计原则

1. **白名单优先**：未列在 allowlist 中的命令一律拒绝
2. **危险模式检测**：即使白名单中的命令，如果参数匹配危险模式也拒绝
3. **工作目录限制**：禁止在项目目录外执行
4. **超时强制**：所有命令有超时
5. **输出捕获**：stdout / stderr / exit code 完整记录
6. **Trace 完整**：每次执行写入 trace
7. **写入需确认**：修改型命令需要用户确认
8. **Dry-run 默认**：危险命令默认只做 dry-run

## 3. 命令分类

### 允许（读）

| 命令 | 示例 | 超时 | 说明 |
|---|---|---|---|
| pnpm install | `pnpm install` | 300s | 安装依赖 |
| pnpm test | `pnpm test` | 120s | 运行测试 |
| pnpm lint | `pnpm lint` | 60s | 代码检查 |
| pnpm typecheck | `pnpm typecheck` | 60s | 类型检查 |
| pnpm build | `pnpm build` | 300s | 构建 |
| git status | `git status` | 10s | 状态 |
| git diff | `git diff` | 30s | 差异 |
| git log | `git log --oneline -20` | 10s | 日志 |
| python fetch_*.py | `python scripts/fetch_a_share.py` | 600s | 数据采集 |
| duckdb | `duckdb data/duckdb/longhold.duckdb` | 30s | 数据库查询 |
| tauri dev | `pnpm tauri dev` | — | 开发服务器（后台） |

### 禁止（写/危险）

| 模式 | 原因 |
|---|---|
| `rm -rf` | 批量删除 |
| `git push --force` | 强制推送 |
| `curl ... \| bash` | 远程代码执行 |
| `wget ... \| bash` | 远程代码执行 |
| `del /s` | 批量删除 |
| `format` | 格式化磁盘 |
| `shutdown` | 关机 |
| `powershell -enc` | 编码 PowerShell |
| `> /dev/sda` | 写入磁盘设备 |
| `chmod 777` | 过度权限 |

### 需要确认（写入）

| 命令 | 说明 |
|---|---|
| `git commit` | 需要审查 message |
| `git push` | 需要审查分支 |
| `python ... --write` | 需要确认写入 |
| `duckdb ... INSERT/UPDATE/DELETE` | 写数据库 |
| 任何 `> file` 重定向写入 | 需确认文件路径 |

## 4. Bash Executor 接口

```ts
interface BashCommand {
  command: string;      // 完整命令
  workingDir: string;   // 工作目录
  timeoutMs: number;    // 超时
  env?: Record<string, string>;  // 环境变量
  dryRun?: boolean;     // 只打印不执行
}

interface BashResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  wasDryRun: boolean;
  traceId: string;
}

interface BashExecutor {
  execute(cmd: BashCommand): Promise<BashResult>;
  validate(cmd: BashCommand): ValidationResult;
}
```

## 5. Policy 检查流程

```
BashCommand 到达
  ↓
① 模式匹配检查
  ├─ 匹配 allowlist? → 继续
  └─ 不匹配 → REJECTED: "不在白名单"
  ↓
② 危险模式检查
  ├─ 匹配 blocked_patterns? → REJECTED: "危险模式"
  └─ 通过 → 继续
  ↓
③ 工作目录检查
  ├─ 在项目目录内? → 继续
  └─ 不在 → REJECTED: "目录越界"
  ↓
④ 写操作检查
  ├─ 是写命令? → 检查 require_confirmation
  │   ├─ 需要确认且未确认? → PENDING_CONFIRMATION
  │   └─ 已确认 → 继续
  └─ 只读 → 继续
  ↓
⑤ dry-run 检查
  ├─ dry_run_by_default && 是写命令? → DRY_RUN
  └─ 否则 → 继续
  ↓
⑥ 执行
  ├─ 设置超时
  ├─ 捕获 stdout/stderr/exitCode
  ├─ 写入 Trace
  └─ 返回 BashResult
```

## 6. Trace 记录

每次 Bash 执行记录：

```json
{
  "traceId": "bash-xxxxx",
  "command": "...",
  "workingDir": "...",
  "startedAt": "...",
  "finishedAt": "...",
  "exitCode": 0,
  "wasDryRun": false,
  "outputTruncated": false
}
```

## 7. 安全边界

Bash Layer 不允许：

- 绕过 Registry 直接调用 shell
- 动态拼接命令（必须精确匹配 allowlist pattern）
- 修改 allowlist 本身
- 在项目目录外执行
- 无 Trace 执行
- 无超时执行
