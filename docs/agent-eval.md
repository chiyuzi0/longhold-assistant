# Agent Eval — 五层评估体系

## 1. 定位

LongHold 的 Eval 不是"最后看眼答案对不对"，而是**分层评估**从工具到业务的全链路质量。

## 2. 五层 Eval

```text
Layer 5: Business Eval     ← 投资逻辑是否合理？（人工 + LLM Judge）
Layer 4: Output Eval        ← 输出格式/内容是否正确？
Layer 3: Trajectory Eval    ← Agent 路径是否高效合理？
Layer 2: Skill Eval         ← Skill 是否按设计执行？
Layer 1: Tool Eval           ← 工具计算结果是否正确？
```

### Layer 1: Tool Eval

| 评估项 | 说明 |
|---|---|
| 计算正确性 | 给定已知输入，输出是否精确匹配预期 |
| 边界处理 | 空数据/异常数据/极值是否正确处理 |
| Idempotency | 幂等工具重复调用结果一致 |
| Error handling | 错误码和消息是否正确 |

### Layer 2: Skill Eval

| 评估项 | 说明 |
|---|---|
| 流程完整性 | Skill 是否按定义顺序执行了所有 required_tools |
| 硬规则合规 | 是否遵守 hard_rules |
| 步数控制 | 是否在 max_steps 内完成 |
| 输出结构 | 输出是否匹配 outputSchema |

### Layer 3: Agent Trajectory Eval

| 评估项 | 说明 |
|---|---|
| 路径效率 | 是否有冗余或无关的工具调用 |
| 重试合理性 | 重试是否合理（不是无脑重试） |
| 硬规则 Gate | 是否在触发硬规则时提前终止（不做无用分析） |
| 预算消耗 | token/步数/时间是否合理 |

### Layer 4: Output Eval

| 评估项 | 说明 |
|---|---|
| Schema 合规 | 输出是否匹配 LongHoldDecision |
| 证据链完整 | 每个结论是否有 evidence |
| 禁止内容检测 | 是否包含"必涨""保证""推荐买入" |
| 语言合规 | 是否包含风险提示 |
| 决策合理性 | 在给定输入下，action 是否合理 |

### Layer 5: Business Eval

| 评估项 | 说明 |
|---|---|
| 投资逻辑 | 判断理由是否符合长线投资逻辑 |
| 风险识别 | 是否遗漏重要风险信号 |
| 证伪检查 | 投资假设是否被正确验证 |
| 行业常识 | 判断是否与行业常识一致 |

Business Eval 需要人工审核或高级 LLM Judge。

## 3. Eval Case 格式

每个 Eval Case 包含：

```json
{
  "case_id": "monthly-hold-review/st-risk",
  "task": "对持仓中的 ST 股票进行体检",
  "portfolio": {
    "symbol": "000001.ST",
    "cost_price": 10.0,
    "quantity": 1000
  },
  "fixtures": {
    "stock_profile": { "status": "ST" },
    "daily_bars": []
  },
  "expected": {
    "action": "EXCLUDE",
    "risk_level": "CRITICAL",
    "risk_type": "DELISTING_OR_ST"
  },
  "forbidden_outputs": [
    "HOLD",
    "WATCH",
    "推荐买入",
    "抄底",
    "估值便宜"
  ],
  "required_evidence": [
    "stock_profile.status",
    "risk_rule.delisting"
  ]
}
```

## 4. Deterministic Judge

对于确定性强的评估（Layer 1-2），使用规则化 Judge：

```ts
interface DeterministicJudge {
  evaluate(case: EvalCase, output: SkillResult): DeterministicVerdict;
}

interface DeterministicVerdict {
  passed: boolean;
  checks: {
    actionMatch: boolean;
    riskLevelMatch: boolean;
    evidencePresent: boolean;
    forbiddenContentClean: boolean;
    schemaValid: boolean;
  };
  score: number; // 0.0 - 1.0
}
```

## 5. LLM Judge

对于需要语义判断的评估（Layer 4-5），使用 LLM Judge：

```ts
interface LLMJudge {
  evaluate(case: EvalCase, output: SkillResult, trace: Trace): Promise<LLMVerdict>;
}

interface LLMVerdict {
  passed: boolean;
  reasoning: string;
  concerns: string[];
  score: number;
}
```

## 6. Eval Runner

```ts
interface EvalRunner {
  runCase(evalCase: EvalCase): Promise<EvalResult>;
  runSuite(suite: EvalSuite): Promise<EvalReport>;
  regressionTest(baselineTrace: Trace): Promise<RegressionResult>;
}

interface EvalResult {
  caseId: string;
  passed: boolean;
  layerScores: Record<number, number>;
  totalScore: number;
  failures: EvalFailure[];
  trace: Trace;
}

interface EvalReport {
  suiteName: string;
  totalCases: number;
  passed: number;
  failed: number;
  skipped: number;
  averageScore: number;
  results: EvalResult[];
}
```

## 7. Regression Gate

代码变更提 PR 前，必须通过 Regression Gate：

1. 用 baseline traces 重放
2. 对比输出（定性一致即可）
3. Regression Gate 失败 → 拒绝 merge

## 8. 初期 Eval Case 列表

### monthly-hold-review
| Case ID | 场景 |
|---|---|
| st-risk | ST 股票 → EXCLUDE |
| delisting-risk | 退市股票 → EXCLUDE |
| missing-data | 数据缺失 → CAUTIOUS_HOLD |
| cashflow-deterioration | 现金流恶化 → CAUTIOUS_HOLD 或 REDUCE_EXIT |
| high-valuation | 估值过高 → CAUTIOUS_HOLD |
| normal-quality | 正常优质持仓 → HOLD |

### single-stock-review
| Case ID | 场景 |
|---|---|
| roe-decline | ROE 连续下降 → CAUTIOUS_HOLD |
| high-dividend-trap | 高股息但现金流差 → CAUTIOUS_HOLD |

### exit-risk-check
| Case ID | 场景 |
|---|---|
| thesis-invalidated | 投资假设被证伪 → REDUCE_EXIT |
| hk-low-liquidity | 港股流动性不足 → REDUCE_EXIT |
| hk-connect-removal | 港股通移出风险 → REDUCE_EXIT |
