# ProofPath

AI-governed writing platform for higher education. Captures behavioural process metadata during writing, enforces per-assignment AI policies in real time, and issues cryptographically signed **ProofPath Authenticity IDs (PAID)** on submission.

## Monorepo structure

```
proofpath/
├── apps/
│   ├── web/          Next.js 14 — student, teacher, admin UI
│   ├── api/          FastAPI — REST API, signals, reports, PAID
│   └── extension/    Chrome MV3 — Google Docs & Word Online capture
├── packages/
│   ├── types/        Shared TypeScript types
│   ├── crypto/       PAID hash & RSA signing utilities
│   └── signals/      Behavioural signal extraction (14+ signals)
├── infra/            Terraform (AWS ap-southeast-2)
└── docker-compose.yml
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.12+
- Docker (PostgreSQL 16 + Redis 7)

## Quick start

### 1. Infrastructure

```bash
docker compose up -d
cp .env.example .env
# Fill Clerk, Anthropic, and other keys in .env
```

### 2. Database migrations

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

### 3. API

```bash
cd apps/api
uvicorn app.main:app --reload --port 8000
```

Optional Celery worker for async report generation:

```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

### 4. Web app

```bash
pnpm install
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Chrome extension

```bash
pnpm dev:extension
# Load unpacked extension from apps/extension/dist in chrome://extensions
```

## Environment variables

See [.env.example](.env.example). Required for full functionality:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (web) |
| `CLERK_SECRET_KEY` | Clerk server |
| `ANTHROPIC_API_KEY` | Report narrative generation |
| `DATABASE_URL` | PostgreSQL (async) |
| `REDIS_URL` | Event buffer + Celery |

## API routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/assignments` | Teacher | Create assignment |
| GET | `/api/assignments` | Teacher/Student | List assignments |
| GET | `/api/assignments/{id}` | Teacher/Student | Get assignment |
| PATCH | `/api/assignments/{id}` | Teacher | Update / publish |
| GET | `/api/assignments/{id}/class` | Teacher | Class triage dashboard |
| POST | `/api/users/sync` | Auth | Sync Clerk user to DB |
| GET | `/api/users/me` | Auth | Current ProofPath user |
| POST | `/api/ai/assist` | Student | Governed Claude assistance |
| GET | `/api/submissions/by-assignment/{id}` | Student | Get existing draft |
| POST | `/api/submissions` | Student | Create draft |
| POST | `/api/submissions/{id}/events` | Student | Batch event log |
| POST | `/api/submissions/{id}/submit` | Student | Finalise + PAID |
| GET | `/api/submissions/{id}/report` | Teacher/Student | Authenticity report |
| GET | `/api/verify/{paid}` | Public | Verify PAID |
| GET | `/api/institutions/{id}/analytics` | Admin | Institution analytics |

## PAID signing (development)

Generate RSA keys for local PAID signing:

```bash
mkdir -p apps/api/keys
openssl genrsa -out apps/api/keys/paid_private.pem 2048
openssl rsa -in apps/api/keys/paid_private.pem -pubout -out apps/api/keys/paid_public.pem
```

Production uses AWS KMS (see documentation §5.5).

## Key pages

| Route | Role |
|-------|------|
| `/dashboard` | All authenticated users |
| `/assignment/[id]` | Student writing environment |
| `/teacher/[assignmentId]` | Class triage dashboard |
| `/admin` | Institution admin |
| `/verify/[paid]` | Public PAID verification |

## Sprint 3 features (implemented)

- **14 behavioural signals** — full extraction pipeline in API + `@proofpath/signals`
- **Flag detection** — large paste, speed spikes, paste ratio, session patterns
- **Report generation** — Claude structured JSON narrative + Celery with sync fallback
- **Report UI** — `/report/[submissionId]` (student), `/teacher/.../report/...` (teacher)
- **Endpoints** — `GET /api/submissions/{id}/report`, `POST .../report/generate`

## Sprint 2 features (implemented)

- **Teacher**: Create assignments at `/teacher/create`, publish, class dashboard
- **Student**: Dashboard lists published assignments, open → auto draft submission
- **AI governance**: Server-enforced policy on `POST /api/ai/assist` + client paste block for `locked`
- **AI logging**: `ai_query` and `ai_insert` events from the AI panel
- **User sync**: `POST /api/users/sync` on first dashboard visit (pick student or teacher role)

## Build plan

1. **Sprint 1** — Editor + event capture ✅
2. **Sprint 2** — Assignments + AI policy enforcement ✅
3. **Sprint 3** — Signal extraction + reports ✅
4. **Sprint 4** — PAID certificates + verification portal
5. **Sprint 5** — Dashboards + student portal
6. **Sprint 6** — Offline sync + Chrome extension polish

## License

Confidential — ProofPath © 2026
