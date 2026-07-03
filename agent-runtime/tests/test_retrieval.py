import shutil
import tempfile

import pytest

from agent_runtime.ingestion.indexer import index_chunks
from agent_runtime.ingestion.loader import load_and_chunk
from agent_runtime.models import Chunk
from agent_runtime.retrieval.bm25_search import search as bm25_search
from agent_runtime.retrieval.fusion import reciprocal_rank_fusion
from agent_runtime.retrieval.vector_search import search as vector_search


@pytest.fixture()
def indexed_persist_dir():
    d = tempfile.mkdtemp()
    chunks = load_and_chunk("docs")
    index_chunks(chunks, d)
    yield d
    shutil.rmtree(d, ignore_errors=True)


def test_vector_search_returns_relevant_chunk(indexed_persist_dir):
    results = vector_search("how long until my refund is processed", indexed_persist_dir, top_k=3)

    assert len(results) <= 3
    assert any("refund" in c.text.lower() for c in results)


def test_bm25_search_returns_relevant_chunk(indexed_persist_dir):
    results = bm25_search("password reset", indexed_persist_dir, top_k=3)

    assert len(results) <= 3
    assert "password" in results[0].text.lower()


def test_fusion_surfaces_a_doc_that_ranks_low_in_vector_but_high_in_bm25():
    # X ranks last (5th) in vector search but 1st in BM25; Y ranks 1st in
    # vector search but doesn't appear in BM25's top results at all. RRF
    # should still rank X above Y overall, since X is corroborated by both
    # signals while Y is only corroborated by one.
    x = Chunk(id="x", text="x", source="x.md")
    y = Chunk(id="y", text="y", source="y.md")
    filler = lambda n: Chunk(id=f"filler-{n}", text="filler", source="f.md")  # noqa: E731

    vector_results = [y, filler(1), filler(2), filler(3), x]
    bm25_results = [x, filler(4), filler(5), filler(6), filler(7)]

    fused = reciprocal_rank_fusion(vector_results, bm25_results, top_n=10)
    fused_ids = [c.id for c in fused]

    assert fused_ids.index("x") < fused_ids.index("y")
    assert fused_ids[0] == "x"


def test_fusion_deduplicates_chunks_present_in_both_lists():
    shared = Chunk(id="c1", text="dup", source="a.md")
    only_vector = Chunk(id="c2", text="v only", source="b.md")

    fused = reciprocal_rank_fusion([shared, only_vector], [shared], top_n=5)

    ids = [c.id for c in fused]
    assert ids.count("c1") == 1
    assert set(ids) == {"c1", "c2"}
