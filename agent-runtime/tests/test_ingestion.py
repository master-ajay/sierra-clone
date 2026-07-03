import shutil
import tempfile
from pathlib import Path

import chromadb
import pytest

from agent_runtime.ingestion.loader import load_and_chunk
from agent_runtime.ingestion.indexer import index_chunks, load_bm25_index

SAMPLE_DOCS = Path(__file__).parent.parent / "docs"


@pytest.fixture()
def persist_dir():
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d, ignore_errors=True)


def test_load_and_chunk_produces_chunks_with_expected_metadata():
    chunks = load_and_chunk(str(SAMPLE_DOCS))

    assert len(chunks) > 0
    assert all(c.source.endswith(".md") for c in chunks)
    assert any("30 days" in c.text for c in chunks)


def test_chunking_respects_target_size_with_overlap():
    text = " ".join(f"word{i}" for i in range(1000))
    tmp = tempfile.mkdtemp()
    try:
        (Path(tmp) / "big.md").write_text(text)
        chunks = load_and_chunk(tmp, chunk_size=300, overlap=50)

        assert len(chunks) > 1
        for c in chunks:
            word_count = len(c.text.split())
            assert word_count <= 300

        first_words = chunks[0].text.split()
        second_words = chunks[1].text.split()
        assert first_words[-1] == second_words[49]
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_index_chunks_writes_queryable_chroma_collection(persist_dir):
    chunks = load_and_chunk(str(SAMPLE_DOCS))
    result = index_chunks(chunks, persist_dir)

    assert result.chunks_indexed == len(chunks)

    client = chromadb.PersistentClient(path=persist_dir)
    collection = client.get_collection("knowledge_base")
    assert collection.count() == len(chunks)

    found = collection.query(query_texts=["how long do refunds take"], n_results=1)
    assert "refund" in found["documents"][0][0].lower()


def test_index_chunks_writes_loadable_bm25_index(persist_dir):
    chunks = load_and_chunk(str(SAMPLE_DOCS))
    index_chunks(chunks, persist_dir)

    bm25, indexed_chunks = load_bm25_index(persist_dir)
    assert len(indexed_chunks) == len(chunks)

    scores = bm25.get_scores("password reset".split())
    best_idx = scores.argmax()
    assert "password" in indexed_chunks[best_idx].text.lower()
