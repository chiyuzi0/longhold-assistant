"""
A股数据采集占位脚本。

建议第一版先输出标准 CSV / Parquet，主程序只读取本地文件，不直接依赖外部接口。

后续可接入：
- AKShare
- Tushare
- 交易所公开数据
- 自有数据源
"""

from pathlib import Path


def main() -> None:
    out_dir = Path("data/raw/a_share")
    out_dir.mkdir(parents=True, exist_ok=True)
    print("TODO: fetch A-share data and save to data/raw/a_share")


if __name__ == "__main__":
    main()
