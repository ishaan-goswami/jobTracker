from .ashby import AshbySource
from .greenhouse import GreenhouseSource
from .generic_html import GenericHTMLSource
from .lever import LeverSource

SOURCES = {
    "ashby": AshbySource,
    "greenhouse": GreenhouseSource,
    "lever": LeverSource,
    "generic_html": GenericHTMLSource,
}
