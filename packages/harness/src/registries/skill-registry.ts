// Skill Registry — Skill 注册与校验

import type { SkillDefinition } from '@longhold/skills';

export interface RegisteredSkill {
  name: string;
  version: string;
  definition: SkillDefinition;
  hardRules: string[];          // 硬规则列表（不可被 LLM 覆盖）
  maxSteps: number;             // 最大执行步数
  maxLlmCalls: number;          // 最大 LLM 调用次数
  acceptanceCriteria: string[]; // 验收标准
  evalCases: string[];          // 关联的 Eval Case ID
}

export interface SkillRegistryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * SkillRegistry 管理所有 Skill 的注册和查找。
 *
 * TODO:
 * - 从 skills.config.yaml 加载
 * - 校验 requiredTools 是否都已注册
 * - 校验 inputSchema / outputSchema
 * - 关联 evalCases
 */
export class SkillRegistry {
  private skills = new Map<string, RegisteredSkill>();

  register(skill: RegisteredSkill): void {
    if (this.skills.has(skill.name)) {
      throw new Error(`Skill "${skill.name}" 已注册`);
    }
    this.skills.set(skill.name, skill);
  }

  get(name: string): RegisteredSkill | undefined {
    return this.skills.get(name);
  }

  list(): RegisteredSkill[] {
    return [...this.skills.values()];
  }

  /**
   * TODO: 校验已注册 Skill 的完整性。
   */
  validate(): SkillRegistryValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // TODO: 检查 requiredTools 是否都在 ToolRegistry 中
    // TODO: 检查 evalCases 路径存在

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * TODO: 从配置文件批量注册。
   */
  async loadFromConfig(_configPath: string): Promise<void> {
    // TODO: 读取 configs/skills.config.yaml 并注册
  }
}
