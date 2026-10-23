# Digital Fixture Generator

Football competition planning app with a Next.js frontend and a Go REST API. The Go service owns authentication, PostgreSQL access, fixture generation, scheduling, conflict checks, and audit history. The Next.js app forwards its `/api/*` routes to Go.

## Requirements

- Node.js and npm for the web app
- Go 1.23 or later for the API
- PostgreSQL 14 or later

## Configuration

Create `.env.local` in this directory:

```env
GO_API_URL=http://127.0.0.1:8080
```

Configure the Go API environment in its process manager:

```env
DATABASE_URL=postgres://user:password@localhost:5432/fixture_generator?sslmode=disable
AUTH_SECRET=replace-with-a-long-random-secret-at-least-32-characters
API_ADDR=:8080
COOKIE_SECURE=false
```

For production set `COOKIE_SECURE=true`, use HTTPS, and store secrets in your host's secret manager.

## Fresh database setup

Create an empty PostgreSQL database, then apply the schema once:

```bash
psql "$DATABASE_URL" -f backend/migrations/001_schema.sql
```

Set `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` in the Go process environment. Choose a unique administrator password of at least 12 characters. From `backend/`, seed the administrator:

```bash
go run . seed-admin
```

## Run locally

In one terminal, from `backend/`:

```bash
go mod download
go run .
```

In another terminal, from the project root:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The Go health endpoint is <http://localhost:8080/health>.

## Backend layout

- `backend/main.go` starts the Go HTTP service and PostgreSQL pool.
- `backend/server.go` implements signed, HttpOnly cookie sessions.
- `backend/api.go` handles competitions, reusable teams and venues, memberships, and audit history.
- `backend/fixtures.go` handles fixture generation, edits, conflicts, postponement/rescheduling, and automatic scheduling.
- `backend/migrations/001_schema.sql` creates the schema for a fresh database.
- `src/lib/goProxy.ts` forwards Next.js API requests to Go.
