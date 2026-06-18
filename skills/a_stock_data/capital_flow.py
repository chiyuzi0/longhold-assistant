"""
capital_flow_skill — 北向资金/主力资金流/融资融券
输出 net_inflow + trend
"""
from schema import SkillInput, StockDataResponse, CapitalFlow
from adapters import SourceFallbackRouter
from adapters.eastmoney import EastMoneyAdapter
from adapters.ths import THSAdapter
from adapters.mock import MockAdapter
from datetime import datetime


SKILL_NAME = "capital_flow_skill"
DATA_SOURCES = {"primary": "eastmoney", "fallback": "ths"}


class CapitalFlowSkill:
    """资金流数据 — 首选东财（独有），备用同花顺"""

    def run(self, input: SkillInput) -> StockDataResponse:
        import asyncio
        return asyncio.run(self._run(input))

    async def _run(self, input: SkillInput) -> StockDataResponse:
        sources_used = []

        if input.mode == "mock":
            adapter = MockAdapter()
            raw = await adapter.fetch("capital_flow", {"symbol": input.symbol})
            sources_used = ["mock"]
            confidence = 0.9
        else:
            try:
                router = SourceFallbackRouter(EastMoneyAdapter(), THSAdapter())
                raw, source = await router.fetch("fund_flow", {"symbol": input.symbol})
                sources_used = [source]
                confidence = 0.8
            except Exception:
                adapter = MockAdapter()
                raw = await adapter.fetch("capital_flow", {"symbol": input.symbol})
                sources_used = ["mock_fallback"]
                confidence = 0.5

        flow = CapitalFlow(
            net_inflow_main=raw.get("net_inflow_main"),
            net_inflow_super=raw.get("net_inflow_super"),
            net_inflow_large=raw.get("net_inflow_large"),
            net_inflow_medium=raw.get("net_inflow_medium"),
            net_inflow_small=raw.get("net_inflow_small"),
            northbound_net=raw.get("northbound_net"),
            margin_balance=raw.get("margin_balance"),
            trend=raw.get("trend", "neutral"),
        )

        total_fields = len([f for f in CapitalFlow.__dataclass_fields__])
        filled = sum(1 for f in CapitalFlow.__dataclass_fields__ if getattr(flow, f) is not None)
        completeness = filled / max(total_fields, 1)

        return StockDataResponse(
            symbol=input.symbol,
            asof=datetime.now().isoformat(),
            skill=SKILL_NAME,
            data=flow,
            source=sources_used,
            confidence=min(confidence, completeness),
            completeness=completeness,
        )
