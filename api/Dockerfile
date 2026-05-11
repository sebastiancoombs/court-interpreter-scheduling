# bcgov FastAPI backend — single-stage Python image. Runs alembic
# migrations on container start, then hands off to uvicorn binding on
# the platform-assigned PORT.
#
# Build: `docker build -f api/Dockerfile -t cis-api api/`
# Run:   `docker run -p 8080:8080 --env-file .env cis-api`

FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

# psycopg2 + lxml need build-essential + libpq-dev + libxml2 headers.
# Drop apt caches in the same RUN to keep the image lean.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev libxml2-dev libxslt1-dev \
        ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 8080

# alembic upgrade head on start so the schema's always at the latest
# revision before uvicorn starts serving. Falls through cleanly on
# fresh databases (creates the alembic_version table) and is a no-op
# on already-migrated ones.
CMD sh -c "alembic upgrade head && exec uvicorn app:app --host 0.0.0.0 --port ${PORT}"
