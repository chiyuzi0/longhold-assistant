"""
fundamentals_skill — PE/PB/EPS/ROE/revenue/profit
输出统一 FinancialSnapshot schema
"""
from schema import SkillInput, StockDataResponse, FinancialSnapshot
from adapters import SourceFallbackRouter
from adapters.tencent import TencentAdapter
from adapters.eastmoney import EastMoneyAdapter
from adapters.mock import MockAdapter
from datetime import datetime


SKILL_NAME = "fundamentals_skill"
DATA_SOURCES = {"primary": "tencent", "fallback": "eastmoney", "merge_strategy": "weighted_average"}


class FundamentalsSkill:
    """基本面数据 — 首选腾讯，备用东财，冲突时加权平均"""

    def run(self, input: SkillInput) -> StockDataResponse:
        import asyncio
        return asyncio.run(self._run(input))

    async def _run(self, input: SkillInput) -> StockDataResponse:
        sources_used = []

        if input.mode == "mock":
            adapter = MockAdapter()
            raw = await adapter.fetch("fundamental", {"symbol": input.symbol})
            sources_used = ["mock"]
            confidence = 0.9
        else:
            try:
                router = SourceFallbackRouter(TencentAdapter(), EastMoneyAdapter())
                raw, source = await router.fetch("quote", {"symbol": input.symbol})
                sources_used = [source]
                confidence = 0.85
            except Exception:
                adapter = MockAdapter()
                raw = await adapter.fetch("fundamental", {"symbol": input.symbol})
                sources_used = ["mock_fallback"]
                confidence = 0.5

        snapshot = FinancialSnapshot(
            pe_ttm=raw.get("pe_ttm"),
            pb=raw.get("pb"),
            eps_ttm=raw.get("eps_ttm"),
            roe=raw.get("roe"),
            revenue=raw.get("revenue"),
            profit=raw.get("profit"),
            revenue_growth=raw.get("revenue_growth"),
            profit_growth=raw.get("profit_growth"),
            market_cap=raw.get("market_cap"),
            float_cap=raw.get("float_cap"),
            dividend_yield=raw.get("dividend_yield"),
        )

        # Calculate completeness
        total_fields = len([f for f in FinancialSnapshot.__dataclass_fields__])
        filled = sum(1 for f in FinancialSnapshot.__dataclass_fields__ if getattr(snapshot, f) is not None)
        completeness = filled / max(total_fields, 1)

        return StockDataResponse(
            symbol=input.symbol,
            asof=datetime.now().isoformat(),
            skill=SKILL_NAME,
            data=snapshot,
            source=sources_used,
            confidence=min(confidence, completeness),
            completeness=completeness,
        )
