# Trace Schema — 全链路追踪记录

## 1. 定位

Trace 是 LongHold Assistant 的"黑匣子"，记录每一次任务执行的完整过程，用于：
- 回放 (Replay)
- 评估 (Eval)
- 审计 (Audit)
- 调试 (Debug)
- 回归测试 (Regression Gate)

## 2. Trace 顶层结构

```json
{
  "traceId": "trace-20260101-xxxxxxxx",
  "taskId": "task-xxxxxxxx",
  "skillId": "monthly-hold-review",
  "startedAt": "2026-06-30T10:00:00Z",
  "finishedAt": "2026-06-30T10:02:30Z",
  "durationMs": 150000,
  "status": "COMPLETED",
  "model": {
    "provider": "deepseek",
    "model": "deepseek-v4-pro",
    "temperature": 0.2,
    "maxTokens": 4000
  },
  "budget": {
    "totalTokensUsed": 8500,
    "totalLlmCalls": 3,
    "totalSteps": 7,
    "budgetExceeded": false
  },
  "states": [],
  "toolCalls": [],
  "mcpCalls": [],
  "bashCommands": [],
  "evidenceItems": [],
  "validationResults": [],
  "finalDecision": {},
  "memoryWrites": [],
  "evalResults": []
}
```

## 3. State Transition Entry

每次状态机转换记录一条：

```json
{
  "sequenceId": 0,
  "fromState": "INIT",
  "toState": "LOAD_CONTEXT",
  "timestamp": "2026-06-30T10:00:00.100Z",
  "elapsedMs": 100,
  "metadata": {}
}
```

状态列表：INIT, LOAD_CONTEXT, SELECT_SKILL, PLAN, EXECUTE_STEP, VALIDATE_RESULT, COLLECT_EVIDENCE, ANALYZE, JUDGE, REPORT, WRITE_MEMORY, FINISH

## 4. Tool Call Entry

```json
{
  "callId": "tool-001",
  "toolName": "computeMarketPerformance250d",
  "input": {
    "symbol": "000001.SZ",
    "bars": "daily_bar[000001.SZ].length=248"
  },
  "output": {
    "ok": true,
    "returnPct": 12.5,
    "maxDrawdownPct": -8.3
  },
  "startedAt": "2026-06-30T10:01:00Z",
  "durationMs": 45,
  "retryCount": 0,
  "error": null
}
```

## 5. MCP Call Entry

```json
{
  "callId": "mcp-001",
  "serverName": "duckdb-mcp",
  "toolName": "query",
  "input": {
    "sql": "SELECT * FROM stock_profile WHERE symbol = '000001.SZ'"
  },
  "output": {},
  "startedAt": "2026-06-30T10:01:05Z",
  "durationMs": 120,
  "retryCount": 0,
  "error": null
}
```

## 6. Bash Command Entry

```json
{
  "commandId": "bash-001",
  "command": "pnpm test",
  "workingDir": "/project",
  "exitCode": 0,
  "stdoutTruncated": false,
  "wasDryRun": false,
  "requiredConfirmation": false,
  "confirmedByUser": false,
  "startedAt": "2026-06-30T10:01:30Z",
  "durationMs": 2500
}
```

## 7. Evidence Item Entry

```json
{
  "evidenceId": "ev-001",
  "source": "stock_profile.status",
  "title": "股票状态",
  "value": "ST",
  "asOfDate": "2026-06-30",
  "collectedAt": "2026-06-30T10:01:05Z",
  "fromTool": "getStockProfile",
  "fromToolCallId": "tool-002"
}
```

## 8. Validation Result Entry

```json
{
  "validationId": "val-001",
  "type": "SCHEMA",
  "passed": true,
  "details": "LongHoldDecision schema valid",
  "timestamp": "2026-06-30T10:02:00Z"
}
```

## 9. Final Decision Entry

```json
{
  "symbol": "000001.SZ",
  "action": "EXCLUDE",
  "confidence": 0.95,
  "summary": "触发 ST 退市风险，建议剔除。",
  "hardRuleOverride": true,
  "hardRuleSource": "screenBasicDelistingRisk",
  "evidenceIds": ["ev-001", "ev-002"],
  "riskIds": ["risk-001"],
  "nextWatchPoints": ["确认交易所最新风险警示状态"],
  "agentContributions": {
    "bullAnalyst": "",
    "bearAnalyst": "",
    "riskOfficer": "硬规则 Gate 触发，跳过 Agent 分析"
  }
}
```

## 10. Memory Write Entry

```json
{
  "writeId": "mem-001",
  "store": "decision-log",
  "key": "decision-20260630-000001.SZ",
  "action": "WRITE",
  "confirmedByUser": false,
  "timestamp": "2026-06-30T10:02:20Z"
}
```

## 11. Eval Result Entry

```json
{
  "evalRunId": "eval-001",
  "caseId": "st-risk-case",
  "passed": true,
  "layerScores": {
    "1": 1.0,
    "2": 1.0,
    "3": 0.95,
    "4": 1.0,
    "5": null
  },
  "totalScore": 0.9875,
  "failures": []
}
```

## 12. Trace 存储

Trace 存储为 JSON Lines 文件：

```
data/traces/
  trace-20260630-xxxxxxxx.json
  trace-20260701-yyyyyyyy.json
  ...
```

每个 task 一个文件。文件名可追溯。
