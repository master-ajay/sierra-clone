import sqlite3

from adp.models.context import ContextRequest, ContextResponse, SessionSummary
from adp.services.message_service import list_messages
from adp.services.user_service import get_user


def assemble_context(conn: sqlite3.Connection, req: ContextRequest, max_context_tokens: int) -> ContextResponse:
    user = get_user(conn, req.user_id) if req.include_user_profile else None

    # Session summary
    row = conn.execute(
        "SELECT COUNT(*) as cnt, MAX(updated_at) as last FROM adp_sessions WHERE user_id=?",
        (req.user_id,),
    ).fetchone()
    summary = SessionSummary(total_sessions=row["cnt"], last_interaction=row["last"])

    # Recent messages from current session
    messages = []
    if req.include_history and req.session_id:
        all_msgs, _ = list_messages(conn, req.session_id, None, req.max_messages)
        # Apply token budget — truncate oldest until within budget
        token_limit = min(req.max_tokens, max_context_tokens)
        while all_msgs:
            token_estimate = _estimate_tokens(all_msgs)
            if token_estimate <= token_limit:
                break
            all_msgs = all_msgs[1:]  # drop oldest
        messages = all_msgs

    token_estimate = _estimate_tokens(messages)
    return ContextResponse(user=user, messages=messages, session_summary=summary, token_estimate=token_estimate)


def _estimate_tokens(messages: list) -> int:
    return sum(len(m.content) // 4 for m in messages)
