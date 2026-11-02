import re

MAX_NAME_LENGTH = 40


def clean_name(name: str) -> str:
    """The display form: trimmed, inner whitespace collapsed to single spaces."""
    return re.sub(r"\s+", " ", name).strip()


def skill_key(name: str) -> str:
    """The comparison key: `clean_name` lower-cased. 'Python', ' python ' and 'PYTHON' share one key."""
    return clean_name(name).lower()
