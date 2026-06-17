// Evidence Manager — 证据收集与管理

import type { Evidence } from '@longhold/core';

export interface EvidenceItem extends Evidence {
  evidenceId: string;
  collectedAt: string;
  fromTool: string;
  fromToolCallId: string;
  relevanceScore?: number;   // 与当前决策的相关性 (0-1)
  verified?: boolean;         // 是否已交叉验证
}

export interface EvidenceCollection {
  taskId: string;
  items: EvidenceItem[];
  collectedAt: string;
}

/**
 * EvidenceManager 负责：
 * 1. 收集所有工具返回的 evidence
 * 2. 去重
 * 3. 关联到证据 ID
 * 4. 标记相关性
 *
 * TODO:
 * - 实现去重逻辑（相同 source + title）
 * - 实现交叉验证（不同工具对同一事实的确认）
 * - 生成 evidence 摘要供 Agent 使用
 */
export class EvidenceManager {
  private collection: EvidenceCollection;

  constructor(taskId: string) {
    this.collection = { taskId, items: [], collectedAt: '' };
  }

  /**
   * 添加一条证据。自动生成 evidenceId。
   */
  addEvidence(
    evidence: Evidence,
    fromTool: string,
    fromToolCallId: string,
  ): string {
    const evidenceId = `ev-${this.collection.items.length + 1}`;
    this.collection.items.push({
      ...evidence,
      evidenceId,
      collectedAt: new Date().toISOString(),
      fromTool,
      fromToolCallId,
    });
    return evidenceId;
  }

  /**
   * 添加多条证据。
   */
  addEvidenceBatch(
    items: Evidence[],
    fromTool: string,
    fromToolCallId: string,
  ): string[] {
    return items.map((item) => this.addEvidence(item, fromTool, fromToolCallId));
  }

  /**
   * 获取所有证据。
   */
  getAll(): EvidenceItem[] {
    return this.collection.items;
  }

  /**
   * 获取证据 ID 列表（供 Decision 引用）。
   */
  getEvidenceIds(): string[] {
    return this.collection.items.map((item) => item.evidenceId);
  }

  /**
   * TODO: 去重 — 相同 source + title 且 value 相同的只保留一条。
   */
  deduplicate(): void {
    // TODO: 实现去重
  }
}
