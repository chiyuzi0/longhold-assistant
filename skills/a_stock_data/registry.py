"""
registry.py — 注册所有 Skill 到 ToolRegistry

每个 Skill 注册为:
  name: market_price_skill
  skill_class: MarketPriceSkill
  input_schema: SkillInput schema
  output_schema: StockDataResponse schema
"""
from typing import Any
from schema import SkillInput


# ===================================================================
# In-memory ToolRegistry (standalone, no external deps)
# ===================================================================
class ToolRegistry:
    """Simple in-memory registry. Compatible with AlphaForge SkillRunner."""

    def __init__(self):
        self._skills = {}

    def register(self, name: str, skill_class: type, input_schema: type, output_schema: type):
        """Register a skill."""
        self._skills[name] = {
            "class": skill_class,
            "input_schema": input_schema,
            "output_schema": output_schema,
            "instance": skill_class(),
        }

    def get(self, name: str) -> dict | None:
        return self._skills.get(name)

    def list(self) -> list[str]:
        return list(self._skills.keys())

    async def call(self, name: str, input_data: SkillInput) -> Any:
        """Execute a skill by name."""
        entry = self._skills.get(name)
        if not entry:
            raise ValueError(f"Skill '{name}' not registered")
        instance = entry["instance"]
        # Convert dict to SkillInput if needed
        if isinstance(input_data, dict):
            input_data = SkillInput(**input_data)
        return await instance._run(input_data)


# ===================================================================
# Register all skills
# ===================================================================
def create_registry() -> ToolRegistry:
    registry = ToolRegistry()

    from market_price import MarketPriceSkill
    from fundamentals import FundamentalsSkill
    from capital_flow import CapitalFlowSkill
    from news_sentiment import NewsSentimentSkill
    from research_report import ResearchReportSkill
    from stock_meta import StockMetaSkill
    from schema import StockDataResponse

    registry.register("market_price_skill", MarketPriceSkill, SkillInput, StockDataResponse)
    registry.register("fundamentals_skill", FundamentalsSkill, SkillInput, StockDataResponse)
    registry.register("capital_flow_skill", CapitalFlowSkill, SkillInput, StockDataResponse)
    registry.register("news_sentiment_skill", NewsSentimentSkill, SkillInput, StockDataResponse)
    registry.register("research_report_skill", ResearchReportSkill, SkillInput, StockDataResponse)
    registry.register("stock_meta_skill", StockMetaSkill, SkillInput, StockDataResponse)

    return registry


# Global singleton
_default_registry = None


def get_registry() -> ToolRegistry:
    global _default_registry
    if _default_registry is None:
        _default_registry = create_registry()
    return _default_registry
