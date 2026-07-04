from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from expert_answers.config import get_settings
from expert_answers.database import run_migrations
from expert_answers.errors import error_response
from expert_answers.routes import articles, resolutions, system


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    run_migrations(settings.expert_answers_db_path)
    yield


app = FastAPI(title="Expert Answers", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # exc.errors() may contain non-JSON-serializable ctx values (e.g. ValueError objects)
    safe_errors = [{"loc": e["loc"], "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    return error_response("validation_error", safe_errors[0]["msg"], 422, {"errors": safe_errors})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return error_response("http_error", str(exc.detail), exc.status_code)


app.include_router(system.router)
app.include_router(resolutions.router)
app.include_router(articles.router)
