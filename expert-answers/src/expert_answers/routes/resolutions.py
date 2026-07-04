
import httpx
from fastapi import APIRouter, Depends, HTTPException

from expert_answers.auth import require_api_key
from expert_answers.config import Settings, get_settings
from expert_answers.database import get_connection
from expert_answers.errors import error_response
from expert_answers.models.resolution import ResolutionCreate
from expert_answers.services.draft_service import generate_draft
from expert_answers.services.resolution_service import create_resolution, get_resolution, set_resolution_status

router = APIRouter(dependencies=[Depends(require_api_key)])


def _fetch_adp_transcript(session_id: str, settings: Settings) -> list[dict]:
    resp = httpx.get(
        f"{settings.expert_answers_adp_url}/v1/sessions/{session_id}/messages",
        headers={"X-API-Key": settings.expert_answers_adp_api_key},
        timeout=10,
    )
    resp.raise_for_status()
    items = resp.json().get("items", [])
    return [{"role": m["role"], "content": m["content"]} for m in items]


@router.post("/v1/resolutions", status_code=201)
def submit_resolution(body: ResolutionCreate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.expert_answers_db_path)

    if body.adp_session_id:
        try:
            transcript = _fetch_adp_transcript(body.adp_session_id, settings)
        except Exception:
            return error_response("upstream_error", "Failed to fetch transcript from ADP", 502)
    else:
        transcript = body.transcript  # type: ignore[assignment]

    resolution = create_resolution(conn, body.conversation_id, transcript, body.adp_session_id, body.resolution_note, body.topic)

    try:
        article = generate_draft(conn, resolution.resolution_id, transcript, body.resolution_note, body.topic, settings)
        set_resolution_status(conn, resolution.resolution_id, "drafted")
    except Exception:
        set_resolution_status(conn, resolution.resolution_id, "draft_failed")
        article = None
    return {"resolution": get_resolution(conn, resolution.resolution_id), "article": article}


@router.post("/v1/resolutions/{resolution_id}/retry", status_code=200)
def retry_resolution(resolution_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.expert_answers_db_path)
    resolution = get_resolution(conn, resolution_id)
    if not resolution:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Resolution not found", "details": {}}})
    if resolution.status != "draft_failed":
        return error_response("invalid_state", f"Resolution status is '{resolution.status}'; only 'draft_failed' can be retried", 400)

    transcript = __import__("expert_answers.services.resolution_service", fromlist=["get_resolution_transcript"]).get_resolution_transcript(conn, resolution_id)
    try:
        article = generate_draft(conn, resolution_id, transcript, resolution.resolution_note, resolution.topic, settings)
        set_resolution_status(conn, resolution_id, "drafted")
        return {"resolution": get_resolution(conn, resolution_id), "article": article}
    except Exception:
        return {"resolution": get_resolution(conn, resolution_id), "article": None}
