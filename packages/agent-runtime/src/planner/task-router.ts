// Task Router — 请求路由到 Skill

import type { SkillDefinition } from '@longhold/skills';

export interface TaskRequest {
  requestId: string;
  input: string;            // 自然语言 或 结构化输入
  context?: Record<string, unknown>;
  preferredSkill?: string;  // 用户指定的 Skill（跳过匹配）
}

export interface TaskRoute {
  skillId: string;
  skill: SkillDefinition;
  confidence: number;
  reason: string;
}

/**
 * TaskRouter 负责将用户请求匹配到合适的 Skill。
 *
 * 匹配顺序：
 * 1. 精确匹配 (preferredSkill)
 * 2. 关键词匹配 (description + tags)
 * 3. LLM 语义匹配（仅在 enableLlmRouting 开启时）
 *
 * TODO:
 * - 实现关键词匹配逻辑
 * - 集成 LLM 语义路由（可选）
 * - 返回多个候选项供确认
 */
export class TaskRouter {
  // TODO: 注入 SkillRegistry
  // constructor(private skillRegistry: SkillRegistry) {}

  async route(request: TaskRequest): Promise<TaskRoute | null> {
    if (request.preferredSkill) {
      // TODO: 从 SkillRegistry 查找
      // const skill = this.skillRegistry.get(request.preferredSkill);
      // if (skill) return { skillId: request.preferredSkill, skill, confidence: 1.0, reason: '用户指定' };
      return null;
    }

    // TODO: 关键词匹配
    // TODO: LLM 语义匹配（可选）

    return null;
  }
}
