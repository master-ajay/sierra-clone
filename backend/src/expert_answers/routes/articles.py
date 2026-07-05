from fastapi import APIRouter, Depends, HTTPException, Query

from expert_answers.auth import require_api_key
from expert_answers.config import Settings, get_settings
from expert_answers.database import get_connection
from expert_answers.errors import error_response
from expert_answers.models.article import ArticleUpdate
from expert_answers.services.article_service import get_article, list_articles, update_article

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.get("/v1/articles/published")
def list_published(topic: str | None = Query(None), settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.expert_answers_db_path)
    items, _ = list_articles(conn, status="published", topic=topic, cursor=None, limit=100)
    return {"items": items, "next_cursor": None}


@router.get("/v1/articles")
def list_all(
    status: str | None = Query(None),
    topic: str | None = Query(None),
    cursor: str | None = Query(None),
    limit: int = Query(50),
    settings: Settings = Depends(get_settings),
):
    conn = get_connection(settings.expert_answers_db_path)
    items, next_cursor = list_articles(conn, status=status, topic=topic, cursor=cursor, limit=limit)
    return {"items": items, "next_cursor": next_cursor}


@router.get("/v1/articles/{article_id}")
def get_one(article_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.expert_answers_db_path)
    article = get_article(conn, article_id)
    if not article:
        raise HTTPException(
            status_code=404, detail={"error": {"code": "not_found", "message": "Article not found", "details": {}}}
        )
    return article


@router.patch("/v1/articles/{article_id}")
def patch_article(article_id: str, body: ArticleUpdate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.expert_answers_db_path)
    article, error = update_article(conn, article_id, body.title, body.body, body.status)
    if article is None:
        raise HTTPException(
            status_code=404, detail={"error": {"code": "not_found", "message": "Article not found", "details": {}}}
        )
    if error:
        return error_response("invalid_transition", error, 400)
    return article
