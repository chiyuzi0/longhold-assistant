// Tool Registry — 工具注册与校验

import type { ToolDefinition } from '@longhold/tools';

export interface RegisteredTool<Input = unknown, Output = unknown> {
  name: string;
  definition: ToolDefinition<Input, Output>;
  category: 'market' | 'financial' | 'valuation' | 'risk' | 'report' | 'memory';
  isIdempotent: boolean;
  maxRetries: number;
  timeoutMs: number;
  requiredPermissions: string[];
  testPath: string;
}

export interface ToolRegistryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * ToolRegistry 管理所有 Internal Tool 的注册和查找。
 *
 * TODO:
 * - 从配置文件加载 Tool 列表
 * - 校验 inputSchema / outputSchema
 * - 关联测试文件
 */
export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" 已注册`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  list(): RegisteredTool[] {
    return [...this.tools.values()];
  }

  listByCategory(category: RegisteredTool['category']): RegisteredTool[] {
    return this.list().filter((tool) => tool.category === category);
  }

  /**
   * TODO: 校验所有已注册 Tool 的完整性。
   */
  validate(): ToolRegistryValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // TODO: 检查 name 唯一
    // TODO: 检查 inputSchema / outputSchema 存在
    // TODO: 检查 testPath 指向的文件存在

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * TODO: 从配置文件批量注册。
   */
  async loadFromConfig(_configPath: string): Promise<void> {
    // TODO: 读取 configs/tools.config.yaml 并注册
  }
}
