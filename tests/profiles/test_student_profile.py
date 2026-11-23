"""US1: a student creates their profile (US5QATest), FR-001…FR-006, research R1/R6."""

import pytest

from .helpers import STUDENT_URL, error_locs, student_body


async def test_a_student_creates_and_reads_their_profile(client, student):
    created = await client.post(STUDENT_URL, json=student_body(), headers=student.headers)

    assert created.status_code == 201
    body = created.json()
    assert body["full_name"] == "Maya Akhmetova"
    assert body["degree"] == "bachelor" and body["study_year"] == 3 and body["graduated"] is False
    assert body["looking_for_fields"] == ["backend", "data_engineering"]
    assert body["projects"] == [] and body["languages"] == []
    assert body["contacts"] == {
        "phone": None, "whatsapp": None, "telegram": None, "linkedin_url": None, "github_url": None, "website_url": None,
    }
    assert body["version"] == 1
    assert body["created_at"].endswith("Z")

    read = await client.get(STUDENT_URL, headers=student.headers)
    assert read.status_code == 200 and read.json() == body


async def test_one_profile_per_student(client, student):
    await client.post(STUDENT_URL, json=student_body(), headers=student.headers)

    second = await client.post(STUDENT_URL, json=student_body(full_name="Someone Else"), headers=student.headers)

    assert second.status_code == 409
    assert second.json()["detail"]["code"] == "profile_exists"


async def test_no_profile_yet(client, student):
    response = await client.get(STUDENT_URL, headers=student.headers)

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "profile_not_found"


async def test_only_students_have_student_profiles(client, employer):
    assert (await client.get(STUDENT_URL)).status_code == 401
    response = await client.post(STUDENT_URL, json=student_body(), headers=employer.headers)
    assert response.status_code == 403 and response.json()["detail"]["code"] == "wrong_role"


async def test_the_full_profile_round_trips_with_normalised_values(client, student):
    body = student_body(
        gpa="3,456"[:4],  # "3,45": a comma decimal is accepted
        city="almaty",
        about="  Third-year student.  ",
        contacts={
            "phone": "+7 701 123 45 67",
            "whatsapp": "+7 701 123 45 67",
            "telegram": "@maya_akh",
            "linkedin_url": "linkedin.com/in/maya",
            "github_url": "https://github.com/maya-akh",
            "website_url": "",
        },
        projects=[
            {"title": "Campus bot", "description": "Timetable bot", "url": "github.com/maya-akh/bot"},
            {"title": "AQI dashboard"},
        ],
        languages=[{"language": "Kazakh", "level": "native"}, {"language": "English", "level": "intermediate"}],
    )

    saved = (await client.post(STUDENT_URL, json=body, headers=student.headers)).json()

    assert saved["gpa"] == "3.45"
    assert saved["about"] == "Third-year student."
    assert saved["contacts"]["telegram"] == "maya_akh"
    assert saved["contacts"]["linkedin_url"] == "https://linkedin.com/in/maya"
    assert saved["contacts"]["website_url"] is None
    assert [p["title"] for p in saved["projects"]] == ["Campus bot", "AQI dashboard"]
    assert saved["projects"][0]["url"] == "https://github.com/maya-akh/bot"
    assert saved["projects"][1]["description"] is None
    assert saved["languages"] == [
        {"language": "Kazakh", "level": "native"}, {"language": "English", "level": "intermediate"},
    ]


async def test_not_sure_yet_means_no_field_and_graduates_have_no_year(client, student):
    body = student_body(degree="master", study_year=None, graduated=True, looking_for_fields=[])

    saved = await client.post(STUDENT_URL, json=body, headers=student.headers)

    assert saved.status_code == 201
    assert saved.json()["looking_for_fields"] == [] and saved.json()["study_year"] is None


@pytest.mark.parametrize(
    ("overrides", "loc"),
    [
        ({"full_name": "   "}, ("full_name",)),
        ({"full_name": "M"}, ("full_name",)),
        ({"university": ""}, ("university",)),
        ({"major": " "}, ("major",)),
        ({"degree": "specialist"}, ("degree",)),
        ({"study_year": 0}, ("study_year",)),
        ({"study_year": 5}, ("study_year",)),  # Bachelor's is 1–4 years
        ({"degree": "master", "study_year": 3}, ("study_year",)),
        ({"study_year": None}, ("study_year",)),
        ({"graduated": True}, ("study_year",)),  # a graduate has no year of study
        ({"gpa": "4.01"}, ("gpa",)),
        ({"gpa": "-0.1"}, ("gpa",)),
        ({"gpa": "3.456"}, ("gpa",)),
        ({"looking_for_fields": ["backend", "frontend", "mobile", "qa"]}, ("looking_for_fields",)),
        ({"looking_for_fields": ["backend", "backend"]}, ("looking_for_fields",)),
        ({"looking_for_fields": ["data"]}, ("looking_for_fields",)),
        ({"position_types": []}, ("position_types",)),
        ({"about": "x" * 1001}, ("about",)),
        ({"contacts": {"phone": "abc"}}, ("contacts", "phone")),
        ({"contacts": {"whatsapp": "12"}}, ("contacts", "whatsapp")),
        ({"contacts": {"telegram": "@ab"}}, ("contacts", "telegram")),
        ({"contacts": {"github_url": "not a site"}}, ("contacts", "github_url")),
        ({"projects": [{"title": "P"}]}, ("projects", 0, "title")),
        ({"projects": [{"title": "Bot", "url": "ftp://x.kz"}]}, ("projects", 0, "url")),
        ({"projects": [{"title": f"Project {i}"} for i in range(11)]}, ("projects",)),
        ({"languages": [{"language": "English", "level": "fluent"}, {"language": "english", "level": "basic"}]},
         ("languages",)),
        ({"languages": [{"language": f"Lang {i}", "level": "basic"} for i in range(11)]}, ("languages",)),
    ],
)
async def test_invalid_data_is_refused_on_its_field(client, student, overrides, loc):
    response = await client.post(STUDENT_URL, json=student_body(**overrides), headers=student.headers)

    assert response.status_code == 422
    assert loc in error_locs(response)
    assert (await client.get(STUDENT_URL, headers=student.headers)).status_code == 404  # nothing saved
