# CLAUDE.md — 错误与经验记录

## 已学习的经验

### 2026-06-17: 环境限制 — 无 pnpm / duckdb / tsx

在 Windows Node.js v25.8.0 环境下：
- `pnpm` 不可用 → 使用 `npm` 或直接 `node` 执行 JS
- `tsx` 不可用 → `.ts` 文件无法直接运行，需要 `.cjs` 版本
- `duckdb` CLI 不可用 → 使用 JSON fallback 存储层
- 类型为 `module` 的包中使用 CommonJS 需改 `.cjs` 后缀
- 内置 `fetch` 可用但不代理 HTTP_PROXY

**应对方案：**
- 核心逻辑写 `.cjs`（CommonJS），避免 ESM 解析问题
- DuckDBClient 自动检测 CLI 可用性，不可用时降级为 JSON 文件后端
- 保持 `.ts` 文件作为类型定义，`.cjs` 作为运行时

### 2026-06-17: 路径解析规则

`.` 分隔符的 require 路径从调用文件位置计算，不是从项目根。多层嵌套时容易出错。

**应对方案：**
- 工具文件统一放在 `packages/tools/src/tools/`，通过相对路径引用
- 所有跨包引用写完整相对路径，并在修改后运行确认

### 2026-06-17: 数据质量门优先序

`data_quality_gate` 如果放在 `pre_model_risk_gate` 之前，会对 ST 股票同时触发数据质量 FAIL 和硬规则 EXCLUDE，导致 ST 股票输出 DATA_INSUFFICIENT 而不是 EXCLUDE。

**应对方案：**
- `pre_model_risk_gate`（硬规则）始终在 `data_quality_gate` 之前执行
- 硬规则优先覆盖一切

### 2026-06-17: eval case 日期新鲜度

Eval case fixture 中的日K数据如果没有更新到近 30 天内，会在 `data_quality_gate` 的新鲜度检查中 FAIL（>90天）。

**应对方案：**
- 所有 fixture 数据的最后日期应在 30 天内
- 不满足时更新 fixture 数据
