"""
stock_meta_skill — 股票基础信息（行业/概念/市值）
输出 metadata schema
"""
from schema import SkillInput, StockDataResponse, StockMeta
from adapters import SourceFallbackRouter
from adapters.tencent import TencentAdapter
from adapters.eastmoney import EastMoneyAdapter
from adapters.mock import MockAdapter
from datetime import datetime


SKILL_NAME = "stock_meta_skill"
DATA_SOURCES = {"primary": "tencent", "fallback": "eastmoney"}


class StockMetaSkill:
    """股票元信息 — 首选腾讯，备用东财"""

    def run(self, input: SkillInput) -> StockDataResponse:
        import asyncio
        return asyncio.run(self._run(input))

    async def _run(self, input: SkillInput) -> StockDataResponse:
        sources_used = []

        if input.mode == "mock":
            adapter = MockAdapter()
            raw = await adapter.fetch("meta", {"symbol": input.symbol})
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
                raw = await adapter.fetch("meta", {"symbol": input.symbol})
                sources_used = ["mock_fallback"]
                confidence = 0.5

        meta = StockMeta(
            symbol=input.symbol,
            name=raw.get("name", ""),
            market="A_SHARE" if input.symbol.endswith((".SZ", ".SH")) else "HK",
            industry=raw.get("industry"),
            concepts=raw.get("concepts", []),
            total_shares=raw.get("total_shares"),
            float_shares=raw.get("float_shares"),
            market_cap=raw.get("market_cap"),
            listing_date=raw.get("listing_date"),
            exchange=raw.get("exchange"),
            status=raw.get("status", "NORMAL"),
        )

        total_fields = len([f for f in StockMeta.__dataclass_fields__])
        filled = sum(1 for f in StockMeta.__dataclass_fields__ if getattr(meta, f) is not None and getattr(meta, f) != [])
        completeness = filled / max(total_fields, 1)

        return StockDataResponse(
            symbol=input.symbol,
            asof=datetime.now().isoformat(),
            skill=SKILL_NAME,
            data=meta,
            source=sources_used,
            confidence=min(confidence, completeness),
            completeness=completeness,
        )
