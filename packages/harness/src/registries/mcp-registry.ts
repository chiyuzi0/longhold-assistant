// MCP Registry — MCP Server 注册与校验

export interface RegisteredMCPServer {
  name: string;
  transport: 'stdio' | 'sse' | 'streamable-http';
  command?: string;      // stdio
  args?: string[];       // stdio
  url?: string;          // sse / streamable-http
  tools: string[];       // 暴露的工具名称列表
  allowList: string[];   // 允许使用的工具白名单
  timeoutMs: number;
}

export interface MCPRegistryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * MCPRegistry 管理所有 MCP Server 的注册。
 *
 * 注意：MCP 层不承载业务逻辑，只做外部能力适配。
 * 初期只规划接口，不一定实现全部。
 *
 * TODO:
 * - 与 MCP Client 集成
 * - 动态 discover tools（如果 server 支持）
 * - 健康检查
 */
export class MCPRegistry {
  private servers = new Map<string, RegisteredMCPServer>();

  register(server: RegisteredMCPServer): void {
    if (this.servers.has(server.name)) {
      throw new Error(`MCP Server "${server.name}" 已注册`);
    }
    this.servers.set(server.name, server);
  }

  get(name: string): RegisteredMCPServer | undefined {
    return this.servers.get(name);
  }

  list(): RegisteredMCPServer[] {
    return [...this.servers.values()];
  }

  /**
   * 检查工具名称是否在 MCP Server 提供且允许。
   */
  isToolAllowed(serverName: string, toolName: string): boolean {
    const server = this.servers.get(serverName);
    if (!server) return false;
    return server.allowList.includes(toolName);
  }

  /**
   * TODO: 校验所有已注册 Server 的有效性。
   */
  validate(): MCPRegistryValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    // TODO: 检查 command/url 有效性
    // TODO: 检查 allowList 中的 tool 是否在 tools 中
    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * TODO: 从配置文件批量注册。
   */
  async loadFromConfig(_configPath: string): Promise<void> {
    // TODO: 读取 configs/mcp.config.yaml 并注册
  }
}
