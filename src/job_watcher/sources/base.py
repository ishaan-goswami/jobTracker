from abc import ABC, abstractmethod
from ..models import CompanyConfig, SourceResult


class JobSource(ABC):
    @abstractmethod
    def fetch_jobs(self, company: CompanyConfig) -> SourceResult: ...
