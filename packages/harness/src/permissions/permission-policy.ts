// Permission Policy — 权限控制

export type PermissionAction =
  | 'TOOL_CALL'
  | 'MCP_CALL'
  | 'BASH_EXEC'
  | 'LLM_CALL'
  | 'MEMORY_READ'
  | 'MEMORY_WRITE'
  | 'FILE_READ'
  | 'FILE_WRITE'
  | 'NETWORK_REQUEST';

export interface PermissionPolicyConfig {
  /** 全局开关 */
  allowToolCalls: boolean;
  allowMCP: boolean;
  allowBash: boolean;
  allowLLM: boolean;
  allowMemoryWrite: boolean;
  allowMemoryRead: boolean;
  allowFileRead: boolean;
  allowFileWrite: boolean;
  allowNetworkRequest: boolean;

  /** 需要用户确认的操作列表 */
  requireUserConfirmationFor: string[];

  /** 禁止的操作模式 */
  blockedPatterns: string[];

  /** 允许的网络域名（如果 allowNetworkRequest 为 true） */
  allowedDomains?: string[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

/**
 * PermissionPolicy 控制 Agent 的每一步动作是否可以执行。
 *
 * TODO:
 * - 与 Tool/Skill/MCP/Bash Registry 集成
 * - 运行时权限检查
 * - 用户确认 UI 集成
 */
export class PermissionPolicy {
  private config: PermissionPolicyConfig;

  constructor(config: Partial<PermissionPolicyConfig> = {}) {
    this.config = {
      allowToolCalls: true,
      allowMCP: true,
      allowBash: true,
      allowLLM: true,
      allowMemoryWrite: true,
      allowMemoryRead: true,
      allowFileRead: true,
      allowFileWrite: false,     // 默认禁止文件写入
      allowNetworkRequest: false, // 默认禁止网络
      requireUserConfirmationFor: [],
      blockedPatterns: [],
      ...config,
    };
  }

  check(action: PermissionAction, detail?: string): PermissionCheckResult {
    // 检查全局开关
    switch (action) {
      case 'TOOL_CALL': if (!this.config.allowToolCalls) return { allowed: false, requiresConfirmation: false, reason: 'Tool 调用已禁用' }; break;
      case 'MCP_CALL': if (!this.config.allowMCP) return { allowed: false, requiresConfirmation: false, reason: 'MCP 调用已禁用' }; break;
      case 'BASH_EXEC': if (!this.config.allowBash) return { allowed: false, requiresConfirmation: false, reason: 'Bash 执行已禁用' }; break;
      case 'LLM_CALL': if (!this.config.allowLLM) return { allowed: false, requiresConfirmation: false, reason: 'LLM 调用已禁用' }; break;
      case 'MEMORY_WRITE': if (!this.config.allowMemoryWrite) return { allowed: false, requiresConfirmation: false, reason: 'Memory 写入已禁用' }; break;
      case 'MEMORY_READ': if (!this.config.allowMemoryRead) return { allowed: false, requiresConfirmation: false, reason: 'Memory 读取已禁用' }; break;
      case 'FILE_READ': if (!this.config.allowFileRead) return { allowed: false, requiresConfirmation: false, reason: '文件读取已禁用' }; break;
      case 'FILE_WRITE': if (!this.config.allowFileWrite) return { allowed: false, requiresConfirmation: false, reason: '文件写入已禁用' }; break;
      case 'NETWORK_REQUEST': if (!this.config.allowNetworkRequest) return { allowed: false, requiresConfirmation: false, reason: '网络请求已禁用' }; break;
    }

    // 检查是否需要用户确认
    if (detail && this.config.requireUserConfirmationFor.some((pattern) => detail.includes(pattern))) {
      return { allowed: true, requiresConfirmation: true };
    }

    // 检查禁止模式
    if (detail && this.config.blockedPatterns.some((pattern) => detail.includes(pattern))) {
      return { allowed: false, requiresConfirmation: false, reason: `匹配禁止模式: ${pattern}` };
    }

    return { allowed: true, requiresConfirmation: false };
  }

  getConfig(): PermissionPolicyConfig {
    return { ...this.config };
  }
}
