import html
import re
from abc import ABC, abstractmethod
from ..models import CompanyConfig, SourceResult


def clean_html(raw_html: str | None) -> str:
    if not raw_html:
        return ""
    text = str(raw_html)
    for _ in range(2):
        text = html.unescape(text)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</(p|div|h[1-6]|li|tr)>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<li[^>]*>', '• ', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    return text.strip()


class JobSource(ABC):
    @abstractmethod
    def fetch_jobs(self, company: CompanyConfig) -> SourceResult: ...

