## Moneyger: Project Setup via Docker Compose (MNY-1)

This document captures the implementation details to run the entire Rails app with Docker Compose across any machine with Docker, without bespoke local setup.

### Goals
- Run the Rails app and PostgreSQL with a single `docker compose up`.
- Minimize host dependencies (only Docker and Compose).
- Persist app data (Active Storage) and Postgres data via named volumes.
- Keep to the Rails way and use the existing production-optimized `Dockerfile`.

### Stack Summary
- Rails 8, Puma, Solid Queue, Solid Cable (production)
- PostgreSQL 16 (four production DBs: primary, cache, queue, cable)
- Assets precompiled in the image (via `Dockerfile`)

### New/Updated Files
- `docker-compose.yml`: Defines `web` and `db` services.
- `docker/postgres/init.sql`: Creates the four production DBs (ownership defaults to the role created by the Postgres image using `POSTGRES_USER`).
- `example.env` (copy to `.env`): Template for required secrets and DB password.

### Prerequisites
- Docker Engine 24+ and Docker Compose plugin (`docker compose` CLI).

### Environment Variables
Provide these via a `.env` file in the repo root (copy from `example.env`).
- `RAILS_MASTER_KEY`: Rails credentials master key.
- `MONEYGER_DATABASE_PASSWORD`: Password assigned to the `moneyger` Postgres role.
- Optional overrides (usually fine as-is):
  - `PORT` (defaults to `3000`), `RAILS_LOG_TO_STDOUT`, `RAILS_SERVE_STATIC_FILES`, `SOLID_QUEUE_IN_PUMA`.

### Service Topology
1) `db` (Postgres 16):
   - Postgres image creates role from `POSTGRES_USER`/`POSTGRES_PASSWORD`.
   - `init.sql` creates DBs: `moneyger_production`, `moneyger_production_cache`, `moneyger_production_queue`, `moneyger_production_cable`.
   - Exposes a healthcheck using `pg_isready`.
   - Persists data to named volume `db_data`.

2) `web` (Rails):
   - Builds from the repo `Dockerfile` (production-optimized). Assets are precompiled during build.
   - Binds on `0.0.0.0:$PORT` (default 3000) and exposes it to the host.
   - `bin/docker-entrypoint` runs `db:prepare` automatically when starting the server.
   - Runs Solid Queue in-Puma via `SOLID_QUEUE_IN_PUMA=1`.
   - Stores Active Storage files on named volume `storage` mounted at `/rails/storage`.
   - Healthcheck targets Rails `/up` (Rails default health endpoint).

### First Run
1) Copy the env template and fill in values:
```bash
cp example.env .env
# Set RAILS_MASTER_KEY and (optionally) change MONEYGER_DATABASE_PASSWORD
```

2) Build and start:
```bash
docker compose up -d --build
```

3) Verify health:
```bash
docker compose ps
docker compose logs -f web
# Open http://localhost:3000
```

### Common Commands
- Rebuild app image after code changes in image steps:
```bash
docker compose build web
```

- View logs:
```bash
docker compose logs -f db
docker compose logs -f web
```

- Rails console / dbconsole / migrations:
```bash
docker compose exec web ./bin/rails console
docker compose exec web ./bin/rails dbconsole
docker compose exec web ./bin/rails db:migrate
```

- Open a psql shell:
```bash
docker compose exec -e PGPASSWORD=$MONEYGER_DATABASE_PASSWORD db \
  psql -h localhost -U moneyger -d moneyger_production
```

- Stop and remove containers (volumes persist):
```bash
docker compose down
```

- Stop and remove containers and volumes (DANGER – wipes data):
```bash
docker compose down -v
```

### Data Persistence
- Postgres data: named volume `db_data`.
- Active Storage files: named volume `storage` mounted at `/rails/storage`.

Backups example (quick-and-dirty):
```bash
docker compose exec -e PGPASSWORD=$MONEYGER_DATABASE_PASSWORD db \
  pg_dump -U moneyger -d moneyger_production > backup.sql
```

### Security Notes
- Do not commit `.env`. Rotate `MONEYGER_DATABASE_PASSWORD` if shared.
- Consider moving secrets to a secret manager in production (e.g., Kamal + env).
- The `web` container runs as an unprivileged user (`rails`, uid 1000) as per `Dockerfile`.

### Troubleshooting
- DB isn’t ready / connection refused:
  - `docker compose logs db` and confirm healthcheck passes.
  - Ensure `.env` contains `MONEYGER_DATABASE_PASSWORD` matching the Postgres container’s `POSTGRES_PASSWORD`.

- 500 on boot due to credentials:
  - Set `RAILS_MASTER_KEY` in `.env` to match `config/master.key`.

- Missing assets or JS/CSS changes not visible:
  - The image precompiles assets at build time; rebuild (`docker compose build web`).

### Development Overrides (Optional)
For a dev experience with live JS/CSS rebuilds and code mounts, add a `docker-compose.override.yml` that:
- sets `RAILS_ENV=development`, mounts the app dir, and runs `Procfile.dev` processes.
- This is deliberately omitted here to keep the default experience stable and production-like.

### Rationale
- Use production `Dockerfile` to match deployable behavior and avoid drift.
- Use libpq env (`PGHOST`, `PGUSER`, `PGPASSWORD`) so Rails picks up Postgres without editing `database.yml`.
- Provision all four production DBs to support Solid Cache, Solid Queue, and Solid Cable in production mode.


---

## PR Description (MNY-1)

### Summary
Introduce a Docker Compose setup to run Moneyger (Rails + Postgres) consistently across environments with a single command, without hardcoding credentials in source.

### Changes
- Added `docker-compose.yml` with `web` and `db` services, healthchecks, and volumes
- Added `docker/postgres/init.sql` to create the four production databases (role is created by the Postgres image using env)
- Added `example.env` (to be copied as `.env`) for `RAILS_MASTER_KEY` and DB password
- Wrote `.docs/mny-1_project-setup.md` documenting setup, usage, and troubleshooting

### Test Plan
1) Environment
```bash
cp example.env .env
# Set RAILS_MASTER_KEY and confirm DB password matches compose (POSTGRES_PASSWORD)
```

2) Build and run
```bash
docker compose up -d --build
```

3) Verify
- `docker compose ps` shows `db` healthy and `web` running
- `docker compose logs -f web` shows successful boot and `/up` returns 200
- Visit `http://localhost:3000` to confirm the app is reachable

4) Console / migrations (spot-check)
```bash
docker compose exec web ./bin/rails console -e production
docker compose exec web ./bin/rails db:migrate:status
```

### Risk / Impact
- DB migration: [x] none  [ ] yes
- Data/backfill: [x] none  [ ] yes
- Feature flag: none
- Rollback: delete `docker-compose.yml`, `docker/postgres/init.sql`, and `example.env` (no schema changes)

### Links
- Ticket: MNY-1 (Project Setup via Docker Compose)

### Screenshots
N/A