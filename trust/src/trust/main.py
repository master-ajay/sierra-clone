from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from trust.config import get_settings
from trust.database import run_migrations
from trust.errors import error_response
from trust.routes import audit, check, system


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    run_migrations(settings.trust_db_path)
    yield


app = FastAPI(title="Trust & Reliability", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response("validation_error", str(exc.errors()[0]["msg"]), 422, {"errors": exc.errors()})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    # HTTPException.detail is nested under "detail" by FastAPI's default
    # handler, which breaks the platform-wide flat {"error": {...}} envelope
    # (DEVELOPMENT-PLAYBOOK Part 3) for every 401/404 auth.py and routes/
    # raise this way.
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return error_response("http_error", str(exc.detail), exc.status_code)


app.include_router(system.router)
app.include_router(check.router)
app.include_router(audit.router)
