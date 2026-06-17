"""
港股数据采集占位脚本。

第一版建议只导入手动下载的 CSV，避免数据源复杂度影响 MVP。
"""

from pathlib import Path


def main() -> None:
    out_dir = Path("data/raw/hk")
    out_dir.mkdir(parents=True, exist_ok=True)
    print("TODO: fetch HK stock data and save to data/raw/hk")


if __name__ == "__main__":
    main()
