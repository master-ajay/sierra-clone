import re

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(?<!\d)(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)")
SSN_RE = re.compile(r"(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)")
CREDIT_CARD_RE = re.compile(r"(?<!\d)\d{13,19}(?!\d)")

PLACEHOLDERS = {
    "email": "[EMAIL]",
    "phone": "[PHONE]",
    "credit_card": "[CREDIT_CARD]",
    "ssn": "[SSN]",
}


def _luhn_valid(digits: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def redact_pii(text: str) -> tuple[str, list[dict]]:
    flags: list[dict] = []
    result = text

    # Order matters: SSN and credit card share digit-heavy shapes, so match
    # the more specific pattern (SSN's dashed shape) before the broad
    # digit-run pattern used for credit cards.
    for pii_type, pattern in (("email", EMAIL_RE), ("ssn", SSN_RE), ("phone", PHONE_RE)):
        def _replace(match: re.Match, pii_type: str = pii_type) -> str:
            flags.append({"type": "pii", "detail": f"{pii_type} detected", "severity": "warn"})
            return PLACEHOLDERS[pii_type]

        result = pattern.sub(_replace, result)

    def _replace_card(match: re.Match) -> str:
        if not _luhn_valid(match.group(0)):
            return match.group(0)
        flags.append({"type": "pii", "detail": "credit_card detected", "severity": "warn"})
        return PLACEHOLDERS["credit_card"]

    result = CREDIT_CARD_RE.sub(_replace_card, result)

    return result, flags
