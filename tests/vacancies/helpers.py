from datetime import UTC, datetime, timedelta

from src.vacancies.deadlines import today_kz

URL = "/api/company/vacancies"


def day(offset: int):
    """A date `offset` days from today in Kazakhstan time (UTC+5)."""
    return today_kz(datetime.now(UTC)) + timedelta(days=offset)


def complete(**overrides) -> dict:
    body = {
        "title": "Backend Intern (Python)",
        "type": "internship",
        "field": "backend",
        "city": "almaty",
        "format": "hybrid",
        "description": "Join the Payments team.",
        "duration": "3 months",
        "salary": "200 000 ₸ / month",
        "apply_by": day(14).isoformat(),
        "required_skills": ["Python", "SQL"],
        "nice_skills": ["Docker"],
    }
    return body | overrides


async def create(client, employer, **body):
    return await client.post(URL, json=body, headers=employer.headers)


async def set_status(client, employer, vacancy_id, action, version, **extra):
    return await client.post(
        f"{URL}/{vacancy_id}/status",
        json={"action": action, "version": version, **extra},
        headers=employer.headers,
    )
