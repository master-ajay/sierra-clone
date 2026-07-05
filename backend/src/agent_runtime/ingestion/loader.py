from pathlib import Path

from pypdf import PdfReader

from agent_runtime.models import Chunk

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf"}


def _read_file(path: Path) -> str:
    if path.suffix == ".pdf":
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return path.read_text()


def load_documents(folder: str) -> list[tuple[str, str]]:
    documents = []
    for path in sorted(Path(folder).iterdir()):
        if path.suffix in SUPPORTED_EXTENSIONS:
            documents.append((path.name, _read_file(path)))
    return documents


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list[str]:
    words = text.split()
    if not words:
        return []

    step = max(chunk_size - overlap, 1)
    chunks = []
    i = 0
    while i < len(words):
        chunks.append(" ".join(words[i : i + chunk_size]))
        if i + chunk_size >= len(words):
            break
        i += step
    return chunks


def load_and_chunk(folder: str, chunk_size: int = 400, overlap: int = 50) -> list[Chunk]:
    chunks: list[Chunk] = []
    for source, text in load_documents(folder):
        for i, piece in enumerate(chunk_text(text, chunk_size, overlap)):
            chunks.append(Chunk(id=f"{source}::{i}", text=piece, source=source))
    return chunks
