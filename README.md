# Booking Nest — Reservation Calendar

Multi-tenant reservation system: each account gets a **unique public calendar** (`/calendar/<slug>`) that guests can use to book time slots. Owners manage availability and bookings from a **dashboard**. The UI brand in the app is **Booking Nest**.

## Stack

| Layer | Technology |
|--------|-------------|
| Frontend | React 19, Vite 6, React Router 7, Tailwind CSS 4, Axios |
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2 (async), Alembic |
| Database | PostgreSQL 13 |
| Background jobs | Celery 5, Redis 7 (broker + results) |
| Email | Resend API (`fastapi-mail` / `resend`) |
| Production-ish local | Docker Compose, Nginx (reverse proxy to the API), single image builds SPA + API |

## Features

### For guests (public booking)

- Open any calendar via **`/calendar/:ownerSlug`** (also linked from the home page directory).
- **Week navigation** (previous / next week) within the owner’s configured horizon.
- **Desktop grid** and **mobile-friendly** calendar views.
- Book a slot with contact details; system enforces **per-slot capacity** and **one booking per email** per slot.
- **Manage existing bookings** with a **reservation key** plus the **email used when booking**: view, reschedule, or cancel (without logging in).

### For owners (authenticated)

- **Register** and **sign in**; each user gets a stable **`calendar_slug`** for sharing.
- **`/dashboard`** (protected): list reservations grouped by day/time, with controls to **delete** individual bookings.
- Configure calendar rules:
  - **Slot capacity** (how many people per time slot),
  - **How many weeks ahead** bookings are allowed,
  - **Time slots** (custom list),
  - **Bookable days** (e.g. weekdays only).
- **Account deletion** from the dashboard.

### Platform / ops

- **Cookie-based session auth** for owners; public booking and “manage by key” flows use dedicated APIs.
- **Transactional email** queued via Celery: confirmations, cancellations, and owner notifications (when configured).
- **Scheduled cleanup**: Celery Beat runs a task to remove **past** reservations.
- **`/api/health`** for readiness checks.
- **Kubernetes / Helm** under `k8s/` with Terraform (optional deployment path).

## Repository layout

- `src/` — FastAPI app, routers, models, Celery app and tasks  
- `frontend/` — Vite React SPA (built into `frontend/dist` for the Docker image)  
- `docker-compose.yml` — Postgres, Redis, API, Celery worker, Celery beat, Nginx  
- `k8s/` — Terraform modules and Helm chart for cluster deployment  
- `tests/` — pytest suite  

## Environment variables

Used by Docker Compose and local runs (see `docker-compose.yml` and `src/`). Typical variables:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Postgres credentials and database name |
| `DATABASE_URL` | Async SQLAlchemy URL (e.g. `postgresql+asyncpg://...`) |
| `SECRET_KEY` | Session / auth signing (set a strong value in production) |
| `AUTO_CREATE_TABLES` | If `true`, create tables on API startup (e.g. `true` in Compose) |
| `RESEND_API_KEY` | Resend API key for outbound email |
| `MAIL_FROM`, `MAIL_FROM_NAME` | Sender address and display name (default name can be “Booking Nest”) |
| `MAIL_USERNAME` | Optional; used for owner notification email routing where configured |
| `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | Redis URLs for Celery (Compose often uses `redis://redis:6379/0`) |

Create a `.env` file at the repo root for Compose and tooling; do not commit secrets.

## Backend development

### Install dependencies (Poetry)

```shell
python -m venv .venv
source .venv/bin/activate
pip install poetry
poetry install
```

Set `DATABASE_URL` (and other vars as needed), then run the API:

```shell
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

For **Celery** locally, start Redis and run the worker and beat with the same env as the API (see `docker-compose.yml` for command lines).

### Tests

```shell
source .venv/bin/activate
pytest
```

## Frontend development

```shell
cd frontend
yarn install
yarn dev
```

The SPA calls `/api` with **credentials** included. For split dev (Vite on one origin, FastAPI on `:8000`), configure Vite **`server.proxy`** so `/api` forwards to the backend, or use **Docker Compose** so Nginx and a single backend origin serve both.

### Build static assets

```shell
cd frontend
yarn build
```

The production Docker image copies `frontend/dist` into the image; FastAPI serves the SPA and falls back to `index.html` for client-side routes when the build is present.

## Run everything with Docker Compose

From the repository root (with `.env` populated):

```shell
docker compose up --build
```

Services:

- **`postgres`** — database  
- **`redis`** — Celery broker/backend  
- **`reservation_calender_api`** — FastAPI (uvicorn); serves API and built frontend inside the container  
- **`background_task_worker`** — Celery worker (email and other tasks)  
- **`background_job`** — Celery Beat (scheduled cleanup)  
- **`nginx`** — listens on **host port 8080** and proxies to the API  

Open **`http://localhost:8080`** after containers are healthy.

## Deployment to Minikube (Terraform)

### Prerequisites

- Minikube (v1.30+), `kubectl`, Terraform (v1.5+), Helm (v3+), Docker (for local image builds if needed)

### Start Minikube

```bash
minikube start
minikube addons enable ingress
minikube addons enable metrics-server
```

### Apply Terraform

```bash
cd k8s/
terraform init
terraform plan
terraform apply
```

### Access the app

Use the port-forward command from Terraform outputs, for example:

```bash
kubectl port-forward service/reservation-api 8000:80 -n reservation-app
```

Then open **`http://localhost:8000`** (adjust namespace/service if your variables differ).

More detail: `k8s/charts/README.md`.
