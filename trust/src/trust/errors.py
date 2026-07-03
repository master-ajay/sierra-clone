from fastapi.responses import JSONResponse


def error_response(code: str, message: str, status: int, details: dict | None = None) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, "details": details or {}}})
