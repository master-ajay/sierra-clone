import logging
import sqlite3

from fastapi import APIRouter, Depends, Query

from adp.auth import require_api_key
from adp.config import Settings, get_settings
from adp.database import get_connection
from adp.errors import error_response
from adp.models.user import UserCreate, UserUpdate
from adp.services.user_service import (
    create_user,
    delete_user,
    get_user,
    get_user_by_external_id,
    list_users,
    update_user,
)

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/v1/users", status_code=201)
def create(body: UserCreate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        return create_user(conn, body)
    except sqlite3.IntegrityError:
        logger.warning("user_create_conflict: external_id already exists")
        return error_response("conflict", "external_id already exists", 409)
    finally:
        conn.close()


@router.get("/v1/users")
def list_all(
    cursor: str | None = Query(None),
    limit: int = Query(20),
    settings: Settings = Depends(get_settings),
):
    conn = get_connection(settings.adp_db_path)
    try:
        items, next_cursor = list_users(conn, cursor, limit)
        return {"items": items, "next_cursor": next_cursor}
    finally:
        conn.close()


@router.get("/v1/users/by-external-id/{external_id}")
def get_by_external_id(external_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        user = get_user_by_external_id(conn, external_id)
        if not user:
            return error_response("not_found", "user not found", 404)
        return user
    finally:
        conn.close()


@router.get("/v1/users/{user_id}")
def get_one(user_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        user = get_user(conn, user_id)
        if not user:
            return error_response("not_found", "user not found", 404)
        return user
    finally:
        conn.close()


@router.patch("/v1/users/{user_id}")
def update(user_id: str, body: UserUpdate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        user = update_user(conn, user_id, body)
        if not user:
            return error_response("not_found", "user not found", 404)
        return user
    finally:
        conn.close()


@router.delete("/v1/users/{user_id}", status_code=204)
def delete(user_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        if not delete_user(conn, user_id):
            return error_response("not_found", "user not found", 404)
    finally:
        conn.close()
