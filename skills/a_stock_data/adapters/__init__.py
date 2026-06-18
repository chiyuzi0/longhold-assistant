# adapters: base — abstract data source adapter
# All adapters MUST inherit from DataSourceAdapter

from abc import ABC, abstractmethod
from typing import Optional, Any
import time
import random
import logging

logger = logging.getLogger(__name__)


class DataSourceAdapter(ABC):
    """Abstract base for all data source adapters."""

    SOURCE_NAME: str = "unknown"

    def __init__(self, timeout: float = 10.0, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self._session = None

    @abstractmethod
    async def fetch(self, endpoint: str, params: dict = None) -> Any:
        """Fetch data from source. Must be implemented by subclass."""
        ...

    async def fetch_with_retry(self, endpoint: str, params: dict = None) -> Any:
        """Fetch with retry + exponential backoff."""
        last_error = None
        for attempt in range(self.max_retries):
            try:
                return await self.fetch(endpoint, params)
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    delay = (2 ** attempt) + random.random()
                    logger.warning(
                        f"{self.SOURCE_NAME} retry {attempt+1}/{self.max_retries} "
                        f"after {delay:.1f}s: {e}"
                    )
                    time.sleep(delay)
        raise last_error

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if data source is reachable."""
        ...


class SourceFallbackRouter:
    """Route requests through primary → fallback data sources."""

    def __init__(self, primary: DataSourceAdapter, fallback: DataSourceAdapter):
        self.primary = primary
        self.fallback = fallback

    async def fetch(self, endpoint: str, params: dict = None) -> tuple[Any, str]:
        """Fetch from primary; fallback to secondary on failure."""
        try:
            result = await self.primary.fetch_with_retry(endpoint, params)
            return result, self.primary.SOURCE_NAME
        except Exception as e:
            logger.warning(f"Primary {self.primary.SOURCE_NAME} failed: {e}, falling back to {self.fallback.SOURCE_NAME}")
            result = await self.fallback.fetch_with_retry(endpoint, params)
            return result, self.fallback.SOURCE_NAME
