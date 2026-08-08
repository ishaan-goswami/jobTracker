from .amazon import AmazonSource
from .ashby import AshbySource
from .generic_html import GenericHTMLSource
from .greenhouse import GreenhouseSource
from .lever import LeverSource

SOURCES = {
    "amazon": AmazonSource,
    "ashby": AshbySource,
    "greenhouse": GreenhouseSource,
    "lever": LeverSource,
    "generic_html": GenericHTMLSource,
}
