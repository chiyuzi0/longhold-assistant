"""
research_report_skill — 机构研报摘要/评级变化
输出 rating_change + target_price
"""
from schema import SkillInput, StockDataResponse, ResearchReport
from adapters import SourceFallbackRouter
from adapters.eastmoney import EastMoneyAdapter
from adapters.mock import MockAdapter
from datetime import datetime


SKILL_NAME = "research_report_skill"
DATA_SOURCES = {"primary": "eastmoney"}


class ResearchReportSkill:
    """机构研报 — 东财 reportapi"""

    def run(self, input: SkillInput) -> StockDataResponse:
        import asyncio
        return asyncio.run(self._run(input))

    async def _run(self, input: SkillInput) -> StockDataResponse:
        sources_used = []

        if input.mode == "mock":
            adapter = MockAdapter()
            raw = await adapter.fetch("research", {"symbol": input.symbol})
            sources_used = ["mock"]
            confidence = 0.85
        else:
            try:
                adapter = EastMoneyAdapter()
                raw = await adapter.fetch_with_retry("research", {"symbol": input.symbol})
                sources_used = ["eastmoney"]
                confidence = 0.75
            except Exception:
                adapter = MockAdapter()
                raw = await adapter.fetch("research", {"symbol": input.symbol})
                sources_used = ["mock_fallback"]
                confidence = 0.4

        report = ResearchReport(
            report_id=raw.get("report_id"),
            institution=raw.get("institution"),
            analyst=raw.get("analyst"),
            publish_date=raw.get("publish_date"),
            title=raw.get("title"),
            rating=raw.get("rating"),
            rating_change=raw.get("rating_change"),
            target_price=raw.get("target_price"),
            eps_forecast=raw.get("eps_forecast", []),
        )

        total_fields = len([f for f in ResearchReport.__dataclass_fields__])
        filled = sum(1 for f in ResearchReport.__dataclass_fields__ if getattr(report, f) is not None and getattr(report, f) != [])
        completeness = filled / max(total_fields, 1)

        return StockDataResponse(
            symbol=input.symbol,
            asof=datetime.now().isoformat(),
            skill=SKILL_NAME,
            data=report,
            source=sources_used,
            confidence=min(confidence, completeness),
            completeness=completeness,
        )
