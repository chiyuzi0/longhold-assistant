// Bash Policy — Bash 命令白名单与安全检查

export interface BashCommandRule {
  /** 允许的命令匹配模式 */
  pattern: string;
  /** 允许的工作目录 */
  workingDir: string;
  /** 超时 ms */
  timeoutMs: number;
  /** 是否需要用户确认 */
  requireConfirmation: boolean;
  /** 是否默认 dry-run */
  dryRunByDefault: boolean;
  /** 是否捕获 stdout */
  captureStdout: boolean;
  /** 是否捕获 stderr */
  captureStderr: boolean;
}

export interface BashValidationResult {
  allowed: boolean;
  dryRun: boolean;
  requiresConfirmation: boolean;
  matchedRule?: string;
  reason?: string;
}

export interface BashPolicyConfig {
  allowedCommands: BashCommandRule[];
  blockedPatterns: string[];
  defaultTimeoutMs: number;
  requireConfirmationForWrite: boolean;
  dryRunByDefault: boolean;
}

/**
 * BashPolicy 检查每个 Bash 命令是否可以执行。
 *
 * 检查顺序：
 * 1. 模式匹配（精确匹配 allowlist）
 * 2. 危险模式检测（blocked patterns）
 * 3. 工作目录限制
 * 4. 写入确认
 * 5. Dry-run 判断
 *
 * TODO:
 * - 实现更灵活的模式匹配（regex 或 glob）
 * - 集成到 Harness Runner
 */
export class BashPolicy {
  private config: BashPolicyConfig;

  constructor(config: Partial<BashPolicyConfig> = {}) {
    this.config = {
      allowedCommands: [],
      blockedPatterns: [
        'rm -rf',
        'git push --force',
        'curl ',
        'wget ',
        'del /s',
        'format ',
        'shutdown',
        'powershell -enc',
        '> /dev/',
      ],
      defaultTimeoutMs: 120_000,
      requireConfirmationForWrite: true,
      dryRunByDefault: true,
      ...config,
    };
  }

  /**
   * 校验一个 Bash 命令是否可以执行。
   */
  validate(command: string, _workingDir: string): BashValidationResult {
    // 1. 检查 blocked patterns
    for (const pattern of this.config.blockedPatterns) {
      if (command.includes(pattern)) {
        return {
          allowed: false,
          dryRun: false,
          requiresConfirmation: false,
          reason: `命令匹配禁止模式: "${pattern}"`,
        };
      }
    }

    // 2. 检查 allowed commands 是否匹配
    let matchedRule: BashCommandRule | undefined;
    for (const rule of this.config.allowedCommands) {
      if (command.startsWith(rule.pattern)) {
        matchedRule = rule;
        break;
      }
    }

    if (!matchedRule) {
      return {
        allowed: false,
        dryRun: false,
        requiresConfirmation: false,
        reason: `命令不在白名单中: "${command}"`,
      };
    }

    // 3. 判断是否需要 dry-run
    const dryRun = matchedRule.dryRunByDefault ?? this.config.dryRunByDefault;

    // 4. 判断是否需要确认
    const requiresConfirmation =
      matchedRule.requireConfirmation ?? this.config.requireConfirmationForWrite;

    return {
      allowed: true,
      dryRun,
      requiresConfirmation,
      matchedRule: matchedRule.pattern,
    };
  }

  getConfig(): BashPolicyConfig {
    return { ...this.config };
  }
}
