from typing import Literal

from pydantic import BaseModel


class ArticleUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    status: Literal["approved", "rejected", "published"] | None = None


class ArticleResponse(BaseModel):
    article_id: str
    resolution_id: str
    title: str
    body: str
    cited_excerpt: str
    topic: str | None
    status: str
    source_conversation_id: str
    published_at: str | None
    created_at: str
    updated_at: str
