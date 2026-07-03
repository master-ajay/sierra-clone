import chromadb

from agent_runtime.ingestion.indexer import COLLECTION_NAME
from agent_runtime.models import Chunk


def search(query: str, persist_path: str, top_k: int = 5) -> list[Chunk]:
    client = chromadb.PersistentClient(path=persist_path)
    collection = client.get_collection(COLLECTION_NAME)
    result = collection.query(query_texts=[query], n_results=top_k)

    ids = result["ids"][0]
    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]

    return [
        Chunk(id=id_, text=doc, source=meta["source"], score=1.0 / (1.0 + dist))
        for id_, doc, meta, dist in zip(ids, documents, metadatas, distances)
    ]
