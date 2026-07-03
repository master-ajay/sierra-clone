import json
from unittest.mock import MagicMock

from agent_runtime.guardrails.faithfulness import check_faithfulness
from agent_runtime.models import Chunk, GuardrailTrace

CHUNKS = [Chunk(id="a::0", text="We ship within 2 business days.", source="a.md")]


def _fake_client(score: float):
    client = MagicMock()
    client.models.generate_content.return_value = MagicMock(text=json.dumps({"score": score}))
    return client


def test_well_grounded_answer_passes_default_threshold():
    client = _fake_client(0.95)

    trace = check_faithfulness("We ship within 2 business days.", CHUNKS, client=client)

    assert isinstance(trace, GuardrailTrace)
    assert trace.faithfulness_score == 0.95
    assert trace.threshold == 0.7
    assert trace.passed is True


def test_hallucinated_answer_fails_and_would_escalate():
    client = _fake_client(0.1)

    trace = check_faithfulness("We ship instantly via teleporter.", CHUNKS, client=client)

    assert trace.passed is False


def test_custom_threshold_is_respected():
    client = _fake_client(0.75)

    trace = check_faithfulness("...", CHUNKS, threshold=0.8, client=client)

    assert trace.threshold == 0.8
    assert trace.passed is False
