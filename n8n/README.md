# KoderKids WhatsApp Sales Bot — n8n Setup Guide

This directory contains the complete n8n workflow (`whatsapp_sales_bot.workflow.json`) that
powers the KoderKids/KoderEduAI WhatsApp sales chatbot.

---

## Quick Import

1. Open your n8n instance → **Workflows** → **Import from file**
2. Select `whatsapp_sales_bot.workflow.json`
3. Configure credentials and environment variables (see below)
4. **Activate** the workflow

---

## Architecture Overview

```
Inbound WhatsApp (Meta Cloud API)
        │
        ▼
[WhatsApp Webhook]  ──── POST /webhook/whatsapp ────────────────────────────────┐
        │                                                                        │
[Parse Incoming Message]                                                         │
        │                                                                        │
[Is Group or Skip?] ── YES ──► [Ack 200 OK – no processing]  (FIX 1)           │
        │ NO                                                                     │
[Load Session State]  ◄─ n8n static data (keyed by WhatsApp number)            │
        │                                                                        │
[Normalize Session Step]  ◄─ 'menu' keyword forces main menu (FIX 2)           │
        │                                                                        │
[Route by Session Step]                                                          │
   ├── menu         ──► [Build+Send Interactive Button Menu] → save(awaiting_role)  (FIX 2)
   │                                        │ END EXECUTION (FIX 3)             │
   ├── awaiting_role──► [Parse Role Button] → [Route by Role]                   │
   │                          ├── parent ──► [Parent Interest List] → save      │
   │                          ├── school ──► [School Interest List] → save      │
   │                          └── other  ──► Koder Agent  (FIX 4)              │
   │                                        │ END EXECUTION (FIX 3)             │
   ├── awaiting_interest ──► [Resolve Interest] (FIX 5) → save → Agent         │
   ├── in_conversation   ──► [Agent (role from session)]                        │
   └── (fallback)        ──► [Koder Agent]  (FIX 4)                            │
                                    │                                            │
                     [Build LLM Request] (system prompt per agent)              │
                     [Call LLM – Groq]                                          │
                     [Process Response + Detect LEAD_DATA] (FIX 6)             │
                          │                                                      │
                     [Has Lead?]                                                 │
                       ├─ YES ──► [Save Lead to CRM] + [Notify Sales WA]       │
                       └─ NO  ──► (continue)                                    │
                     [Send WA Reply to User]                                     │
                     [Update Session History]                                    │
                     [Ack 200 OK]  ───────────────────────────────────────────►┘
```

---

## Environment Variables

Set these in **n8n Settings → Variables** (or your `.env` / deployment config):

| Variable              | Description                                                                          | Example                             |
|-----------------------|--------------------------------------------------------------------------------------|-------------------------------------|
| `WHATSAPP_TOKEN`      | Meta Cloud API permanent access token (System User token)                             | `EAAxxxxx…`                         |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID from Meta Developer Console (used in API URL)                  | `123456789012345`                   |
| `GROQ_API_KEY`        | Groq Cloud API key for LLM calls (`llama-3.1-8b-instant`)                            | `gsk_xxxxx…`                        |
| `BACKEND_URL`         | Base URL of the Django backend (no trailing slash)                                    | `https://your-app.onrender.com`     |
| `BACKEND_WA_BOT_KEY`  | Shared secret for the `/api/crm/leads/whatsapp/` endpoint (must match Django setting)| `my-long-random-secret`             |
| `SALES_NOTIFY_NUMBER` | WhatsApp number that receives new-lead notifications (international format, no `+`)   | `923001234567`                      |

> **OpenAI alternative:** In the **Call LLM (Groq)** node, change the URL to
> `https://api.openai.com/v1/chat/completions`, swap `GROQ_API_KEY` → `OPENAI_API_KEY`,
> and set `model` to `gpt-4o-mini` or `gpt-3.5-turbo`.

---

## Meta Cloud API Webhook Setup

1. Go to **Meta Developer Console** → your App → **WhatsApp** → **Configuration**
2. **Webhook URL**: `https://<your-n8n-domain>/webhook/whatsapp`
3. **Verify token**: any string (this workflow does not verify GET challenges —
   add an n8n GET webhook node if needed, or use Meta's "skip verification" option
   for self-hosted n8n behind a proxy)
4. Subscribe to **messages** webhook field

### Meta GET Verification (optional node addition)

If Meta sends a `GET` verification challenge, add a second webhook node:

```
Webhook trigger: GET /webhook/whatsapp
→ Respond to Webhook: {{ $query['hub.challenge'] }}
```

---

## Session Storage

Sessions are stored in **n8n workflow static data** (in-process, persisted to the n8n
database). This is sufficient for moderate traffic.

For high-traffic production use, replace the Load/Save Session code nodes with
HTTP Request nodes calling a Redis or Upstash endpoint, or a custom Django session API.

**Session shape:**
```json
{
  "step":     "new | awaiting_role | awaiting_interest | in_conversation",
  "role":     "parent | school | other | null",
  "agent":    "parent | school | koder",
  "interest": "courses | pricing | demo | meeting | advisor | partnership | general | null",
  "history":  [ { "role": "user|assistant", "content": "…" } ]
}
```

---

## Fix-by-Fix Reference

### FIX 1 — Ignore Group Messages

**Node:** `Is Group or Skip?`

WhatsApp group JIDs end with `@g.us` (new format) or match `\d+-\d+` (legacy).
The `Parse Incoming Message` code node sets `isGroup = true` for these.
The IF node routes them to `Ack – Group / Empty (no processing)` which returns
HTTP 200 immediately. **No further processing occurs.**

### FIX 2 — Clickable Interactive Main Menu

**Nodes:** `Build Main Menu Payload` → `Send Main Menu`

Instead of a plain-text numbered list, the bot sends a **WhatsApp interactive
button message** with three buttons: `👨‍👩‍👧 Parent`, `🏫 School`, `💬 Other`.

Interest sub-menus (for Parent and School) use **WhatsApp interactive list messages**
with up to 5 rows. This removes the need to type anything at the menu stage.

**Text fallback is preserved:** `Normalize Session Step` checks if the user typed
`menu`, `hi`, `hello`, `start`, `help`, etc. and forces `effectiveStep = 'menu'`
so the interactive menu is re-sent.

### FIX 3 — No Duplicate First-Step / Agent Invocation

**Key design principle:** Each execution handles exactly ONE action:

| Message received          | What happens in this execution          | Next step saved |
|---------------------------|------------------------------------------|-----------------|
| "hi" / new user           | Show main menu                           | `awaiting_role`  |
| Tap Parent/School button  | Show interest sub-menu ONLY             | `awaiting_interest` |
| Tap interest list item    | Call agent with interest context, reply  | `in_conversation` |
| Any subsequent message    | Call same agent, reply                  | `in_conversation` |

The `Route by Role` switch sends Parent/School to their interest menus and ends
the execution there. **The agent is never invoked on the same execution as role
selection.** (Previously, the workflow both sent the interest menu AND immediately
called the agent, producing a double-response.)

### FIX 4 — Default / Unmatched → Koder Agent

**Nodes:** `Parse Role Selection` (sets `detectedAgent = 'koder'` for unknown input),
`Route by Role` (fallback output), `Resolve Agent for Fallback`

Previously the fallback was wired to the Parent Agent. Now:
- Role button `Other` → `detectedAgent = 'koder'`
- Any unrecognised text at `awaiting_role` → `detectedAgent = 'koder'`
- Unmatched `effectiveStep` (Switch fallback) → `Resolve Agent for Fallback` → Koder Agent

**Koder Agent's system prompt** covers **both** `koderkids.pk` (kids coding school)
and `kodereduai.pk` (EdTech AI platform for schools), making it genuinely useful for
visitors who don't fit the Parent or School buckets.

### FIX 5 — Deterministic Interest Routing

**Node:** `Resolve Interest and Agent`

Interest is resolved in this priority order:
1. **Interactive list ID** (e.g. `interest_courses`, `interest_pricing`) — exact
   match against `INTEREST_MAP`; these IDs are set by our own interest menu nodes
   so they are always correct.
2. **Text keyword regex** (fallback when user types instead of tapping).

The resolved `interest` is stored in the session and also passed as context to
the agent's system prompt, ensuring the agent knows exactly what the user wants
from the very first message.

**n8n wiring for interests:** All five interest options for Parent (courses, pricing,
demo, meeting, advisor) and five for School (courses, pricing, demo, meeting,
partnership) flow into the **same** `Build LLM Request` node via a single
`Resolve Interest and Agent` → `Save Session` chain. There is no per-interest
branching needed because the system prompt already includes `interest` as context.

### FIX 6 — Lead Detection, Structured LEAD_DATA, CRM Save, Sales Notification

**Nodes:** `Process Response + Detect Lead`, `Has Lead Data?`, `Save Lead to CRM`,
`Notify Sales via WhatsApp`

Each agent's system prompt instructs the LLM to append a `LEAD_DATA:{ … }` JSON
block at the **end** of its reply when it has collected enough information.
The `Process Response + Detect Lead` code node:
1. Splits the reply at `LEAD_DATA:`, keeping the human-readable portion for the user
2. Parses the JSON (with error handling for malformed output)
3. Enriches it with `whatsapp_from`, `agent_type`, and `timestamp`

When a lead is detected:
- `Save Lead to CRM` — POSTs to `POST /api/crm/leads/whatsapp/` (see backend section)
- `Notify Sales via WhatsApp` — Sends the structured JSON to the sales team's number

---

## Backend: `/api/crm/leads/whatsapp/` Endpoint

**File:** `backend/crm/views.py` → `whatsapp_lead_ingest`
**URL:** `backend/crm/urls.py` → `path('leads/whatsapp/', whatsapp_lead_ingest, …)`

This endpoint:
- Authenticates via `X-WhatsApp-Bot-Key` header (timing-safe `hmac.compare_digest`)
- Deduplicates: if the same phone number submitted a lead in the last 24 h, returns `{"status":"duplicate"}`
- Creates a `Lead` record with `lead_source = 'Social Media'`
- Stores all structured fields in the `notes` column
- Returns `{"status":"created","lead_id":…}` (HTTP 201)

**Django env var to set:**
```
BACKEND_WA_BOT_KEY=my-long-random-secret
```

---

## Google Sheets Integration (Lead Logging)

To mirror every captured lead into a Google Sheet, add a **Google Sheets node**
immediately after `Notify Sales via WhatsApp`:

```
[Notify Sales via WhatsApp]
        │
        ▼
[Google Sheets – Append Row]
  Credential: "Google Sheets OAuth2"  ← add in n8n Credentials
  Operation:  Append
  Sheet ID:   <your spreadsheet ID>
  Sheet Name: Leads
  Columns:
    timestamp      ← {{ $('Process Response + Detect Lead').first().json.leadData.timestamp }}
    type           ← {{ $json.leadData.type }}
    name           ← {{ $json.leadData.parent_name || $json.leadData.school_name || $json.leadData.name }}
    phone          ← {{ $json.leadData.phone || $json.leadData.whatsapp_from }}
    interest       ← {{ $json.leadData.interest }}
    agent          ← {{ $json.leadData.agent_type }}
    notes          ← {{ $json.leadData.notes }}
```

**Credential placement in n8n:**
1. n8n → **Settings** → **Credentials** → **Add Credential** → `Google Sheets OAuth2 API`
2. Follow the OAuth2 consent flow (requires a Google Cloud project with Sheets API enabled)
3. In the Google Sheets node, select this credential from the dropdown

---

## Customising Agent Prompts

All three system prompts are in the `Build LLM Request` code node (node ID `n025`).
Edit the constants `PARENT_PROMPT`, `SCHOOL_PROMPT`, and `KODER_PROMPT` directly
in the code panel. Key rules to preserve:

1. Keep the `LEAD_DATA:{ … }` instruction and JSON template at the end of each prompt
2. Keep the "never output LEAD_DATA more than once" rule
3. Keep word-count guidance (≤ 140 words) for WhatsApp readability

---

## Adding More Interest Options

To add a new interest option (e.g. "Scholarship"):

1. **In `Build Parent Interest Menu` node:** add a new row object:
   ```json
   { "id": "interest_scholarship", "title": "🎓 Scholarship", "description": "..." }
   ```
2. **In `Resolve Interest and Agent` node:** add to `INTEREST_MAP`:
   ```js
   interest_scholarship: 'scholarship',
   ```
3. **In `Build LLM Request` node:** update the `interest` mention in the relevant
   system prompt so the agent knows how to handle it.

No new Switch branches, no new agent nodes — the single agent flow handles everything.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Group messages still processed | Old workflow import cached | Re-import JSON and re-activate |
| Main menu shows as plain text | Meta API doesn't support interactive messages for your number type | Ensure you're using a WhatsApp Business API number (not a test number without WABA approval) |
| Session not persisted between messages | n8n static data flushed (e.g. server restart) | Implement external Redis session store |
| LLM returns malformed LEAD_DATA JSON | Model hallucinated | Add more strict JSON schema examples to the prompt; or use `gpt-4o` |
| `401 Unauthorized` on `/api/crm/leads/whatsapp/` | BACKEND_WA_BOT_KEY mismatch | Ensure env vars match in both n8n and Django |
| Duplicate lead created | Dedup window (24 h) too short | Adjust `timedelta(hours=24)` in `whatsapp_lead_ingest` |
