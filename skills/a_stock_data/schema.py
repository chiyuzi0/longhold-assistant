"""
a-stock-data: AlphaForge Schema Contract
=========================================
All Skills MUST use these types. No free-form output allowed.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional


# ===================================================================
# Skill Input — strict contract, no free-form fields
# ===================================================================
@dataclass
class SkillInput:
    symbol: str                     # required, e.g. "600519.SH" or "000001.SZ"
    asof: Optional[str] = None      # ISO date, default latest
    mode: str = "live"              # "mock" | "live"
    fields: Optional[list[str]] = None  # optional field filter


# ===================================================================
# OHLCV — unified candlestick structure
# ===================================================================
@dataclass
class OHLCV:
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    amount: Optional[float] = None
    ma5: Optional[float] = None
    ma10: Optional[float] = None
    ma20: Optional[float] = None


# ===================================================================
# FinancialSnapshot — unified fundamentals
# ===================================================================
@dataclass
class FinancialSnapshot:
    pe_ttm: Optional[float] = None
    pb: Optional[float] = None
    eps_ttm: Optional[float] = None
    roe: Optional[float] = None
    revenue: Optional[float] = None      # 营收 (亿)
    profit: Optional[float] = None       # 净利润 (亿)
    revenue_growth: Optional[float] = None
    profit_growth: Optional[float] = None
    market_cap: Optional[float] = None   # 总市值 (亿)
    float_cap: Optional[float] = None    # 流通市值 (亿)
    dividend_yield: Optional[float] = None


# ===================================================================
# CapitalFlow — unified capital flow
# ===================================================================
@dataclass
class CapitalFlow:
    net_inflow_main: Optional[float] = None      # 主力净流入
    net_inflow_super: Optional[float] = None     # 超大单
    net_inflow_large: Optional[float] = None     # 大单
    net_inflow_medium: Optional[float] = None    # 中单
    net_inflow_small: Optional[float] = None     # 小单
    northbound_net: Optional[float] = None       # 北向净流入
    margin_balance: Optional[float] = None       # 融资余额
    trend: Optional[str] = None                  # "inflow" | "outflow" | "neutral"


# ===================================================================
# SentimentResult — news + sentiment
# ===================================================================
@dataclass
class SentimentItem:
    title: str
    url: Optional[str] = None
    publish_time: Optional[str] = None
    summary: Optional[str] = None
    sentiment: float = 0.0          # -1.0 ~ 1.0


@dataclass
class SentimentResult:
    score: float = 0.0              # -1.0 ~ 1.0 aggregate
    articles: list[SentimentItem] = field(default_factory=list)
    total_articles: int = 0
    source: str = ""


# ===================================================================
# ResearchReport — unified research
# ===================================================================
@dataclass
class ResearchReport:
    report_id: Optional[str] = None
    institution: Optional[str] = None
    analyst: Optional[str] = None
    publish_date: Optional[str] = None
    title: Optional[str] = None
    rating: Optional[str] = None          # "买入" | "增持" | "中性" | "减持"
    rating_change: Optional[str] = None   # "upgrade" | "downgrade" | "maintain"
    target_price: Optional[float] = None
    eps_forecast: list[float] = field(default_factory=list)  # [y1, y2, y3]


# ===================================================================
# StockMeta — unified stock metadata
# ===================================================================
@dataclass
class StockMeta:
    symbol: str = ""
    name: str = ""
    market: str = ""
    industry: Optional[str] = None
    concepts: list[str] = field(default_factory=list)
    total_shares: Optional[float] = None   # 总股本 (亿)
    float_shares: Optional[float] = None   # 流通股本 (亿)
    market_cap: Optional[float] = None     # 总市值 (亿)
    listing_date: Optional[str] = None
    exchange: Optional[str] = None
    status: str = "NORMAL"                 # NORMAL | ST | DELISTING


# ===================================================================
# StockDataResponse — UNIFIED OUTPUT for ALL Skills
# ===================================================================
@dataclass
class StockDataResponse:
    symbol: str
    asof: str                               # ISO datetime
    skill: str                              # which skill produced this
    data: object                            # typed per skill
    source: list[str]                       # data sources used
    confidence: float                       # 0.0 ~ 1.0
    completeness: float                     # 0.0 ~ 1.0 — what fraction of requested fields filled

    def to_dict(self) -> dict:
        base = asdict(self)
        # Ensure data is serializable
        if hasattr(self.data, 'to_dict'):
            base['data'] = self.data.to_dict()
        elif hasattr(self.data, '__dataclass_fields__'):
            base['data'] = asdict(self.data)
        return base


# ===================================================================
# Feature Pipeline — AlphaForge compatibility
# ===================================================================
FEATURE_PIPELINE_STAGES = [
    "Skill → Feature → Factor Engine → Agent (Bull/Bear/Risk)"
]
