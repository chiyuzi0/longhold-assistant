"""
Tencent Finance Adapter — PE/PB/市值/换手率/行情
优先级: 首选（不封 IP）
"""
from typing import Optional, Any
from . import DataSourceAdapter


class TencentAdapter(DataSourceAdapter):
    SOURCE_NAME = "tencent"

    def __init__(self, timeout: float = 10.0, max_retries: int = 3):
        super().__init__(timeout, max_retries)
        self.base_url = "https://qt.gtimg.cn/q="

    async def fetch(self, endpoint: str, params: dict = None) -> Any:
        import aiohttp
        symbol = params.get("symbol", "") if params else endpoint
        url = f"{self.base_url}{symbol}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=self.timeout) as resp:
                text = await resp.text()
                return self._parse(text, symbol)

    def _parse(self, text: str, symbol: str) -> dict:
        """Parse Tencent's raw response into structured dict."""
        # Format: v_sz000001="1~平安银行~...~..."
        import re
        match = re.search(r'v_[a-z]{2}\w+="(.+)"', text)
        if not match:
            return {"symbol": symbol, "error": "parse_failed"}
        fields = match.group(1).split("~")
        return {
            "symbol": symbol,
            "name": fields[1] if len(fields) > 1 else "",
            "close": float(fields[3]) if len(fields) > 3 and fields[3] else None,
            "open": float(fields[5]) if len(fields) > 5 and fields[5] else None,
            "high": float(fields[33]) if len(fields) > 33 and fields[33] else None,
            "low": float(fields[34]) if len(fields) > 34 and fields[34] else None,
            "volume": float(fields[6]) if len(fields) > 6 and fields[6] else None,
            "amount": float(fields[37]) if len(fields) > 37 and fields[37] else None,
            "pe_ttm": float(fields[39]) if len(fields) > 39 and fields[39] else None,
            "pb": float(fields[46]) if len(fields) > 46 and fields[46] else None,
            "market_cap": float(fields[45]) if len(fields) > 45 and fields[45] else None,
            "float_cap": float(fields[44]) if len(fields) > 44 and fields[44] else None,
            "turnover": float(fields[38]) if len(fields) > 38 and fields[38] else None,
            "high_limit": float(fields[48]) if len(fields) > 48 and fields[48] else None,
            "low_limit": float(fields[49]) if len(fields) > 49 and fields[49] else None,
        }

    async def health_check(self) -> bool:
        try:
            await self.fetch("sh600519")
            return True
        except Exception:
            return False
