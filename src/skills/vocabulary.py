"""Skills the CV extraction (US-17) looks for, with the other ways people write them.

One entry per skill: `name` is how it is stored and shown, `terms` are the spellings searched for in the text (lower
case unless `exact_case`). Names that are also ordinary words ("Excel", "Swift", "Go") are matched only in the one
form that means the skill. Precision comes first: the student reviews the result (US-18), but a long list of wrong
skills is tiring to clean up.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Entry:
    name: str
    terms: tuple[str, ...]
    exact_case: bool = False


def _e(name: str, *aliases: str, exact: bool = False, name_matches: bool = True) -> Entry:
    terms = ((name if exact else name.lower(),) if name_matches else ()) + tuple(
        alias if exact else alias.lower() for alias in aliases
    )
    return Entry(name=name, terms=terms, exact_case=exact)


ENTRIES: tuple[Entry, ...] = (
    # languages
    _e("Python", "python3"),
    _e("Java"),
    _e("JavaScript", "ecmascript"),
    _e("TypeScript"),
    _e("C++", "cpp"),
    _e("C#", "csharp"),
    _e("Kotlin"),
    _e("Swift", exact=True),
    _e("Go", "golang", name_matches=False),
    _e("Rust"),
    _e("PHP"),
    _e("Ruby", exact=True),
    _e("Scala"),
    _e("R", "r language", "r programming", name_matches=False),
    _e("Dart"),
    _e("Bash", "shell scripting"),
    _e("PowerShell"),
    _e("SQL"),
    _e("MATLAB"),
    # web
    _e("HTML", "html5"),
    _e("CSS", "css3"),
    _e("Sass", "scss"),
    _e("React", "reactjs", "react.js"),
    _e("Next.js", "nextjs"),
    _e("Vue.js", "vue", "vuejs"),
    _e("Angular", "angularjs"),
    _e("Svelte"),
    _e("Node.js", "nodejs"),
    _e("Express.js", "expressjs"),
    _e("jQuery"),
    _e("Tailwind CSS", "tailwind"),
    _e("Bootstrap"),
    _e("Redux"),
    _e("Webpack"),
    _e("Vite"),
    # backend
    _e("Django"),
    _e("Flask"),
    _e("FastAPI"),
    _e("Spring Boot"),
    _e(".NET", "dotnet", ".net core", "asp.net"),
    _e("Laravel"),
    _e("Ruby on Rails", "rails"),
    _e("NestJS"),
    _e("GraphQL"),
    _e("REST API", "rest apis", "restful", "restful api", "restful apis"),
    _e("gRPC"),
    _e("Microservices"),
    # data
    _e("PostgreSQL", "postgres"),
    _e("MySQL"),
    _e("SQLite"),
    _e("MongoDB"),
    _e("Redis"),
    _e("Elasticsearch"),
    _e("Microsoft SQL Server", "ms sql", "mssql", "sql server"),
    _e("Kafka"),
    _e("RabbitMQ"),
    _e("Apache Spark", "pyspark"),
    _e("Airflow"),
    _e("dbt"),
    _e("Hadoop"),
    _e("Power BI", "powerbi"),
    _e("Tableau"),
    _e("Excel", exact=True),
    _e("Pandas"),
    _e("NumPy"),
    _e("Matplotlib"),
    _e("scikit-learn", "sklearn", "scikit learn"),
    _e("TensorFlow"),
    _e("PyTorch"),
    _e("Keras"),
    _e("OpenCV"),
    _e("Machine Learning"),
    _e("Deep Learning"),
    _e("NLP", "natural language processing"),
    # devops
    _e("Docker"),
    _e("Kubernetes", "k8s"),
    _e("Git"),
    _e("GitHub"),
    _e("GitLab"),
    _e("CI/CD", "ci cd"),
    _e("GitHub Actions"),
    _e("Jenkins"),
    _e("Terraform"),
    _e("Ansible"),
    _e("Linux"),
    _e("Nginx"),
    _e("AWS", "amazon web services"),
    _e("Azure"),
    _e("Google Cloud", "gcp", "google cloud platform"),
    _e("Prometheus"),
    _e("Grafana"),
    # testing
    _e("Selenium"),
    _e("Cypress"),
    _e("Playwright"),
    _e("Postman"),
    _e("Pytest"),
    _e("JUnit"),
    _e("Jira"),
    _e("Test Automation", "automated testing"),
    _e("Manual Testing"),
    _e("Unit Testing", "unit tests"),
    # mobile and games
    _e("Flutter"),
    _e("React Native"),
    _e("Android"),
    _e("iOS"),
    _e("SwiftUI"),
    _e("Jetpack Compose"),
    _e("Firebase"),
    _e("Unity", exact=True),
    # design and product
    _e("Figma"),
    _e("Adobe Photoshop", "photoshop"),
    _e("Adobe Illustrator", "illustrator"),
    _e("UI/UX Design", "ui/ux", "ux/ui", "ui ux", "ux design", "ui design"),
    _e("Wireframing", "wireframes"),
    _e("Agile"),
    _e("Scrum"),
    _e("Kanban"),
    _e("Product Management"),
    # security
    _e("Cybersecurity", "cyber security", "information security"),
    _e("Penetration Testing", "pentest", "pentesting"),
    _e("OWASP"),
    _e("Wireshark"),
    _e("Burp Suite"),
    _e("Network Security"),
    # fundamentals
    _e("Data Structures"),
    _e("Algorithms"),
    _e("OOP", "object-oriented programming", "object oriented programming"),
    _e("Design Patterns"),
    _e("TDD", "test-driven development"),
    # soft skills
    _e("Communication", "communication skills"),
    _e("Teamwork", "team work", "team player"),
    _e("Leadership"),
    _e("Problem Solving", "problem-solving"),
    _e("Time Management"),
    _e("Critical Thinking"),
    _e("Public Speaking", "presentation skills"),
    _e("Adaptability"),
    _e("Negotiation"),
)
