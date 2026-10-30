import resend
from resend.exceptions import InvalidApiKeyError, ResendError

from src.auth.exceptions import EmailDeliveryError
from src.config import settings

resend.api_key = settings.resend_api_key.get_secret_value()


async def _send_email(to: str, subject: str, html: str) -> None:
    try:
        await resend.Emails.send_async(
            {
                "from": settings.resend_from_email,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
    except InvalidApiKeyError:
        # Incorrect API-key:
        # problem of configuration, not the user's fault
        raise
    except ResendError as exc:
        raise EmailDeliveryError from exc


async def send_password_reset_email(to: str, code: str):
    subject = "Reset your password"
    html = f"""
    <html>
        <body>
            <p>We received a request to reset your password. Use this code to continue:</p>
            <h2>{code}</h2>
            <p>This code will expire in 10 minutes. If you did not ask for it, ignore this email: your password stays the same.</p>
        </body>
    </html>
    """
    await _send_email(to, subject, html)


async def send_verification_email(to: str, code: str):
    subject = "Verify your email"
    html = f"""
    <html>
        <body>
            <p>Thank you for signing up! Please use the following code to verify your email address:</p>
            <h2>{code}</h2>
            <p>This code will expire in 10 minutes.</p>
        </body>
    </html>
    """
    await _send_email(to, subject, html)
