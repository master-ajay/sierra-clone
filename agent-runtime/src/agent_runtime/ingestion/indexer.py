import pickle
from pathlib import Path

import chromadb
from pydantic import BaseModel
from rank_bm25 import BM25Okapi

from agent_runtime.models import Chunk

COLLECTION_NAME = "knowledge_base"
BM25_FILENAME = "bm25_index.pkl"


class IndexResult(BaseModel):
    chunks_indexed: int


def index_chunks(chunks: list[Chunk], persist_path: str) -> IndexResult:
    client = chromadb.PersistentClient(path=persist_path)
    collection = client.get_or_create_collection(COLLECTION_NAME)
    if collection.count() > 0:
        collection.delete(ids=collection.get()["ids"])

    if chunks:
        collection.add(
            ids=[c.id for c in chunks],
            documents=[c.text for c in chunks],
            metadatas=[{"source": c.source} for c in chunks],
        )

    tokenized_corpus = [c.text.lower().split() for c in chunks]
    bm25 = BM25Okapi(tokenized_corpus) if tokenized_corpus else None
    with open(Path(persist_path) / BM25_FILENAME, "wb") as f:
        pickle.dump({"bm25": bm25, "chunks": chunks}, f)

    return IndexResult(chunks_indexed=len(chunks))


def load_bm25_index(persist_path: str) -> tuple[BM25Okapi, list[Chunk]]:
    with open(Path(persist_path) / BM25_FILENAME, "rb") as f:
        data = pickle.load(f)
    return data["bm25"], data["chunks"]
