from agent_runtime.ingestion.indexer import load_bm25_index
from agent_runtime.models import Chunk


def search(query: str, persist_path: str, top_k: int = 5) -> list[Chunk]:
    bm25, chunks = load_bm25_index(persist_path)
    if bm25 is None or not chunks:
        return []

    scores = bm25.get_scores(query.lower().split())
    ranked = sorted(range(len(chunks)), key=lambda i: scores[i], reverse=True)[:top_k]

    return [chunks[i].model_copy(update={"score": float(scores[i])}) for i in ranked]
