# TaskFlow

Workspaces, projects and team productivity platform.

Stack: Quarkus (Java 17) backend + React/TypeScript (Vite) frontend +
PostgreSQL.

## Layout

- `backend/` — Quarkus REST API (Flyway migrations, JWT auth)
- `frontend/` — React SPA (Vite)
- `docker-compose.yml` — local Postgres
- `specs/` — spec-driven delivery artifacts (see `specs/workspaces-accounts/`)

## Run locally

```bash
# 1. database
docker compose up -d db

# 2. backend  (http://localhost:8080)
cd backend
# needs JDK 17 + Maven 3.9+
mvn quarkus:dev

# 3. frontend (http://localhost:5173, proxies /auth + /workspaces to :8080)
cd frontend
npm install
npm run dev
```

## Verify

```bash
cd backend && mvn test      # REST-assured suite (needs compose db up)
cd frontend && npm run build
```

Tests use the `taskflow_test` database on the same Postgres instance —
create it once: `docker exec taskflow-db-1 psql -U taskflow -d taskflow -c "CREATE DATABASE taskflow_test;"`

## Auth notes

- JWT (RS256) issued by `POST /auth/login`; keys are dev keys in
  `backend/src/main/resources/keys/` — replace for any real deployment.
- Emails (verification, invites, password reset) are sent via
  `quarkus-mailer`; without SMTP they are logged server-side.
