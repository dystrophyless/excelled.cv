import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.concurrency import asynccontextmanager
from fastapi.responses import JSONResponse

from src.auth.router import router as auth_router
from src.config import settings
from src.database import async_engine
from src.users.router import router as users_router

STATE_CHANGING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        yield
    finally:
        await async_engine.dispose()


app = FastAPI(lifespan=lifespan)


def _request_origin(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if origin:
        return origin

    referer = request.headers.get("referer")
    if referer:
        parts = urlsplit(referer)
        if parts.scheme and parts.netloc:
            return f"{parts.scheme}://{parts.netloc}"

    return None


@app.middleware("http")
async def check_origin(request: Request, call_next):
    """CSRF defence next to SameSite=Lax (research R2): state-changing /api requests must come from the SPA."""
    if (
        request.url.path.startswith("/api")
        and request.method in STATE_CHANGING_METHODS
        and _request_origin(request) != settings.frontend_origin
    ):
        return JSONResponse(
            status_code=403,
            content={
                "detail": {
                    "code": "origin_not_allowed",
                    "message": "This request is not allowed from here.",
                }
            },
        )

    return await call_next(request)


app.include_router(
    users_router,
    prefix="/api/users",
    tags=["users"],
)

app.include_router(
    auth_router,
    prefix="/api/auth",
    tags=["auth"],
)


@app.get("/")
async def root():
    return {"message": "Hello World"}
