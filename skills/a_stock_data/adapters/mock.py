"""
Mock Data Source — 无网络模式可用
适配器层的一部分，不是 Skill
"""
from typing import Optional, Any
from . import DataSourceAdapter
from datetime import datetime, timedelta
import random


class MockAdapter(DataSourceAdapter):
    """Mock data source — returns synthetic data, no network needed."""

    SOURCE_NAME = "mock"

    def __init__(self, timeout: float = 5.0, max_retries: int = 0):
        super().__init__(timeout, max_retries)
        random.seed(42)

    async def fetch(self, endpoint: str, params: dict = None) -> Any:
        endpoint = endpoint or (params or {}).get("type", "quote")
        symbol = (params or {}).get("symbol", "600519.SH")

        if "kline" in endpoint or "price" in endpoint:
            return self._mock_kline(symbol)
        elif "fundamental" in endpoint or "financial" in endpoint:
            return self._mock_fundamentals(symbol)
        elif "flow" in endpoint or "capital" in endpoint:
            return self._mock_capital_flow(symbol)
        elif "news" in endpoint or "sentiment" in endpoint:
            return self._mock_news(symbol)
        elif "research" in endpoint or "report" in endpoint:
            return self._mock_research(symbol)
        else:
            return self._mock_meta(symbol)

    def _mock_kline(self, symbol: str) -> dict:
        base_price = {"600519.SH": 1500, "000001.SZ": 12, "601318.SH": 45}.get(symbol, 50)
        bars = []
        for i in range(30):
            d = datetime.today() - timedelta(days=30 - i)
            if d.weekday() >= 5:  # skip weekends
                continue
            change = random.uniform(-0.03, 0.03)
            close = base_price * (1 + change)
            bars.append({
                "date": d.strftime("%Y-%m-%d"),
                "open": round(close * (1 - random.uniform(0, 0.01)), 2),
                "high": round(close * (1 + random.uniform(0, 0.02)), 2),
                "low": round(close * (1 - random.uniform(0, 0.02)), 2),
                "close": round(close, 2),
                "volume": random.randint(1000000, 10000000),
                "amount": round(close * random.randint(1000000, 10000000), 2),
            })
        return {"symbol": symbol, "klines": bars}

    def _mock_fundamentals(self, symbol: str) -> dict:
        return {
            "symbol": symbol,
            "pe_ttm": round(random.uniform(10, 50), 2),
            "pb": round(random.uniform(1, 10), 2),
            "eps_ttm": round(random.uniform(0.5, 8), 2),
            "roe": round(random.uniform(5, 25), 1),
            "revenue": round(random.uniform(10, 3000), 2),
            "profit": round(random.uniform(1, 500), 2),
            "revenue_growth": round(random.uniform(-10, 30), 1),
            "profit_growth": round(random.uniform(-15, 40), 1),
            "market_cap": round(random.uniform(50, 20000), 2),
            "dividend_yield": round(random.uniform(0, 5), 2),
        }

    def _mock_capital_flow(self, symbol: str) -> dict:
        return {
            "symbol": symbol,
            "net_inflow_main": round(random.uniform(-5e8, 5e8), 2),
            "net_inflow_super": round(random.uniform(-2e8, 2e8), 2),
            "net_inflow_large": round(random.uniform(-1e8, 1e8), 2),
            "net_inflow_medium": round(random.uniform(-5e7, 5e7), 2),
            "net_inflow_small": round(random.uniform(-1e7, 1e7), 2),
            "northbound_net": round(random.uniform(-1e9, 1e9), 2),
            "margin_balance": round(random.uniform(1e9, 5e9), 2),
            "trend": random.choice(["inflow", "outflow", "neutral"]),
        }

    def _mock_news(self, symbol: str) -> dict:
        articles = []
        for i in range(5):
            articles.append({
                "title": f"{symbol} 示例新闻 {i+1}",
                "publish_time": datetime.now().isoformat(),
                "summary": f"这是 {symbol} 的第 {i+1} 条模拟新闻摘要",
                "sentiment": round(random.uniform(-0.5, 0.8), 2),
            })
        score = round(sum(a["sentiment"] for a in articles) / len(articles), 2)
        return {"score": score, "articles": articles, "total": len(articles)}

    def _mock_research(self, symbol: str) -> dict:
        return {
            "report_id": f"mock-{symbol}-001",
            "institution": random.choice(["中金公司", "中信证券", "华泰证券", "招商证券"]),
            "analyst": "模拟分析师",
            "publish_date": datetime.now().strftime("%Y-%m-%d"),
            "title": f"{symbol} 模拟研报",
            "rating": random.choice(["买入", "增持", "中性"]),
            "rating_change": random.choice(["maintain", "upgrade", "downgrade"]),
            "target_price": round(random.uniform(50, 200), 2),
            "eps_forecast": [round(random.uniform(1, 10), 2) for _ in range(3)],
        }

    def _mock_meta(self, symbol: str) -> dict:
        return {
            "symbol": symbol,
            "name": f"模拟股票 {symbol}",
            "market": "A_SHARE" if symbol.endswith((".SZ", ".SH")) else "HK",
            "industry": random.choice(["金融", "科技", "消费", "医药", "制造"]),
            "concepts": random.sample(["人工智能", "新能源", "半导体", "国企改革", "数字经济"], 3),
            "total_shares": round(random.uniform(10, 200), 2),
            "float_shares": round(random.uniform(5, 100), 2),
            "market_cap": round(random.uniform(50, 20000), 2),
            "listing_date": "2000-01-01",
            "exchange": "SSE" if symbol.endswith(".SH") else "SZSE",
            "status": "NORMAL",
        }

    async def health_check(self) -> bool:
        return True
