from agent_runtime.models import Chunk


def reciprocal_rank_fusion(
    vector_results: list[Chunk],
    bm25_results: list[Chunk],
    k: int = 60,
    top_n: int = 5,
) -> list[Chunk]:
    scores: dict[str, float] = {}
    chunk_by_id: dict[str, Chunk] = {}

    for results in (vector_results, bm25_results):
        for rank, chunk in enumerate(results, start=1):
            scores[chunk.id] = scores.get(chunk.id, 0.0) + 1.0 / (k + rank)
            chunk_by_id.setdefault(chunk.id, chunk)

    ranked_ids = sorted(scores, key=lambda cid: scores[cid], reverse=True)[:top_n]

    return [chunk_by_id[cid].model_copy(update={"score": scores[cid]}) for cid in ranked_ids]
