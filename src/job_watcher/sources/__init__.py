from .amazon import AmazonSource
from .ashby import AshbySource
from .generic_html import GenericHTMLSource
from .google import GoogleSource
from .greenhouse import GreenhouseSource
from .lever import LeverSource

SOURCES = {
    "amazon": AmazonSource,
    "ashby": AshbySource,
    "google": GoogleSource,
    "greenhouse": GreenhouseSource,
    "lever": LeverSource,
    "generic_html": GenericHTMLSource,
}
