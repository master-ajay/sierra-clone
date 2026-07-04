from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import FastAPI

from adp.main import app as adp_app
from channels.main import app as channels_app
from trust.main import app as trust_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Starlette does not forward a mounted sub-app's lifespan to the parent
    # app automatically, so each mounted product's lifespan_context is
    # entered explicitly here to run its startup (e.g. ADP's and Trust's
    # migrations).
    async with AsyncExitStack() as stack:
        await stack.enter_async_context(adp_app.router.lifespan_context(adp_app))
        await stack.enter_async_context(trust_app.router.lifespan_context(trust_app))
        await stack.enter_async_context(channels_app.router.lifespan_context(channels_app))
        yield


app = FastAPI(title="Sierra Platform Backend", lifespan=lifespan)

app.mount("/adp", adp_app)
app.mount("/trust", trust_app)
app.mount("/channels", channels_app)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
