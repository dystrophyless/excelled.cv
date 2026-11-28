"""Finding skills in CV text (US-17): whole words only, the built-in vocabulary plus the employers' skills."""

from src.skills.extract import find_skills
from src.skills.normalize import skill_key
from src.skills.vocabulary import ENTRIES


def names(text: str, extra=()) -> list[str]:
    return [found.name for found in find_skills(text, extra)]


def test_plain_skills_are_found():
    assert set(names("Skills: Python, SQL and Docker.")) == {"Python", "SQL", "Docker"}


def test_nothing_is_found_in_text_without_skills():
    assert names("I like hiking, chess and long walks.") == []
    assert names("") == []


def test_a_term_is_found_only_as_a_whole_word():
    assert names("JavaScript and MySQL and GitHub") == ["JavaScript", "MySQL", "GitHub"]  # not Java, SQL, Git
    assert "Java" not in names("javascript")
    assert "SQL" not in names("mysql")
    assert "Git" not in names("github")
    assert "Git" not in names("digit")


def test_skills_with_symbols_are_found():
    assert set(names("Experience with C++, C# and Node.js, plus CI/CD.")) == {"C++", "C#", "Node.js", "CI/CD"}
    assert "C++" in names("(C++)")
    assert ".NET" in names("Built services with .NET and ASP.NET")


def test_other_spellings_give_the_same_skill():
    assert names("k8s") == ["Kubernetes"]
    assert names("Postgres") == ["PostgreSQL"]
    assert names("Python3") == ["Python"]
    assert names("amazon web services") == ["AWS"]
    assert names("RESTful APIs") == ["REST API"]
    assert names("sklearn") == ["scikit-learn"]


def test_the_longest_spelling_wins():
    assert names("React Native apps") == ["React Native"]
    assert names("GitHub Actions pipelines") == ["GitHub Actions"]
    assert set(names("React and React Native")) == {"React", "React Native"}


def test_letter_case_does_not_matter_for_ordinary_skills():
    assert set(names("PYTHON, sql, DoCkEr")) == {"Python", "SQL", "Docker"}


def test_words_that_are_also_ordinary_words_need_the_right_form():
    assert names("I excel at chess and swift delivery, with a ruby ring and unity of purpose.") == []
    assert set(names("Excel, Swift, Ruby and Unity")) == {"Excel", "Swift", "Ruby", "Unity"}
    assert names("Let's go to the market. Go for it.") == []
    assert names("Backend in Golang") == ["Go"]
    assert names("R&D team, plan A or B") == []
    assert names("Statistics with R programming") == ["R"]


def test_a_skill_inside_a_longer_skill_is_not_counted_twice():
    assert names("Ruby on Rails apps") == ["Ruby on Rails"]
    assert [(f.name, f.count) for f in find_skills("Ruby on Rails, and Ruby scripts")] == [("Ruby on Rails", 1), ("Ruby", 1)]


def test_soft_skills_are_found_too():
    text = "Strong communication skills, teamwork and leadership; good at problem-solving."
    assert set(names(text)) == {"Communication", "Teamwork", "Leadership", "Problem Solving"}


def test_whitespace_inside_a_term_is_flexible():
    assert names("Machine\n  Learning") == ["Machine Learning"]


def test_skills_come_out_most_mentioned_first_then_in_order_of_appearance():
    text = "SQL. Docker. Python. Python. Docker. Python. Git."
    assert [(f.name, f.count) for f in find_skills(text)] == [("Python", 3), ("Docker", 2), ("SQL", 1), ("Git", 1)]


def test_employer_skills_are_found_too():
    text = "Worked with Figma prototypes and Terraform, plus Communication."
    assert set(names(text, ["Communication", "Figma"])) == {"Figma", "Terraform", "Communication"}


def test_an_employer_skill_the_vocabulary_has_is_not_matched_twice():
    assert names("Python", ["python", "PYTHON"]) == ["Python"]


def test_short_employer_skills_are_ignored():
    assert names("Go to the shop; Ab and Xy", ["Go", "Ab", "Xy"]) == []


def test_employer_skills_are_matched_as_whole_words_too():
    assert names("A teamworker", ["Teamwork"]) == []
    assert names("Strong teamwork.", ["Teamwork"]) == ["Teamwork"]


def test_a_very_long_text_is_fast_enough():
    import time

    text = ("Python and SQL with a lot of other words here. " * 5000)[:200_000]
    started = time.perf_counter()
    result = find_skills(text, [f"Custom skill {n}" for n in range(500)])
    assert time.perf_counter() - started < 2
    assert [f.name for f in result] == ["Python", "SQL"]


# ---- the vocabulary itself ---------------------------------------------------------------------------------


def test_every_entry_has_a_term_and_a_storable_name():
    for entry in ENTRIES:
        assert entry.terms, entry.name
        assert 0 < len(entry.name) <= 40, entry.name
        assert all(term and term == term.strip() for term in entry.terms), entry.name


def test_no_two_entries_share_a_name_or_a_term():
    keys = [skill_key(entry.name) for entry in ENTRIES]
    assert len(keys) == len(set(keys))
    seen: dict[str, str] = {}
    for entry in ENTRIES:
        for term in entry.terms:
            token = term if entry.exact_case else term.lower()
            assert token not in seen, f"{term!r} is in both {seen[token]} and {entry.name}"
            seen[token] = entry.name
