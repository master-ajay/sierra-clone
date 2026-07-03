import json
from unittest.mock import MagicMock

import pytest

from agent_runtime.generation.generator import GenerationResult, build_context_block, generate
from agent_runtime.models import Chunk


def _fake_client(response_json: dict):
    client = MagicMock()
    client.models.generate_content.return_value = MagicMock(text=json.dumps(response_json))
    return client


def test_build_context_block_includes_chunk_ids_and_text():
    chunks = [Chunk(id="a::0", text="Ships in 2 days.", source="a.md")]
    block = build_context_block(chunks)

    assert "a::0" in block
    assert "Ships in 2 days." in block


def test_generate_returns_answer_with_valid_citation():
    chunks = [Chunk(id="shipping.md::0", text="We ship within 2 business days.", source="shipping.md")]
    client = _fake_client({"answer": "We ship within 2 business days.", "citations": ["shipping.md::0"]})

    result = generate("How long does shipping take?", chunks, client=client)

    assert isinstance(result, GenerationResult)
    assert result.citations == ["shipping.md::0"]
    assert result.citations[0] in {c.id for c in chunks}
    client.models.generate_content.assert_called_once()


def test_generate_without_client_or_api_key_raises_clear_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
        generate("anything", [], client=None)
