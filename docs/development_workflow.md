# 开发工作流

## 1. 推荐迭代方式

每次只开发一条闭环：

```text
数据 → 工具 → Skill → 页面 → 报告 → 测试
```

不要只堆页面，也不要只堆算法。

## 2. 第一条闭环

月度持仓体检：

1. 导入持仓 CSV；
2. 查询日 K；
3. 计算 250 日表现；
4. 执行风险剔除；
5. 生成建议；
6. 显示在持仓体检页面；
7. 导出 Markdown 报告。

## 3. AI Coding 提示词模板

```text
你是本项目的高级 TypeScript/Tauri 架构工程师。
请严格遵守 AGENTS.md。
当前任务：实现 monthly-holding-review 的第一版闭环。
要求：
1. 不调用真实外部接口，使用 tests/fixtures 数据；
2. 工具层必须可测试；
3. Skill 层只编排工具；
4. 输出结构化 ReviewResult；
5. 添加 vitest 单测；
6. 不要修改无关文件。
```
