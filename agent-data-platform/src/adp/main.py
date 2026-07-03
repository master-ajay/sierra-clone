from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from adp.config import get_settings
from adp.database import run_migrations
from adp.errors import error_response
from adp.routes import system


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    run_migrations(settings.adp_db_path)
    yield


app = FastAPI(title="Agent Data Platform", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response("validation_error", str(exc.errors()[0]["msg"]), 422, {"errors": exc.errors()})


app.include_router(system.router)
