// Bash Executor — 受控 Shell 命令执行器

import type { BashPolicy } from './bash-policy';
import type { TraceRecorder } from '@longhold/agent-runtime';

export interface BashCommand {
  command: string;
  workingDir: string;
  timeoutMs: number;
  env?: Record<string, string>;
  dryRun?: boolean;
}

export interface BashResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  wasDryRun: boolean;
  traceId: string;
}

/**
 * BashExecutor 是 Agent 执行 shell 命令的唯一入口。
 *
 * 注意：当前为占位实现。真实实现需要：
 * - 集成 Node.js child_process
 * - 超时控制
 * - stdout/stderr 缓冲
 * - 工作目录沙箱化
 * - Trace 自动记录
 *
 * 禁止行为：
 * - 绕过 BashPolicy 直接执行
 * - 在项目目录外执行
 * - 无超时的命令
 * - 无 Trace 的执行
 */
export class BashExecutor {
  private policy: BashPolicy;

  constructor(policy: BashPolicy) {
    this.policy = policy;
  }

  /**
   * 执行一条 Bash 命令。
   *
   * TODO: 实现真实执行逻辑
   */
  async execute(cmd: BashCommand, _trace?: TraceRecorder): Promise<BashResult> {
    // 1. Policy 校验
    const validation = this.policy.validate(cmd.command, cmd.workingDir);
    if (!validation.allowed) {
      return {
        ok: false,
        stdout: '',
        stderr: validation.reason ?? '命令被拒绝',
        exitCode: 1,
        durationMs: 0,
        wasDryRun: false,
        traceId: '',
      };
    }

    // 2. Dry-run 模式
    if (cmd.dryRun ?? validation.dryRun) {
      return {
        ok: true,
        stdout: `[DRY-RUN] ${cmd.command}`,
        stderr: '',
        exitCode: 0,
        durationMs: 0,
        wasDryRun: true,
        traceId: '',
      };
    }

    // TODO: 实际执行命令
    // const { exec } = await import('node:child_process');
    // const child = exec(cmd.command, { cwd: cmd.workingDir, timeout: cmd.timeoutMs, ... });

    return {
      ok: false,
      stdout: '',
      stderr: 'BashExecutor 尚未实现真实执行',
      exitCode: 1,
      durationMs: 0,
      wasDryRun: false,
      traceId: '',
    };
  }

  /**
   * 获取 Policy 引用（用于配置检查）。
   */
  getPolicy(): BashPolicy {
    return this.policy;
  }
}
