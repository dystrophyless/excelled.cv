"""The research type (spec FR-013, FR-014): catalog, vacancies and student profiles."""

from tests.profiles.helpers import student_body
from tests.vacancies.helpers import complete as vacancy_body

VACANCIES = "/api/company/vacancies"
PROFILE = "/api/student/profile"


async def test_the_catalog_lists_research_last(client):
    types = (await client.get("/api/catalog")).json()["types"]
    assert types[-1] == {"value": "research", "label": "Research"}


async def test_an_employer_publishes_a_research_opportunity(client, employer):
    created = await client.post(VACANCIES, json=vacancy_body(type="research", publish=True), headers=employer.headers)
    assert created.status_code == 201
    assert (created.json()["type"], created.json()["status"]) == ("research", "open")


async def test_a_vacancy_changes_to_and_from_research(client, employer):
    created = (await client.post(VACANCIES, json=vacancy_body(publish=True), headers=employer.headers)).json()
    for version, type_ in ((1, "research"), (2, "full_time")):
        updated = await client.put(
            f"{VACANCIES}/{created['id']}", json=vacancy_body(type=type_, version=version), headers=employer.headers
        )
        assert updated.status_code == 200
        assert updated.json()["type"] == type_


async def test_an_incomplete_research_opportunity_is_not_published(client, employer):
    refused = await client.post(
        VACANCIES, json=vacancy_body(type="research", description=None, publish=True), headers=employer.headers
    )
    assert refused.status_code == 422
    assert refused.json()["detail"]["code"] == "incomplete"
    assert refused.json()["detail"]["fields"] == ["description"]


async def test_a_student_can_look_for_every_position_type(client, student):
    every = ["internship", "full_time", "part_time", "research"]
    created = await client.post(PROFILE, json=student_body(position_types=every), headers=student.headers)
    assert created.status_code == 201
    assert created.json()["position_types"] == every


async def test_position_types_are_distinct(client, student):
    refused = await client.post(
        PROFILE, json=student_body(position_types=["research", "research"]), headers=student.headers
    )
    assert refused.status_code == 422
