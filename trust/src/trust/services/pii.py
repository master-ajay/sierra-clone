import re
from trust.models.check import Flag

_PATTERNS = [
    ("email", re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", re.I), "[EMAIL]"),
    ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[SSN]"),
    # CC before phone so a 16-digit number isn't partially matched as a phone
    ("credit_card", re.compile(r"\b(?:\d[ \-]?){13,19}\b"), "[CREDIT_CARD]"),
    # Phone after CC; require separator to avoid matching pure digit strings
    ("phone", re.compile(r"(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}(?!\d)"), "[PHONE]"),
]


def _luhn_valid(number: str) -> bool:
    digits = [int(d) for d in number if d.isdigit()]
    if len(digits) < 13:
        return False
    total = 0
    for i, d in enumerate(reversed(digits)):
        total += d if i % 2 == 0 else (d * 2 - 9 if d * 2 > 9 else d * 2)
    return total % 10 == 0


def scan_pii(text: str) -> tuple[str, list[Flag]]:
    flags: list[Flag] = []
    clean = text
    for name, pattern, placeholder in _PATTERNS:
        matches = list(pattern.finditer(clean))
        if not matches:
            continue
        # For credit cards, validate with Luhn
        if name == "credit_card":
            valid_matches = [m for m in matches if _luhn_valid(m.group())]
            if not valid_matches:
                continue
            matches = valid_matches
        for m in reversed(matches):
            clean = clean[: m.start()] + placeholder + clean[m.end() :]
        flags.append(Flag(type="pii", detail=f"{name} detected and redacted", severity="warn"))
    return clean, flags
