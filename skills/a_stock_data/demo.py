#!/usr/bin/env python3
"""
AlphaForge a-stock-data E2E Demo

Usage:
    python skills/a_stock_data/demo.py --symbol 600519 --skill market_price_skill
    python skills/a_stock_data/demo.py --symbol 000001 --skill fundamentals_skill
    python skills/a_stock_data/demo.py --mock --all
"""
import sys
import json
import argparse
from registry import get_registry
from schema import SkillInput


def print_result(name, response):
    print(f"\n{'='*60}")
    print(f"SKILL: {name}")
    print(f"{'='*60}")
    d = response.to_dict() if hasattr(response, 'to_dict') else response.__dict__
    print(json.dumps(d, indent=2, default=str, ensure_ascii=False))
    print(f"\nconfidence: {response.confidence:.2f}")
    print(f"completeness: {response.completeness:.2f}")
    print(f"source: {response.source}")


async def run_all(registry, mock=True):
    """Run all skills and print results."""
    symbols = ["600519.SH", "000001.SZ", "601318.SH"]
    skill_names = registry.list()

    for symbol in symbols:
        for name in skill_names:
            inp = SkillInput(symbol=symbol, mode="mock" if mock else "live")
            result = await registry.call(name, inp)
            print_result(name, result)


async def run_single(registry, symbol, skill_name, mock=True):
    inp = SkillInput(symbol=symbol, mode="mock" if mock else "live")
    result = await registry.call(skill_name, inp)
    print_result(skill_name, result)


def main():
    parser = argparse.ArgumentParser(description="AlphaForge a-stock-data E2E Demo")
    parser.add_argument("--symbol", default="600519.SH", help="Stock symbol (e.g. 600519.SH)")
    parser.add_argument("--skill", default=None, help="Skill name (default: all)")
    parser.add_argument("--mock", action="store_true", default=True, help="Use mock data")
    parser.add_argument("--live", action="store_true", help="Use live data")
    args = parser.parse_args()

    mock = not args.live
    registry = get_registry()

    import asyncio

    if args.skill:
        asyncio.run(run_single(registry, args.symbol, args.skill, mock))
    else:
        asyncio.run(run_all(registry, mock))


if __name__ == "__main__":
    main()
