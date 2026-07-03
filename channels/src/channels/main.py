from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from channels.config import get_settings
from channels.database import run_migrations
from channels.errors import error_response
from channels.routes import channels, chat, system, widget


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    run_migrations(settings.channels_db_path)
    yield


app = FastAPI(title="Channels", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response("validation_error", str(exc.errors()[0]["msg"]), 422, {"errors": exc.errors()})


app.include_router(system.router)
app.include_router(channels.router)
app.include_router(chat.router)
app.include_router(widget.router)
