STUDENT_URL = "/api/student/profile"
COMPANY_URL = "/api/company/profile"


def student_body(**overrides) -> dict:
    body = {
        "full_name": "Maya Akhmetova",
        "university": "Suleyman Demirel University",
        "degree": "bachelor",
        "major": "Computer Science",
        "study_year": 3,
        "graduated": False,
        "looking_for_fields": ["backend", "data_engineering"],
        "position_types": ["internship"],
    }
    return body | overrides


def company_body(**overrides) -> dict:
    body = {"name": "Kaspi.kz", "industry": "finance", "size": "1000_plus"}
    return body | overrides


def error_locs(response) -> list[tuple]:
    """The `loc` of every 422 error, without the leading "body"."""
    return [tuple(item["loc"][1:]) for item in response.json()["detail"]]
