"""
Tonghuashun (THS) Adapter — 强势股/北向资金/一致预期
"""
from typing import Optional, Any
from . import DataSourceAdapter


class THSAdapter(DataSourceAdapter):
    SOURCE_NAME = "tonghuashun"

    def __init__(self, timeout: float = 10.0, max_retries: int = 2):
        super().__init__(timeout, max_retries)

    async def fetch(self, endpoint: str, params: dict = None) -> Any:
        import aiohttp
        url = self._build_url(endpoint, params or {})
        headers = {"User-Agent": "Mozilla/5.0"}
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(url, timeout=self.timeout) as resp:
                if resp.status != 200:
                    raise ConnectionError(f"THS HTTP {resp.status}")
                return await resp.text()

    def _build_url(self, endpoint: str, params: dict) -> str:
        urls = {
            "hot_stocks": "https://data.10jqka.com.cn/financial/hot/list/",
            "northbound": "https://data.10jqka.com.cn/northbound/",
            "consensus": "https://basic.10jqka.com.cn/api/stock/consensus/",
        }
        base = urls.get(endpoint, endpoint)
        symbol = params.get("symbol", "")
        if endpoint == "consensus" and symbol:
            return f"{base}{symbol}"
        return base

    async def health_check(self) -> bool:
        try:
            await self.fetch("hot_stocks")
            return True
        except Exception:
            return False
