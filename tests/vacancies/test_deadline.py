from datetime import UTC, date, datetime, timedelta

from src.vacancies import rules
from src.vacancies.models import VacancyStatus

from .helpers import URL, set_status

S = VacancyStatus
DEADLINE_DAY = date(2026, 12, 10)
# Applications stop at 00:00 on 11 Dec in UTC+5, i.e. 19:00 UTC on the 10th.
DEADLINE = datetime(2026, 12, 10, 19, 0, tzinfo=UTC)


async def test_an_open_vacancy_closes_itself_when_its_deadline_passes(client, employer, make_vacancy, freeze_now):
    vacancy = await make_vacancy(employer, status=S.open, apply_by=DEADLINE_DAY)
    assert vacancy.closes_at == DEADLINE

    freeze_now(DEADLINE - timedelta(seconds=1))
    before = (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).json()
    freeze_now(DEADLINE)
    after = (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).json()

    assert before["status"] == "open"
    assert after["status"] == "closed"
    assert after["closed_by"] == "deadline"
    assert datetime.fromisoformat(after["closed_at"]) == DEADLINE  # the deadline, not the time of the visit
    assert after["version"] == before["version"] + 1


async def test_a_paused_vacancy_closes_at_its_deadline_too(client, employer, make_vacancy, freeze_now):
    vacancy = await make_vacancy(employer, status=S.paused, apply_by=DEADLINE_DAY)

    freeze_now(DEADLINE + timedelta(days=3))
    body = (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).json()

    assert body["status"] == "closed" and body["closed_by"] == "deadline"


async def test_the_list_and_its_counts_show_deadline_closures(client, employer, make_vacancy, freeze_now):
    await make_vacancy(employer, title="Ends first", status=S.open, apply_by=DEADLINE_DAY)
    await make_vacancy(employer, title="Ends later", status=S.open, apply_by=date(2027, 3, 1))

    freeze_now(DEADLINE + timedelta(hours=1))
    body = (await client.get(URL, headers=employer.headers)).json()

    by_title = {item["title"]: item["status"] for item in body["items"]}
    assert by_title == {"Ends first": "closed", "Ends later": "open"}
    assert body["counts"] == {"all": 2, "draft": 0, "open": 1, "paused": 0, "closed": 1}


async def test_a_draft_is_never_closed_by_a_deadline(client, employer, make_vacancy, freeze_now):
    vacancy = await make_vacancy(employer, status=S.draft, apply_by=DEADLINE_DAY)

    freeze_now(DEADLINE + timedelta(days=30))
    body = (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).json()

    assert body["status"] == "draft" and body["closed_by"] is None


async def test_a_vacancy_with_time_left_is_untouched(client, employer, make_vacancy, freeze_now):
    vacancy = await make_vacancy(employer, status=S.open, apply_by=DEADLINE_DAY)

    freeze_now(DEADLINE - timedelta(days=2))
    body = (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).json()

    assert body["status"] == "open" and body["version"] == vacancy.version


async def test_a_paused_vacancy_past_its_deadline_cannot_be_resumed(client, employer, make_vacancy, freeze_now):
    vacancy = await make_vacancy(employer, status=S.paused, apply_by=DEADLINE_DAY)

    freeze_now(DEADLINE + timedelta(minutes=5))
    response = await set_status(client, employer, vacancy.id, "resume", vacancy.version)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "invalid_transition"
    assert detail["status"] == "closed"


async def test_applications_stop_at_the_exact_deadline_even_before_any_sweep(employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open, apply_by=DEADLINE_DAY)

    assert rules.accepting_applications(vacancy, DEADLINE - timedelta(seconds=1))
    assert not rules.accepting_applications(vacancy, DEADLINE)
    assert not rules.accepting_applications(vacancy, DEADLINE + timedelta(seconds=1))
