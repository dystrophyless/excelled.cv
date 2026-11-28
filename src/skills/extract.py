"""Finds skills in the plain text of a CV (US-17). Pure: no database, no network, nothing leaves the process.

A term counts only as a whole word: "java" is not found inside "javascript", "sql" not inside "mysql", "git" not inside
"github". The result is ordered by how often the skill appears, then by where it first appears.
"""

import re
from collections.abc import Iterable
from dataclasses import dataclass

from src.skills.normalize import clean_name, skill_key
from src.skills.vocabulary import ENTRIES

MIN_EXTRA_KEY_LENGTH = 3  # a 2-letter skill typed by an employer ("Go") is too easily an ordinary word

_LOWER_EDGE = "0-9a-z_+#"
_EXACT_EDGE = "0-9A-Za-z_+#"


@dataclass(frozen=True)
class Found:
    name: str
    count: int


def _term_regex(term: str) -> str:
    return r"\s+".join(re.escape(part) for part in term.split(" "))


def _compile(terms: Iterable[str], edge: str, flags: int = 0) -> re.Pattern[str] | None:
    ordered = sorted(set(terms), key=len, reverse=True)  # the longest first: "react native" before "react"
    if not ordered:
        return None
    alternation = "|".join(_term_regex(term) for term in ordered)
    return re.compile(rf"(?<![{edge}])(?:{alternation})(?![{edge}])", flags)


def _squash(text: str) -> str:
    return " ".join(text.split())


def find_skills(text: str, extra_names: Iterable[str] = ()) -> list[Found]:
    """The skills named in `text`: the built-in vocabulary plus `extra_names` (the skills employers already use).

    `extra_names` are matched ignoring letter case, as whole words, and only when 3 characters or longer; a name the
    built-in vocabulary already covers is left to it.
    """
    lower_terms: dict[str, str] = {}
    exact_terms: dict[str, str] = {}
    known_keys: set[str] = set()
    for entry in ENTRIES:
        known_keys.add(skill_key(entry.name))
        target = exact_terms if entry.exact_case else lower_terms
        for term in entry.terms:
            known_keys.add(skill_key(term))
            target[term] = entry.name

    for raw in extra_names:
        name = clean_name(raw)
        key = skill_key(name)
        if len(key) >= MIN_EXTRA_KEY_LENGTH and key not in known_keys:
            known_keys.add(key)
            lower_terms[key] = name

    counts: dict[str, int] = {}
    first_at: dict[str, int] = {}

    def record(
        pattern: re.Pattern[str] | None,
        haystack: str,
        names: dict[str, str],
        fold: bool,
        taken: list[tuple[int, int]],
    ) -> list[tuple[int, int]]:
        """Counts the matches that do not overlap `taken`; returns the spans it counted."""
        spans: list[tuple[int, int]] = []
        if pattern is None:
            return spans
        for match in pattern.finditer(haystack):
            start, end = match.span()
            if any(start < other_end and other_start < end for other_start, other_end in taken):
                continue  # "Ruby" inside "Ruby on Rails" is part of the longer skill, not a second one
            found = _squash(match.group(0))
            name = names[found.lower() if fold else found]
            counts[name] = counts.get(name, 0) + 1
            first_at.setdefault(name, start)
            spans.append((start, end))
        return spans

    spans = record(_compile(lower_terms, _LOWER_EDGE), text.lower(), lower_terms, True, [])
    record(_compile(exact_terms, _EXACT_EDGE), text, exact_terms, False, spans)

    ranked = sorted(counts, key=lambda name: (-counts[name], first_at[name]))
    return [Found(name=name, count=counts[name]) for name in ranked]
