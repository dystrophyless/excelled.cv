FROM ghcr.io/astral-sh/uv:0.10.4 AS uv
FROM caddy:2.11.9-alpine AS caddy

FROM python:3.13-slim-bookworm
WORKDIR /app
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    XDG_DATA_HOME=/data \
    XDG_CONFIG_HOME=/config
COPY --from=uv /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev --no-install-project
COPY src/ src/
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY deploy/Caddyfile /etc/caddy/Caddyfile
RUN mkdir -p /data /config && chown -R 10001:10001 /data /config
USER 10001:10001
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
