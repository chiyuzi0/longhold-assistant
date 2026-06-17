# @longhold/tools

工具层负责确定性能力。

原则：

- 不调用 LLM；
- 不做主观判断；
- 只返回结构化数据和证据；
- 每个工具都要有单元测试；
- 工具错误必须显式返回。

第一批工具：

1. `computeMarketPerformance250d`；
2. `screenDelistingRisk`；
3. `computeLongHoldScore`；
4. `queryStockProfile`；
5. `queryDailyBars`。
