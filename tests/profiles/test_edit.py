"""US3: editing (US7QATest), FR-011…FR-013, research R1."""

from .helpers import COMPANY_URL, STUDENT_URL, company_body, student_body


async def create_student(client, account, **overrides):
    return (await client.post(STUDENT_URL, json=student_body(**overrides), headers=account.headers)).json()


async def test_a_student_edits_their_profile_and_lists_are_replaced(client, student):
    first = await create_student(
        client, student, projects=[{"title": "Old project"}], languages=[{"language": "Russian", "level": "fluent"}]
    )

    body = student_body(
        study_year=4,
        version=first["version"],
        projects=[{"title": "Campus bot"}, {"title": "AQI dashboard"}],
        languages=[{"language": "English", "level": "intermediate"}],
    )
    response = await client.put(STUDENT_URL, json=body, headers=student.headers)

    assert response.status_code == 200
    saved = response.json()
    assert saved["study_year"] == 4 and saved["version"] == first["version"] + 1
    assert [p["title"] for p in saved["projects"]] == ["Campus bot", "AQI dashboard"]
    assert saved["languages"] == [{"language": "English", "level": "intermediate"}]
    assert (await client.get(STUDENT_URL, headers=student.headers)).json() == saved  # persists after reload


async def test_a_stale_edit_is_refused_with_the_current_profile(client, student):
    first = await create_student(client, student)
    await client.put(STUDENT_URL, json=student_body(full_name="Tab One", version=first["version"]), headers=student.headers)

    stale = await client.put(
        STUDENT_URL, json=student_body(full_name="Tab Two", version=first["version"]), headers=student.headers
    )

    assert stale.status_code == 409
    detail = stale.json()["detail"]
    assert detail["code"] == "version_conflict"
    assert detail["profile"]["full_name"] == "Tab One" and detail["profile"]["version"] == first["version"] + 1


async def test_invalid_changes_keep_the_previous_valid_data(client, student):
    first = await create_student(client, student)

    response = await client.put(
        STUDENT_URL, json=student_body(full_name="", version=first["version"]), headers=student.headers
    )

    assert response.status_code == 422
    assert (await client.get(STUDENT_URL, headers=student.headers)).json() == first


async def test_editing_without_a_profile_is_not_found(client, student):
    response = await client.put(STUDENT_URL, json=student_body(version=1), headers=student.headers)

    assert response.status_code == 404 and response.json()["detail"]["code"] == "profile_not_found"


async def test_each_account_reads_and_changes_only_its_own_profile(client, student, student_with_profile):
    mine = await create_student(client, student, full_name="Maya")

    other = (await client.get(STUDENT_URL, headers=student_with_profile.headers)).json()
    await client.put(
        STUDENT_URL, json=student_body(full_name="Renamed", version=other["version"]), headers=student_with_profile.headers
    )

    assert other["full_name"] != "Maya"
    assert (await client.get(STUDENT_URL, headers=student.headers)).json() == mine


async def test_an_employer_edits_the_company_profile(client, employer, other_employer):
    current = (await client.get(COMPANY_URL, headers=employer.headers)).json()

    response = await client.put(
        COMPANY_URL, json=company_body(name="Kaspi Bank", version=current["version"]), headers=employer.headers
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Kaspi Bank" and response.json()["version"] == current["version"] + 1
    assert (await client.get(COMPANY_URL, headers=other_employer.headers)).json()["name"] == "Other Co"


async def test_a_stale_company_edit_conflicts(client, employer):
    current = (await client.get(COMPANY_URL, headers=employer.headers)).json()
    await client.put(COMPANY_URL, json=company_body(name="First", version=current["version"]), headers=employer.headers)

    stale = await client.put(
        COMPANY_URL, json=company_body(name="Second", version=current["version"]), headers=employer.headers
    )

    assert stale.status_code == 409
    assert stale.json()["detail"]["profile"]["name"] == "First"
