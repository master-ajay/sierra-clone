import sqlite3
import uuid
from datetime import datetime, timezone

from expert_answers.models.article import ArticleResponse

_VALID_TRANSITIONS = {
    "pending_review": {"approved", "rejected"},
    "approved": {"published"},
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_article(row: sqlite3.Row, conv_id: str) -> ArticleResponse:
    return ArticleResponse(
        article_id=row["article_id"],
        resolution_id=row["resolution_id"],
        title=row["title"],
        body=row["body"],
        cited_excerpt=row["cited_excerpt"],
        topic=row["topic"],
        status=row["status"],
        source_conversation_id=conv_id,
        published_at=row["published_at"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _get_conv_id(conn: sqlite3.Connection, resolution_id: str) -> str:
    row = conn.execute("SELECT conversation_id FROM resolutions WHERE resolution_id=?", (resolution_id,)).fetchone()
    return row["conversation_id"] if row else ""


def create_article(conn: sqlite3.Connection, resolution_id: str, title: str, body: str, cited_excerpt: str, topic: str | None) -> ArticleResponse:
    article_id = str(uuid.uuid4())
    now = _now()
    conn.execute(
        "INSERT INTO knowledge_articles (article_id, resolution_id, title, body, cited_excerpt, topic, status, published_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (article_id, resolution_id, title, body, cited_excerpt, topic, "pending_review", None, now, now),
    )
    conn.commit()
    return get_article(conn, article_id)  # type: ignore[return-value]


def get_article(conn: sqlite3.Connection, article_id: str) -> ArticleResponse | None:
    row = conn.execute("SELECT * FROM knowledge_articles WHERE article_id=?", (article_id,)).fetchone()
    if not row:
        return None
    return _row_to_article(row, _get_conv_id(conn, row["resolution_id"]))


def list_articles(conn: sqlite3.Connection, status: str | None, topic: str | None, cursor: str | None, limit: int) -> tuple[list[ArticleResponse], str | None]:
    clauses, params = [], []
    if status:
        clauses.append("a.status=?")
        params.append(status)
    if topic:
        clauses.append("a.topic=?")
        params.append(topic)
    if cursor:
        clauses.append("a.created_at<?")
        params.append(cursor)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    params.append(limit + 1)
    rows = conn.execute(
        f"SELECT a.*, r.conversation_id FROM knowledge_articles a JOIN resolutions r ON a.resolution_id=r.resolution_id {where} ORDER BY a.created_at DESC LIMIT ?",
        params,
    ).fetchall()
    has_more = len(rows) > limit
    items = [ArticleResponse(
        article_id=r["article_id"], resolution_id=r["resolution_id"], title=r["title"], body=r["body"],
        cited_excerpt=r["cited_excerpt"], topic=r["topic"], status=r["status"], source_conversation_id=r["conversation_id"],
        published_at=r["published_at"], created_at=r["created_at"], updated_at=r["updated_at"],
    ) for r in rows[:limit]]
    return items, items[-1].created_at if has_more else None


def update_article(conn: sqlite3.Connection, article_id: str, title: str | None, body: str | None, new_status: str | None) -> tuple[ArticleResponse | None, str | None]:
    article = get_article(conn, article_id)
    if not article:
        return None, None

    if new_status:
        allowed = _VALID_TRANSITIONS.get(article.status, set())
        if new_status not in allowed:
            return article, f"Cannot transition from '{article.status}' to '{new_status}'"

    sets, params = [], []
    if title is not None:
        sets.append("title=?")
        params.append(title)
    if body is not None:
        sets.append("body=?")
        params.append(body)
    if new_status is not None:
        sets.append("status=?")
        params.append(new_status)
        if new_status == "published":
            sets.append("published_at=?")
            params.append(_now())

    if sets:
        sets.append("updated_at=?")
        params.append(_now())
        params.append(article_id)
        conn.execute(f"UPDATE knowledge_articles SET {', '.join(sets)} WHERE article_id=?", params)
        conn.commit()

    return get_article(conn, article_id), None
