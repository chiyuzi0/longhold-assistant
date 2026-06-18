"""
Unit tests for a-stock-data Skills

Run:
    pip install pytest pytest-asyncio
    python -m pytest skills/a_stock_data/tests/ -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from schema import SkillInput, StockDataResponse, FinancialSnapshot
from market_price import MarketPriceSkill
from fundamentals import FundamentalsSkill
from registry import create_registry


class TestSchema:
    """Schema contract tests"""

    def test_skill_input_requires_symbol(self):
        with pytest.raises(TypeError):
            SkillInput()  # missing symbol

    def test_skill_input_defaults(self):
        inp = SkillInput(symbol="600519.SH")
        assert inp.symbol == "600519.SH"
        assert inp.mode == "live"  # default
        assert inp.asof is None

    def test_stock_data_response_structure(self):
        resp = StockDataResponse(
            symbol="600519.SH",
            asof="2026-06-17T00:00:00",
            skill="test_skill",
            data={"key": "value"},
            source=["mock"],
            confidence=0.9,
            completeness=0.8,
        )
        d = resp.to_dict()
        assert d["symbol"] == "600519.SH"
        assert d["confidence"] == 0.9
        assert d["source"] == ["mock"]


@pytest.mark.asyncio
class TestMarketPriceSkill:
    """Market price skill tests"""

    async def test_mock_mode_returns_ohlcv(self):
        skill = MarketPriceSkill()
        inp = SkillInput(symbol="600519.SH", mode="mock")
        result = await skill._run(inp)
        assert result.skill == "market_price_skill"
        assert result.confidence > 0
        assert len(result.data) > 0
        first = result.data[0]
        # OHLCV fields
        assert "date" in first
        assert "open" in first
        assert "close" in first
        assert "volume" in first

    async def test_mock_mode_different_symbol(self):
        skill = MarketPriceSkill()
        inp = SkillInput(symbol="000001.SZ", mode="mock")
        result = await skill._run(inp)
        assert result.symbol == "000001.SZ"
        assert len(result.data) > 0

    async def test_completeness_calculation(self):
        skill = MarketPriceSkill()
        inp = SkillInput(symbol="601318.SH", mode="mock")
        result = await skill._run(inp)
        assert result.completeness > 0
        assert result.completeness <= 1.0


@pytest.mark.asyncio
class TestFundamentalsSkill:
    """Fundamentals skill tests"""

    async def test_mock_mode_returns_financials(self):
        skill = FundamentalsSkill()
        inp = SkillInput(symbol="600519.SH", mode="mock")
        result = await skill._run(inp)
        assert result.skill == "fundamentals_skill"
        assert isinstance(result.data, FinancialSnapshot)
        assert result.data.pe_ttm is not None
        assert result.data.roe is not None

    async def test_completeness(self):
        skill = FundamentalsSkill()
        inp = SkillInput(symbol="600519.SH", mode="mock")
        result = await skill._run(inp)
        assert result.completeness > 0.3  # at least 30% fields filled


@pytest.mark.asyncio
class TestRegistry:
    """Registry tests"""

    async def test_registry_contains_all_skills(self):
        registry = create_registry()
        skills = registry.list()
        assert "market_price_skill" in skills
        assert "fundamentals_skill" in skills
        assert "capital_flow_skill" in skills
        assert "news_sentiment_skill" in skills
        assert "research_report_skill" in skills
        assert "stock_meta_skill" in skills
        assert len(skills) == 6

    async def test_registry_call_returns_response(self):
        registry = create_registry()
        result = await registry.call("market_price_skill", SkillInput(symbol="600519.SH", mode="mock"))
        assert isinstance(result, StockDataResponse)
        assert result.skill == "market_price_skill"

    async def test_registry_unknown_skill_raises(self):
        registry = create_registry()
        with pytest.raises(ValueError, match="not registered"):
            await registry.call("unknown_skill", SkillInput(symbol="600519.SH"))
