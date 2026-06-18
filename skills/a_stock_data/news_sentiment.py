"""
news_sentiment_skill — 新闻 + 情绪评分
rule-based 情绪打分
"""
from schema import SkillInput, StockDataResponse, SentimentResult, SentimentItem
from adapters import SourceFallbackRouter
from adapters.eastmoney import EastMoneyAdapter
from adapters.ths import THSAdapter
from adapters.mock import MockAdapter
from datetime import datetime
import re


SKILL_NAME = "news_sentiment_skill"
SENTIMENT_KEYWORDS = {
    "positive": ["利好", "增长", "突破", "创新高", "盈利", "超预期", "买入", "增持", "反转", "龙头"],
    "negative": ["利空", "下跌", "亏损", "减持", "卖出", "风险", "下调", "立案", "处罚", "st"],
}
FUSION_STRATEGY = "sentiment_merge"


class NewsSentimentSkill:
    """新闻情绪 — 东财新闻 + keyword-based sentiment"""

    def run(self, input: SkillInput) -> StockDataResponse:
        import asyncio
        return asyncio.run(self._run(input))

    async def _run(self, input: SkillInput) -> StockDataResponse:
        sources_used = []

        if input.mode == "mock":
            adapter = MockAdapter()
            raw = await adapter.fetch("news", {"symbol": input.symbol})
            sources_used = ["mock"]
            confidence = 0.8
        else:
            try:
                router = SourceFallbackRouter(EastMoneyAdapter(), THSAdapter())
                raw, source = await router.fetch("news", {"symbol": input.symbol})
                sources_used = [source]
                confidence = 0.7
            except Exception:
                adapter = MockAdapter()
                raw = await adapter.fetch("news", {"symbol": input.symbol})
                sources_used = ["mock_fallback"]
                confidence = 0.4

        articles = raw.get("articles", [])
        items = []
        scores = []

        for a in articles:
            title = a.get("title", "")
            sentiment = self._calc_sentiment(title)
            scores.append(sentiment)
            items.append(SentimentItem(
                title=title,
                url=a.get("url"),
                publish_time=a.get("publish_time"),
                summary=a.get("summary", ""),
                sentiment=sentiment,
            ))

        aggregate_score = round(sum(scores) / len(scores), 2) if scores else 0.0
        result = SentimentResult(
            score=aggregate_score,
            articles=items,
            total_articles=len(items),
            source="+".join(sources_used),
        )

        return StockDataResponse(
            symbol=input.symbol,
            asof=datetime.now().isoformat(),
            skill=SKILL_NAME,
            data=result,
            source=sources_used,
            confidence=confidence,
            completeness=1.0 if items else 0.0,
        )

    def _calc_sentiment(self, text: str) -> float:
        """Rule-based sentiment scoring."""
        text_lower = text.lower()
        pos = sum(1 for kw in SENTIMENT_KEYWORDS["positive"] if kw in text_lower)
        neg = sum(1 for kw in SENTIMENT_KEYWORDS["negative"] if kw in text_lower)
        total = pos + neg
        if total == 0:
            return 0.0
        return round((pos - neg) / max(total, 1), 2)
