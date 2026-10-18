"""Provider boundary. Providers return text; application code validates it."""
from typing import Protocol

class ProviderError(RuntimeError):
    """Sanitized provider failure, suitable for application error handling."""

class TextProvider(Protocol):
    def complete(self, *, system: str, question: str) -> str: ...
