# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Multi-tenant school management ERP (KoderKids) covering students, attendance, academics/lesson plans, finance/fees, CRM (BDM lead tracking), inventory, transactions, tasks, and LMS-style content (books, courses). Built with Django REST + React (CRA, not Vite). Several AI "agents" (Fee, Inventory, Transaction, Task) let users manage backend data through natural-language chat instead of forms, following a shared architecture (see `docs/AI_AGENT_ARCHITECTURE.md`).

The repo also contains a few unrelated/standalone side-projects that share the root but aren't part of the ERP: `khan-chappals/` (a static shop proposal site) and `wabot/` (a WhatsApp/n8n bot integration with its own README).

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Django REST Framework, SimpleJWT |
| Frontend | React (Create React App — `react-scripts`), Tailwind CSS, Recharts, FullCalendar |
| AI/LLM | Groq (production) or Ollama (local/dev), used by the `ai` app for all natural-language agents |
| Database | Configured via `DATABASE_URL`; SQLite present locally (`backend/db.sqlite3`) |
| Deploy | Render.com — backend as a Docker web service (with Ollama on-box), frontend as a static site (see `render.yaml`) |

## Directory Structure

```
school-management-system/
├── backend/                    # Django project (school_management/)
│   ├── ai/                     # Shared AI agent framework: actions, prompts, resolver, executor, llm_client
│   ├── crm/                    # BDM lead management (Lead, Activity, BDMTarget) — see docs/CRM_MODULE_GUIDE.md
│   ├── students/                # Students, core auth (CustomUser, roles incl. BDM)
│   ├── finance/                 # Fees, transactions
│   ├── inventory/               # Items, categories — see docs/INVENTORY_AGENT_INTEGRATION.md
│   ├── lessons/                 # Lesson plans — see docs/lesson_plan_system_guide.md
│   ├── onlineclasses/           # Online classes — see docs/ONLINE_CLASSES_SYSTEM_OVERVIEW.md
│   ├── tasks/, employees/, reports/, dashboards/, aigala/, courses/, books/, attendance/, authentication/, robotchat/  # other Django apps, each with its own tests.py
│   └── manage.py
├── frontend/
│   └── src/
│       ├── pages/               # Page components, incl. pages/crm/
│       ├── components/          # Shared UI + per-module chat components (e.g. components/inventory/InventoryAgentChat.js)
│       └── services/            # api.js and per-domain service files (crmService.js, aiService.js, feeService.js, ...)
├── docs/                        # Detailed reference documentation (read on demand, not preloaded)
├── _archive/                    # Superseded plans/completion-reports, kept on disk but untracked (see .gitignore)
├── khan-chappals/, wabot/       # Unrelated side-projects living in this repo
└── render.yaml                  # Render Blueprint (backend Docker service + frontend static site)
```

## Running Locally

```bash
# Backend (from backend/)
python manage.py runserver

# Frontend (from frontend/)
npm start
```

Helper script: `start-local.bat` switches env config, opens VS Code, and starts both servers in separate terminals. `start-prod.bat` / `build-prod.bat` exist for production-mode local runs — check them before assuming `start-local.bat` covers a given case.

## Tests

```bash
# Backend (from backend/) — Django's own test runner, no pytest config present
python manage.py test
python manage.py test crm            # single app

# Frontend (from frontend/) — Create React App / Jest
npm test
```

Tests live in each Django app's own `tests.py` (e.g. `backend/crm/tests.py`, `backend/attendance/tests.py`) — there is no shared `tests/` package convention here (unlike EducationAI).

## Build

```bash
cd frontend && npm run build   # -> frontend/build (CRA output, not Vite's dist/)
```

## AI Agents

Four natural-language agents share one framework in `backend/ai/` (`actions.py`, `prompts.py`, `resolver.py`, `executor.py`, `llm_client.py`/`ollama_client.py`):

- **Fee Agent** — `frontend/src/components/finance/FeeAgentChat.js` — see `docs/AI_AGENT_ARCHITECTURE.md` / `docs/AI_AGENT_IMPLEMENTATION.md` for the pattern (no dedicated Fee doc — `_archive/FEE_AGENT_*_PLAN.md` holds historical enhancement plans of unverified implementation status).
- **Inventory Agent** — `frontend/src/components/inventory/InventoryAgentChat.js` — see `docs/INVENTORY_AGENT_INTEGRATION.md`.
- **Transaction Agent** — bank-statement reconciliation — see `docs/TRANSACTION_AGENT_GUIDE.md`.
- **Task Agent** — natural-language task assignment for admins — see `docs/TASK_AGENT_GUIDE.md`.

LLM provider is switched via env (`LLM_PROVIDER=groq|ollama`); Groq model is `llama3-8b-8192` in existing docs — confirm current model/provider in `backend/ai/llm.py` / env before relying on it, as agent docs across this repo were written at different times.

## Coding Conventions (observed in this codebase)

- Backend AI actions follow a fixed pipeline: define in `actions.py` → prompt rules in `prompts.py` → `resolver.py` (fuzzy-match/validate params, build confirmation preview) → `executor.py` (perform the DB operation). Follow this order when adding a new agent action rather than writing directly in the view.
- Frontend chat components (`*AgentChat.js`) take `schools`/`categories`/`users`-style prop lists from the parent page's existing data-fetching hook (e.g. `useInventory()`), not their own fetches, plus an `onRefresh` callback to resync parent state after a successful action.
- Destructive AI actions (delete, bulk-delete) require a confirmation step before executing — don't add a new destructive action without wiring the confirmation flow the existing agents use.

## Non-obvious Gotchas

- **`_archive/` is real content, not a stub.** It holds ~40 historical planning/completion docs (UI-redesign write-ups, refactor plans, "X is now complete" reports) that were cluttering the repo root. They're gitignored on purpose — don't `git add -f` them back in, and don't assume something is gone just because it's not in `git status`.
- **Root has a lot of non-doc clutter** (temp scripts, `.zip`/`.xlsx`/`.pdf` files, multiple `requirements*.txt`, several `tmpclaude-*-cwd` leftover dirs) that hasn't been cleaned up — unrelated to the doc restructuring, don't assume it's meaningful project structure.
- **CRM's originally-scoped pages were never fully built** — `LeadDetailPage`, `ActivitiesPage`, and `TargetsPage` were planned but skipped in favor of modals/dashboard sections. See "Not Implemented" in `docs/CRM_MODULE_GUIDE.md` before assuming those routes exist.
- Several docs across `docs/` were written at different times with their own "Status: COMPLETE/PLANNING/Proposed" markers — treat those statuses as of their write date, not current fact; grep the actual code before trusting a doc's completion claim.

## Detailed Documentation

Read on demand from `docs/` (not preloaded — these are reference docs, some large):
- `docs/AI_AGENT_ARCHITECTURE.md` — shared AI agent system design
- `docs/AI_AGENT_IMPLEMENTATION.md` — step-by-step guide to building a new agent
- `docs/AI_PROMPT_ENGINEERING.md` — prompt-writing best practices for the agents
- `docs/CRM_MODULE_GUIDE.md` — CRM models, endpoints, permissions, test account, what's actually built vs. scoped-but-skipped
- `docs/INVENTORY_AGENT_INTEGRATION.md` — Inventory Agent actions, integration patterns, live wiring in `InventoryDashboard.js`
- `docs/TRANSACTION_AGENT_GUIDE.md` — bank-statement reconciliation agent
- `docs/TASK_AGENT_GUIDE.md` — natural-language task assignment agent
- `docs/AI_GALA_USER_GUIDE.md` — monthly student AI-art competition feature
- `docs/ONLINE_CLASSES_SYSTEM_OVERVIEW.md` — how online classes actually work in the current code
- `docs/ONLINE_STUDENTS_ACCESS_GUIDE.md` — Student role + ONLINE subtype architecture, route gating
- `docs/lesson_plan_system_guide.md` — lesson plan data model and teacher workflow
- `docs/LMS_PROGRESSION_GUIDELINES.md` — current (post-fix) student progression behavior in the Book Viewer/LMS
- `docs/VALIDATION_SYSTEM_USER_MANUAL.md` — Book & Section Validation Flow, role-by-role usage + API reference
- `docs/GLASSMORPHISM_REMAINING_PAGES_PLAN.md` — active design-system migration guide for pages not yet converted

## Deployment

- `render.yaml` deploys **two services**: backend as a `docker` web service (`school-management-backend-ai`, `backend/Dockerfile.ai`, Oregon, Starter plan — 2 CPU/8GB, sized for running Ollama on-box) with a persistent disk for Ollama models, and frontend as a `static` site built via `cd frontend && npm install && npm run build`.
- `AI_ENABLED`, `OLLAMA_HOST`, `DATABASE_URL` (manual), `SECRET_KEY` (generated), and `WHATSAPP_BOT_KEY` (shared with the separate `wabot/` n8n integration) are set via `render.yaml`/dashboard — check there before assuming an env var's source.
