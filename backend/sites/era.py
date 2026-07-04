"""Best-effort parsing of the human-readable `era` string into an age.

Powers the profile stat "N combined years of old shit witnessed".
Conservative: returns None when unsure — a missing stat beats a wrong one.
"""
import re
from datetime import date

CENTURY_RE = re.compile(r"(\d{1,2})(?:st|nd|rd|th)\s+century(?:\s+(BCE?))?", re.IGNORECASE)
YEAR_RE = re.compile(r"(?:c\.?\s*)?(\d{1,4})\s*(BCE?|CE|AD)?", re.IGNORECASE)


def era_start_year(era):
    """Approximate start year (negative = BC) parsed from an era string, or None."""
    if not era:
        return None
    century_match = CENTURY_RE.search(era)
    if century_match:
        century = int(century_match.group(1))
        midpoint = (century - 1) * 100 + 50
        return -midpoint if century_match.group(2) else midpoint
    year_match = YEAR_RE.search(era)
    if year_match:
        year = int(year_match.group(1))
        suffix = (year_match.group(2) or "").upper()
        return -year if suffix in ("BC", "BCE") else year
    return None


def age_years(era):
    """How old the thing is, in years, or None if the era is unparseable."""
    start = era_start_year(era)
    if start is None:
        return None
    age = date.today().year - start
    return age if age > 0 else None
