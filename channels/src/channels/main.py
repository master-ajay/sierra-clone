import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from channels.config import get_settings
from channels.database import run_migrations
from channels.errors import error_response
from channels.routes import channels, chat, system, widget

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    run_migrations(settings.channels_db_path)
    logger.info("channels_started db=%s", settings.channels_db_path)
    yield


app = FastAPI(title="Channels", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    safe_errors = [{"loc": e["loc"], "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    logger.warning("validation_error path=%s errors=%s", request.url.path, safe_errors)
    return error_response("validation_error", safe_errors[0]["msg"], 422, {"errors": safe_errors})


app.include_router(system.router)
app.include_router(channels.router)
app.include_router(chat.router)
app.include_router(widget.router)
