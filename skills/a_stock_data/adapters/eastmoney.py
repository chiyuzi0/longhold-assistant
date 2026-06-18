"""
East Money Adapter — 资金流/研报/新闻 (仅用于独有数据)
封装了原始项目的 em_get() 限流策略
"""
from typing import Optional, Any
from . import DataSourceAdapter
import time
import random


class EastMoneyAdapter(DataSourceAdapter):
    SOURCE_NAME = "eastmoney"

    # Global throttle: one call per EM_MIN_INTERVAL seconds
    _last_call_time = 0.0
    EM_MIN_INTERVAL = 1.1  # seconds + jitter

    def __init__(self, timeout: float = 15.0, max_retries: int = 2):
        super().__init__(timeout, max_retries)

    async def _throttle(self):
        """Serial rate-limit: ≥1.1s between calls with ±0.2s jitter."""
        elapsed = time.time() - EastMoneyAdapter._last_call_time
        delay = self.EM_MIN_INTERVAL + random.uniform(-0.2, 0.2)
        if elapsed < delay:
            await self._sleep(delay - elapsed)
        EastMoneyAdapter._last_call_time = time.time()

    async def _sleep(self, secs: float):
        """Async sleep — fallback to blocking if no event loop."""
        try:
            import asyncio
            await asyncio.sleep(secs)
        except RuntimeError:
            time.sleep(secs)

    async def fetch(self, endpoint: str, params: dict = None) -> Any:
        """Fetch from East Money push2 or datacenter API."""
        await self._throttle()

        import aiohttp

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://data.eastmoney.com/",
        }

        url = self._build_url(endpoint, params or {})
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(url, timeout=self.timeout) as resp:
                if resp.status != 200:
                    raise ConnectionError(f"EastMoney HTTP {resp.status}")
                return await resp.json(content_type=None)

    def _build_url(self, endpoint: str, params: dict) -> str:
        """Map endpoint names to EastMoney URLs."""
        urls = {
            "fund_flow": f"https://push2.eastmoney.com/api/qt/stock/get",
            "northbound": f"https://data.eastmoney.com/api/northbound",
            "research": f"https://reportapi.eastmoney.com/api/report/list",
            "news": f"https://search-api-web.eastmoney.com/search",
        }
        base = urls.get(endpoint, endpoint)
        if params:
            qs = "&".join(f"{k}={v}" for k, v in params.items())
            return f"{base}?{qs}"
        return base

    async def health_check(self) -> bool:
        try:
            await self.fetch("fund_flow", {"secid": "1.600519"})
            return True
        except Exception:
            return False
