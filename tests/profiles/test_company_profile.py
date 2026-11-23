"""US2: an employer creates the company profile (US6QATest), FR-007…FR-010."""

import pytest

from .helpers import COMPANY_URL, error_locs, company_body


async def test_an_employer_creates_and_reads_the_company_profile(client, employer_without_profile):
    headers = employer_without_profile.headers

    created = await client.post(COMPANY_URL, json=company_body(website="kaspi.kz", city="almaty"), headers=headers)

    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Kaspi.kz" and body["size"] == "1000_plus" and body["industry"] == "finance"
    assert body["website"] == "https://kaspi.kz"
    assert body["description"] is None and body["version"] == 1
    assert (await client.get(COMPANY_URL, headers=headers)).json() == body


async def test_one_company_profile_per_employer(client, employer):
    second = await client.post(COMPANY_URL, json=company_body(), headers=employer.headers)

    assert second.status_code == 409 and second.json()["detail"]["code"] == "profile_exists"


async def test_no_company_profile_yet(client, employer_without_profile):
    response = await client.get(COMPANY_URL, headers=employer_without_profile.headers)

    assert response.status_code == 404 and response.json()["detail"]["code"] == "profile_not_found"


async def test_only_employers_have_company_profiles(client, student):
    response = await client.post(COMPANY_URL, json=company_body(), headers=student.headers)

    assert response.status_code == 403 and response.json()["detail"]["code"] == "wrong_role"


@pytest.mark.parametrize(
    ("overrides", "loc"),
    [
        ({"name": "  "}, ("name",)),
        ({"name": "K"}, ("name",)),
        ({"industry": "farming"}, ("industry",)),
        ({"size": "huge"}, ("size",)),
        ({"website": "not a site"}, ("website",)),
        ({"description": "x" * 1001}, ("description",)),
    ],
)
async def test_invalid_company_data_is_refused_on_its_field(client, employer_without_profile, overrides, loc):
    headers = employer_without_profile.headers

    response = await client.post(COMPANY_URL, json=company_body(**overrides), headers=headers)

    assert response.status_code == 422
    assert loc in error_locs(response)
    assert (await client.get(COMPANY_URL, headers=headers)).status_code == 404
