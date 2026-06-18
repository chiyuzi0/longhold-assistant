"""
market_price_skill — 获取A股实时/日K数据
输出 OHLCV 标准结构，支持 symbol + date_range
"""
from typing import Optional
from schema import SkillInput, StockDataResponse, OHLCV
from adapters import SourceFallbackRouter
from adapters.tencent import TencentAdapter
from adapters.eastmoney import EastMoneyAdapter
from adapters.mock import MockAdapter
from datetime import datetime


SKILL_NAME = "market_price_skill"
DATA_SOURCES = {"primary": "tencent", "fallback": "eastmoney", "mock": "mock"}


class MarketPriceSkill:
    """A股实时/日K行情 — 首选腾讯，备用东财"""

    def run(self, input: SkillInput) -> StockDataResponse:
        import asyncio
        return asyncio.run(self._run(input))

    async def _run(self, input: SkillInput) -> StockDataResponse:
        sources_used = []
        confidence = 0.9

        if input.mode == "mock":
            adapter = MockAdapter()
            raw = await adapter.fetch("kline", {"symbol": input.symbol})
            sources_used = ["mock"]
        else:
            try:
                router = SourceFallbackRouter(TencentAdapter(), EastMoneyAdapter())
                raw, source = await router.fetch("quote", {"symbol": input.symbol})
                sources_used = [source]
            except Exception:
                adapter = MockAdapter()
                raw = await adapter.fetch("kline", {"symbol": input.symbol})
                sources_used = ["mock_fallback"]
                confidence = 0.5

        klines = raw.get("klines", []) if "klines" in raw else self._tencent_to_ohlcv(raw)
        ohlcv_list = []
        for k in klines:
            ohlcv_list.append(OHLCV(
                date=k.get("date", ""),
                open=float(k.get("open", 0)),
                high=float(k.get("high", 0)),
                low=float(k.get("low", 0)),
                close=float(k.get("close", 0)),
                volume=float(k.get("volume", 0)),
                amount=float(k.get("amount", 0)) if k.get("amount") else None,
            ))

        completeness = len(ohlcv_list) / max(len(ohlcv_list), 1)
        return StockDataResponse(
            symbol=input.symbol,
            asof=datetime.now().isoformat(),
            skill=SKILL_NAME,
            data=[o.__dict__ for o in ohlcv_list],
            source=sources_used,
            confidence=min(confidence, completeness),
            completeness=min(completeness, 1.0),
        )

    def _tencent_to_ohlcv(self, raw: dict) -> list:
        """Convert single Tencent quote to OHLCV list."""
        if raw.get("close") is None:
            return []
        return [{
            "date": datetime.now().strftime("%Y-%m-%d"),
            "open": raw.get("open", 0),
            "high": raw.get("high", 0),
            "low": raw.get("low", 0),
            "close": raw.get("close", 0),
            "volume": raw.get("volume", 0),
            "amount": raw.get("amount", 0),
        }]
