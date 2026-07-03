import json
import shutil
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from agent_runtime.agent import Agent
from agent_runtime.models import AgentResponse


@pytest.fixture()
def kb_dir():
    d = tempfile.mkdtemp()
    (Path(d) / "shipping.md").write_text("We ship within 2 business days of purchase.")
    yield d
    shutil.rmtree(d, ignore_errors=True)


def _client_with_responses(gen_json: dict, faith_json: dict):
    client = MagicMock()
    client.models.generate_content.side_effect = [
        MagicMock(text=json.dumps(gen_json)),
        MagicMock(text=json.dumps(faith_json)),
    ]
    return client


def test_agent_query_returns_answer_for_answerable_question(kb_dir, tmp_path):
    client = _client_with_responses(
        {"answer": "We ship within 2 business days.", "citations": ["shipping.md::0"]},
        {"score": 0.95},
    )
    agent = Agent(knowledge_base_path=kb_dir, persist_path=str(tmp_path / "chroma"), client=client)

    response = agent.query("How long does shipping take?")

    assert isinstance(response, AgentResponse)
    assert response.action == "answer"
    assert response.answer == "We ship within 2 business days."
    assert response.citations == ["shipping.md::0"]
    assert response.guardrail_trace.passed is True
    assert response.retrieval_trace.fused_results
    assert response.escalation_reason is None


def test_agent_query_escalates_for_unanswerable_question(kb_dir, tmp_path):
    client = _client_with_responses(
        {"answer": "I don't know based on the available information.", "citations": []},
        {"score": 0.1},
    )
    agent = Agent(knowledge_base_path=kb_dir, persist_path=str(tmp_path / "chroma"), client=client)

    response = agent.query("What is the meaning of life?")

    assert response.action == "escalate"
    assert response.answer is None
    assert response.escalation_reason is not None
    assert response.guardrail_trace.passed is False
