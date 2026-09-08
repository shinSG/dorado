# Repository Guidelines

## Project Structure & Module Organization

Dorado is a small full-stack Rust learning platform. `backend/app/` contains the FastAPI application: routes live in `api/`, SQLAlchemy models in `models/`, Pydantic contracts in `schemas/`, infrastructure in `core/`, and execution/content logic in `services/`. Database seeding belongs in `backend/scripts/seed.py`. The React 19 + TypeScript client is under `frontend/src/`; keep route-level views in `pages/`, reusable UI in `components/`, and HTTP calls/types in `api.ts`. Course material is stored as numbered Markdown files in `content/chapters/`. Sandbox image changes belong in `docker/sandbox/`.

## Build, Test, and Development Commands

- `bash start.sh` builds the Rust sandbox if needed, then starts FastAPI on port 8500 and Vite on 5174.
- `docker build -t dorado-sandbox:latest docker/sandbox` rebuilds the isolated Rust runner.
- `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt` prepares the Python environment.
- `cd backend && uvicorn app.main:app --reload --port 8500` runs the API locally.
- `cd frontend && pnpm install && pnpm dev --port 5174` runs the client.
- `cd frontend && pnpm lint` runs Oxlint; `pnpm build` type-checks and creates a production bundle.

## Coding Style & Naming Conventions

Use four spaces in Python and follow PEP 8: `snake_case` for modules/functions and `PascalCase` for models and schemas. Keep API handlers thin and move sandbox or content behavior into services. In TypeScript, follow the existing two-space, semicolon-free style. Name React components and their files in `PascalCase` (for example, `OutputPanel.tsx`); use `camelCase` for functions and variables. Preserve the chapter filename pattern `NN-kebab-case.md`.

## Testing Guidelines

No automated test suite or coverage threshold is currently committed. New backend tests should use `pytest` under `backend/tests/` with names like `test_code_api.py`; frontend tests should use `*.test.tsx` beside the component or under `frontend/src/__tests__/`. At minimum, run `pnpm lint` and `pnpm build`, verify `/api/health`, and exercise sandbox changes against the Docker image. Add the appropriate test dependency and script with the first tests.

## Commit & Pull Request Guidelines

History currently contains only `init`, so no established commit convention exists. Use short, imperative, scoped subjects such as `feat: add chapter search` or `fix: enforce sandbox timeout`. Keep commits focused. Pull requests should explain behavior and validation, link relevant issues, call out configuration or schema changes, and include screenshots for visible UI changes. Never commit virtual environments, SQLite databases, tokens, or generated frontend output.
