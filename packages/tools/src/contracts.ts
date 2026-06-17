// Tool Contracts — 统一工具接口定义

import type { Evidence } from '@longhold/core';

export interface ToolError {
  code: string;
  message: string;
  detail?: unknown;
}

export interface ToolResult<T> {
  ok: boolean;
  data?: T;
  error?: ToolError;
  evidence?: Evidence[];
}

export interface ToolContext {
  requestId: string;
  asOfDate?: string;
}

export interface ToolDefinition<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  execute(input: Input, context: ToolContext): Promise<ToolResult<Output>>;
}
