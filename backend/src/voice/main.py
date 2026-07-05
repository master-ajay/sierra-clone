import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from voice.config import get_settings
from voice.database import run_migrations
from voice.errors import error_response
from voice.routes import calls, lines, payments, system

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    run_migrations(settings.voice_db_path)
    logger.info("voice_started db=%s", settings.voice_db_path)
    yield


app = FastAPI(title="Voice", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    safe_errors = [{"loc": e["loc"], "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    logger.warning("validation_error path=%s errors=%s", request.url.path, safe_errors)
    return error_response("validation_error", safe_errors[0]["msg"], 422, {"errors": safe_errors})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if exc.status_code >= 500:
        logger.error("http_exception path=%s status=%d detail=%s", request.url.path, exc.status_code, exc.detail)
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return error_response("http_error", str(exc.detail), exc.status_code)


app.include_router(system.router)
app.include_router(lines.router)
app.include_router(calls.router)
app.include_router(payments.router)
