## Moneyger

Self-onboarding guide for new contributors. For deep product/architecture notes, see `.docs/overview.md`. For container setup details, see `.docs/mny-1_project-setup.md`.

### What is this?
- Rails 8 monolith with Hotwire (Turbo + Stimulus)
- PostgreSQL 16
- Solid Queue (jobs) and Solid Cache/Cable (production-ready)
- PWA-first budgeting app, inspired by zero-based budgeting personal finance 

### Quickstart (Docker Compose)
1) Prereqs: Docker Engine 24+ and Compose plugin (`docker compose`).
2) Create env file from the example and set secrets:
```bash
cp example.env .env
# edit .env → set RAILS_MASTER_KEY and a strong MONEYGER_DATABASE_PASSWORD
```
3) Build and run:
```bash
docker compose up -d --build
```
4) Verify:
```bash
docker compose ps
curl -fsS http://localhost:3000/up && echo OK
```
Note: There’s no default homepage yet. Use `/up` for health. Add a root route when building UI (see Troubleshooting).

### Common commands
```bash
# Logs
docker compose logs -f web
docker compose logs -f db

# Console / DB
docker compose exec web ./bin/rails console
docker compose exec web ./bin/rails dbconsole

# Migrations
docker compose exec web ./bin/rails db:migrate

# Rebuild app image (after Gemfile/asset pipeline changes)
docker compose build web

# Stop (keep volumes) / wipe (remove volumes)
docker compose down
docker compose down -v   # DANGER: deletes data
```

### Environment
- Secrets live in `.env` (gitignored). Template: `example.env`.
- Required:
  - `RAILS_MASTER_KEY` → matches `config/master.key`
  - `MONEYGER_DATABASE_PASSWORD` → used by the Postgres container
- Useful defaults already set in compose: `PORT=3000`, `RAILS_LOG_TO_STDOUT=1`, `RAILS_SERVE_STATIC_FILES=1`, `SOLID_QUEUE_IN_PUMA=1`.

### Project structure (high level)
- `app/` Rails MVC + assets (esbuild, Tailwind CLI)
- `config/` Rails, Puma, database, queue/cache/cable
- `docker-compose.yml` services for `web` and `db`
- `docker/postgres/init.sql` creates the 4 production DBs
- `.docs/overview.md` product/architecture overview
- `.docs/mny-1_project-setup.md` compose setup & operations

### Testing
- Placeholder (Rails 8 default test setup). Typical flows:
```bash
docker compose exec web ./bin/rails test
```
Add system/request/model specs around budgeting math and key flows (see `.docs/overview.md` → Testing Strategy).

### Troubleshooting
- 404 on `/`:
  - Expected: no root route yet. Health at `/up` should return 200.
  - To add a quick root page:
    ```ruby
    # config/routes.rb
    Rails.application.routes.draw do
      get "up" => "rails/health#show"
      root to: redirect("/up") # or map to your controller#index when ready
    end
    ```
- DB auth errors on first boot:
  - Ensure `.env` has `MONEYGER_DATABASE_PASSWORD` and you restarted: `docker compose down && docker compose up -d`
- Credentials error:
  - Ensure `.env` has `RAILS_MASTER_KEY` matching `config/master.key`

### Contributing
- Stick to Rails conventions; prefer built-ins over extra gems.
- Small, focused PRs with a brief test plan.
- Keep secrets out of source; `.env` is gitignored by default (`/.env*`).

### References
- `.docs/overview.md` — product scope, data model, architecture
- `.docs/mny-1_project-setup.md` — compose, ops, and PR template for setup
