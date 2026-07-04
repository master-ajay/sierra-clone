import re

from trust.models.check import Flag

_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|above|prior)\s+instructions?", re.I),
    re.compile(r"you\s+are\s+now\b", re.I),
    re.compile(r"new\s+(system\s+)?prompt", re.I),
    re.compile(r"forget\s+everything", re.I),
    re.compile(r"act\s+as(\s+if)?", re.I),
    re.compile(r"your\s+(new\s+)?instructions?\s+(are|is)\b", re.I),
    re.compile(r"disregard\s+(your\s+)?(previous|training)", re.I),
    re.compile(r"\n(system|assistant):\s", re.I),
]

_IMPERATIVE_VERBS = re.compile(r"\b(tell|ignore|act|pretend|respond|repeat|output|forget|disregard)\b", re.I)


def scan_injection(text: str) -> list[Flag]:
    for pattern in _PATTERNS:
        if pattern.search(text):
            return [Flag(type="prompt_injection", detail="instruction-override pattern detected", severity="block")]
    # Density heuristic: long message with many imperative verbs
    if len(text) > 500 and len(_IMPERATIVE_VERBS.findall(text)) > 3:
        return [Flag(type="prompt_injection", detail="high imperative verb density in long message", severity="block")]
    return []
