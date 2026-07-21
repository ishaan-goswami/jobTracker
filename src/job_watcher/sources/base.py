from abc import ABC, abstractmethod
from ..models import CompanyConfig, RawJob


class JobSource(ABC):
    @abstractmethod
    def fetch_jobs(self, company: CompanyConfig) -> list[RawJob]: ...
