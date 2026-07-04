from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from voice.config import get_settings
from voice.database import run_migrations
from voice.errors import error_response
from voice.routes import calls, lines, payments, system


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    run_migrations(settings.voice_db_path)
    yield


app = FastAPI(title="Voice", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response("validation_error", str(exc.errors()[0]["msg"]), 422, {"errors": exc.errors()})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return error_response("http_error", str(exc.detail), exc.status_code)


app.include_router(system.router)
app.include_router(lines.router)
app.include_router(calls.router)
app.include_router(payments.router)
