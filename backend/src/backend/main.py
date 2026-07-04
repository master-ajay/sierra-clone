from fastapi import FastAPI

app = FastAPI(title="Sierra Platform Backend")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
