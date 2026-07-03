import re

INSTRUCTION_OVERRIDE_RE = re.compile(
    r"ignore (all )?(previous|above|prior) instructions?"
    r"|you are now"
    r"|new (system )?prompt"
    r"|forget everything"
    r"|act as (if )?"
    r"|your (new )?instructions? (are|is)"
    r"|disregard (your )?(previous|training)",
    re.IGNORECASE,
)

ROLE_INJECTION_RE = re.compile(r"\n(system|assistant):\s", re.IGNORECASE)

IMPERATIVE_VERBS = ("tell", "ignore", "act", "pretend", "respond", "repeat", "output")
IMPERATIVE_VERB_RE = re.compile(r"\b(" + "|".join(IMPERATIVE_VERBS) + r")\b", re.IGNORECASE)

DENSITY_LENGTH_THRESHOLD = 500
DENSITY_VERB_COUNT_THRESHOLD = 3


def detect_injection(text: str) -> list[dict]:
    if INSTRUCTION_OVERRIDE_RE.search(text):
        return [
            {
                "type": "prompt_injection",
                "detail": "instruction-override pattern detected",
                "severity": "block",
            }
        ]

    if ROLE_INJECTION_RE.search(text):
        return [
            {
                "type": "prompt_injection",
                "detail": "role-injection pattern detected",
                "severity": "block",
            }
        ]

    if len(text) > DENSITY_LENGTH_THRESHOLD:
        verb_count = len(IMPERATIVE_VERB_RE.findall(text))
        if verb_count > DENSITY_VERB_COUNT_THRESHOLD:
            return [
                {
                    "type": "prompt_injection",
                    "detail": "excessive instruction density detected",
                    "severity": "block",
                }
            ]

    return []
