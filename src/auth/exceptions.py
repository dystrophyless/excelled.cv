from fastapi import HTTPException


class EmailDeliveryError(Exception):
    """Raised when an email cannot be delivered."""


def api_error(status_code: int, code: str, message: str, **extra) -> HTTPException:
    """Error body the SPA can act on: {"detail": {"code", "message", ...extra}} (contracts/auth-api.md)."""
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message, **extra},
    )
