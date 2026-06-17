// MCP Layer — 外部能力适配

/**
 * MCP (Model Context Protocol) 层负责外部能力接入。
 *
 * ⚠️ MCP 层不承载业务逻辑，只做协议适配。
 *
 * 初期规划：
 * - duckdb-mcp: DuckDB 数据库查询
 * - filesystem-readonly-mcp: 只读文件系统
 * - report-export-mcp: 报告导出
 * - web-search-mcp: 网络搜索
 * - document-mcp: 文档解析
 *
 * TODO: 实现 MCP Client（与 @modelcontextprotocol/sdk 集成）
 * TODO: 实现 MCP Registry（注册 MCP Server 的工具列表）
 */

export interface MCPClientConfig {
  serverName: string;
  transport: 'stdio' | 'sse' | 'streamable-http';
  command?: string;
  args?: string[];
  url?: string;
  timeoutMs: number;
}

export interface MCPToolCall {
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  ok: boolean;
  content: unknown;
  error?: string;
}

/**
 * MCP Client 占位。
 *
 * TODO: 实现与 MCP Server 的通信。
 */
export class MCPClient {
  // TODO
}
