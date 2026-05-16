# Koder Kids WhatsApp Bot — v3

This folder contains the n8n workflow that powers the Koder Kids WhatsApp
sales / support bot.

| File       | Purpose                                                             |
|------------|---------------------------------------------------------------------|
| `v1.txt`   | Reference snapshot of the original production flow (WAHA + 3 agents).|
| `v2.txt`   | Reference snapshot of the Meta Cloud-API exploratory rewrite.        |
| `v3.json`  | **The only file to import into n8n** — full workflow (nodes + connections). |
| `v3.txt`   | Optional reference snapshot (same JSON as `v3.json`).                         |

> All bot logic lives inside **Code node `jsCode` fields** and the **Other Agent `systemMessage`** in `v3.json`. There are no separate app integration files. Import `v3.json` via n8n → Workflows → Import from File.

---

## Architecture (v3)

```
WAHA Webhook
   |
   v
Parse Payload  ->  Ack 200 OK (immediate)
   |
   v
Skip? (group / self / non-message)  ->  Drop silently
   |
   v
Inject Env Config (Code: process.env)  ->  Load Session  ->  Normalize Step  ->  Route by Step (switch)
                                            |
        --------------------------------------------------------------------
        |              |               |                |                |
        v              v               v                v                v
    Main Menu      Parse Role     Parent FSM -----> Delegate to AI? -----> Other Agent
                        |              |              |              (LangChain + Groq
                        |         School FSM ----------+               + koderkids.pk /
                        |              |              |               kodereduai.pk tools)
                        |              +--------------> Has Lead?
                        +------------------------------------> Other Agent (fallback)
        \____________________________________________________________/
                                  |
                                  v
                             Has Lead?
                            /         \
                           v           v
                  POST /api/crm/      Start Typing
                  leads/whatsapp/      |
                          |            v
                          v        Wait 3-5s
                  Notify 3 Sales       |
                  Reps (WAHA)          v
                          |        Stop Typing
                          v            |
                     Aggregate         v
                          \--->  Send WAHA Reply
                                     |
                                     v
                                Save Session
```

### Three roles, one workflow

| Role   | Behaviour                                                                                                                |
|--------|--------------------------------------------------------------------------------------------------------------------------|
| Parent | Hybrid FSM: age -> city -> laptop -> **open AI interest** (website tools) -> name -> CRM -> demo/meeting next steps.      |
| School | Hybrid FSM: **product pick** (EduAI vs Collaboration) -> branch-specific fields -> CRM as `type=school`.               |
| Other  | Default free chat. LangChain + Groq + website tools. Sends to CRM as `type=other` when agent emits `LEAD_DATA:`.          |

**Hybrid side quests:** During Parent or School signup, off-script questions route to the Other Agent without changing `session.step`. The agent answers using koderkids.pk / kodereduai.pk tools, then prompts the user to continue the current FSM step. Parent **interest** (after laptop) is always AI-driven.

The Other agent is also the **fallback** for:

- Anything entered before the role is picked.
- Question-like messages during FSM button steps (via `Delegate to AI?`).
- Unrecognised role inputs ("idk", "hello", typos, etc.).

### Group / self / status-update filter

The very first IF node drops the request silently (still 200 OK) when any of:

- `body.event !== 'message'`
- `body.payload.fromMe === true` (the bot's own messages)
- `body.payload.from` ends with `@g.us` or matches a legacy group JID (`123-456@...`)
- The payload has no text and no interactive reply

### Session state

Stored in n8n workflow `staticData` keyed by `chatId`. Schema:

```js
{
  step: 'new' | 'menu' | 'awaiting_role'
      | 'awaiting_parent_age' | 'awaiting_parent_city' | 'awaiting_parent_laptop'
      | 'awaiting_parent_interest'   // AI-only (routed to Other Agent)
      | 'awaiting_parent_name' | 'awaiting_parent_followup'
      | 'awaiting_school_product'
      | 'awaiting_school_eduai_type' | 'awaiting_school_eduai_city'
      | 'awaiting_school_eduai_name' | 'awaiting_school_eduai_contact'
      | 'awaiting_school_collab_name' | 'awaiting_school_collab_city'
      | 'awaiting_school_collab_lab' | 'awaiting_school_collab_interest'
      | 'awaiting_school_collab_students' | 'awaiting_school_collab_contact'
      | 'in_other' | 'lead_done',
  role: 'parent' | 'school' | 'other' | null,
  data: {
    // parent: child_age, city, has_laptop, interest_summary, name, next_action
    // school: school_product, school_type, school_name, city, lab, interest,
    //         student_count, name, role_at_school, side_quest_notes
  },
  history: [/* unused in v3 */],
  updatedAt: <ISO string>
}
```

Sessions older than 7 days are pruned at the start of every webhook execution.

Menu re-trigger keywords (always reset to the main menu):
`menu`, `hi`, `hello`, `start`, `restart`, `help`, `0`, `back`, `main menu`, `home`, `hey`.

### Interactive buttons + numbered-text fallback

Every "ask" step renders as a WAHA `sendButtons` or `sendList` call AND
embeds the same options as a numbered list inside the body text. So:

- If your WAHA engine (e.g. NOWEB+ on WAHA Plus) supports clickable
  buttons, the user taps them.
- If it doesn't, the user simply replies with `1`, `2`, `3`, etc.
- Either way the FSM parses the answer correctly (see
  `selectedButtonId` / `selectedRowId` / text fallbacks inside each
  handler code node).

---

## Troubleshooting: env vars from Railway never reach the workflow

### Root cause (confirmed against n8n docs + open issues)

n8n Code nodes do **not** run in the main n8n process by default. With
**`N8N_RUNNERS_ENABLED=true`** (the Railway template default) they run in a
separate **task-runner sandbox** that **does not inherit the n8n container’s
env**. So `process.env.WAHA_API_KEY` is empty inside `Inject Env Config` even
though the Railway dashboard clearly shows the variable on the service.

Three related n8n behaviours make this worse:

1. **Task runner isolation** — see [Task runner environment variables](https://docs.n8n.io/hosting/configuration/environment-variables/task-runners/).
   The runner only receives the small allow-list n8n forwards (`NODE_OPTIONS`,
   `GENERIC_TIMEZONE`, etc.). Custom vars are filtered out.
2. **`N8N_BLOCK_ENV_ACCESS_IN_NODE`** — recent n8n versions ship this as
   `true` and even when set to `false` it sometimes does not take effect
   (n8n-io/n8n issue **#29603**).
3. **`$vars` is Enterprise-only** — `Settings → Variables` does not exist on
   community / self-hosted-on-Railway n8n, so it cannot be used as a fallback.

### How v1 “worked”

`wabot/v1.txt` had **no env-reading at all** — every WAHA HTTP node had the
URL and `X-Api-Key` hardcoded inline. There was nothing for the runner sandbox
to fail on.

### What v3 does now (the actual fix)

`Inject Env Config` is **self-contained**: all required values live in a
`DEFAULTS` object inside the Code node (same idea as v1, but in one place).
If `process.env.WAHA_API_KEY` ever does become readable it overrides the
default. To rotate a secret, edit `DEFAULTS` in **Inject Env Config** and
re-import `v3.json`.

So you can ignore Railway env vars for the bot to work; they are kept in
`wabot/railway-n8n.variables.json` only as documentation / future-proofing.

### `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` in n8n logs

Unrelated to the bot. Railway’s edge sends `X-Forwarded-For`; n8n’s Express
rate-limiter rejects it without a trusted proxy. Set
**`N8N_PROXY_HOPS=1`** on the n8n service (try `2` if you have an extra proxy
in front).

---

## Environment variables

### n8n side

> The wabot does **not** depend on these vars at runtime — defaults are baked
> into `Inject Env Config`. They are listed for completeness and future use.

| Env var                | Used by              | Example                                                              | Purpose                                                                 |
|------------------------|----------------------|----------------------------------------------------------------------|-------------------------------------------------------------------------|
| `WAHA_BASE_URL`        | bot (override only)  | `http://212.224.86.152:3000`                                         | Base URL of your WAHA instance.                                         |
| `WAHA_API_KEY`         | bot (override only)  | `e7038641...`                                                        | `X-Api-Key` for WAHA endpoints.                                         |
| `WAHA_SESSION`         | bot (override only)  | `default`                                                            | WAHA session name (use `default` unless multiple).                      |
| `BACKEND_URL`          | bot (override only)  | `https://koderkids-erp.onrender.com`                                 | Django backend base URL.                                                |
| `BACKEND_WA_BOT_KEY`   | bot (override only)  | 64-hex string                                                        | Must match `WHATSAPP_BOT_KEY` on the Django side.                       |
| `SALES_REP_1` / `_2` / `_3` | bot (override only) | `923339446254`                                                  | Sales reps to notify (digits only; `@c.us` is appended automatically).  |
| `FRONTEND_URL`         | bot (override only)  | `https://portal.koderkids.pk`                                        | Used in notifications to deep-link to the CRM lead page.                |
| `N8N_PROXY_HOPS`       | n8n itself           | `1`                                                                  | Behind Railway/nginx/Caddy: trust one proxy hop for `X-Forwarded-For` (avoids `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`). |

> Setting `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` is **not enough** when n8n is
> running with `N8N_RUNNERS_ENABLED=true` (Railway’s default), because the
> runner sandbox does not inherit the container env regardless of that flag.
> Edit the `DEFAULTS` block in **Inject Env Config** instead.

The Groq credential (`Groq account`) is referenced by ID `kBh6xb6rY20uuOpa`.
If that credential ID does not exist in your n8n, edit the
`Groq (Other)` node after import and re-pick a Groq credential.

### Django side

| Env var             | Required | Purpose                                                  |
|---------------------|----------|----------------------------------------------------------|
| `WHATSAPP_BOT_KEY`  | yes      | Static bot key checked by `WhatsAppBotKeyPermission`. Must match `BACKEND_WA_BOT_KEY` in n8n. |

Set it on Render / locally:

```bash
# .env (backend)
WHATSAPP_BOT_KEY=<paste-the-same-long-random-string>
```

If `WHATSAPP_BOT_KEY` is unset the permission is **fail-closed** — every
ingest request returns 403.

---

## Backend integration

A single new endpoint:

```
POST /api/crm/leads/whatsapp/
Headers:
  Content-Type: application/json
  X-Bot-Key: <WHATSAPP_BOT_KEY>
Body:
  {
    "type": "parent" | "school" | "other",
    "name": "...",
    "phone": "923...",
    "whatsapp_from": "923...@c.us",
    "school_name": "...",         // optional
    "city": "Lahore",             // optional
    "child_age": "9-13",          // parent only
    "has_laptop": "Yes",          // parent only
    "interest": "Free Demo",      // parent / school / other
    "role_at_school": "Principal",// school only
    "lab": "Yes",                 // school only
    "notes": "..."                // optional free text
  }

Response (201):
  { "id": <lead_id>, "status": "created", ... }
```

Each call creates a row in the existing `crm_lead` table with
`lead_source='WhatsApp Bot'`. The full payload is also stored in
`Lead.notes` as JSON for debugging.

The new lead source choice ships in migration
`backend/crm/migrations/0008_lead_source_whatsapp_bot.py`. Run:

```bash
cd backend
python manage.py migrate crm
```

---

## n8n nodes changed (hybrid AI-FSM)

All edits are inside [wabot/v3.json](v3.json) only:

| n8n node name | Node type | What changed |
|---------------|-----------|----------------|
| Normalize Step | Code | Routes `awaiting_parent_interest` to Other Agent; side-quest flags |
| Parent FSM Handler | Code | Hybrid parent flow + `_delegateToOther` |
| School FSM Handler | Code | Product branch (EduAI / Collaboration) + student count |
| Parse Role Selection | Code | School starts at product pick |
| Other Agent Prep | Code | Builds `[SIDE_QUEST …]` prefix for the agent |
| Process Other Reply | Code | Restores FSM step after side quests |
| Other Agent | LangChain Agent | SIDE_QUEST system prompt + dynamic user text |
| Delegate to AI? | IF | **New** — Parent/School → Other Agent or Has Lead? |
| Build Sales Notifications | Code | `estimated_students`, `next_action` in rep message |

## Importing the workflow

1. Open n8n → Workflows → Import from File → select `wabot/v3.json` (not any other file).
2. Set the env vars listed above (n8n -> Settings -> Variables, or your
   container env file).
3. Re-pick the Groq credential on the `Groq (Other)` node if its ID does
   not match the import.
4. Open the webhook node `WAHA Webhook` and copy its **production URL**.
5. Register it in WAHA:
   ```bash
   curl -X POST "$WAHA_BASE_URL/api/sessions/$WAHA_SESSION/webhooks" \
        -H "X-Api-Key: $WAHA_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
              "url": "https://<your-n8n>/webhook/koder-kids-waha-v3",
              "events": ["message"]
            }'
   ```
   Or set it via the WAHA dashboard if you use one.
6. Activate the workflow.

---

## WAHA engine notes

WhatsApp Web deprecated native reply buttons in late 2023. The bot ships
with both an interactive payload **and** an in-body numbered fallback, so
it works on every engine:

**v3 sends only `POST /api/sendText`.** Per the official
[WAHA engines matrix](https://waha.devlike.pro/docs/how-to/engines/#-messages-1):

- **`/api/sendButtons`** is no longer in the supported APIs table for any
  engine. NOWEB still accepts the request but the message stays at
  **`PENDING`** forever and never reaches the device
  ([WAHA #669](https://github.com/devlikeapro/waha/issues/669)).
- **`/api/sendList`** is **WAHA Plus only** on **WEBJS / WPP** — **not
  available on NOWEB**.

Since this deployment runs **NOWEB / CORE**, every menu is plain text with
numbered options (`1) … 2) … 3) …`). All FSM handlers already parse digits
and keyword variants, so the UX is unchanged from the user’s perspective.

If you later move to **WAHA Plus** on **WEBJS / WPP**, you can re-introduce
list / button payloads in the four handler nodes; nothing else needs to
change.

**LID (`@lid`) inbound chats:** NOWEB often sets `payload.from` to `…@lid`
while `_data.key.remoteJidAlt` holds `…@s.whatsapp.net`. **Parse Payload**
prefers `remoteJidAlt` (normalized to **`…@c.us`**) for **`chatId`** so
replies hit the same thread as the user’s phone. Without this, replies sit
on the LID thread and never show on the handset.

---

## Manual test matrix (hybrid FSM)

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Parent: age → city → laptop → "how much is book 3?" | AI answers via koderkids tool; step moves to name ask |
| 2 | Parent: at city, ask "what cities do you teach in?" | AI answers; user can still reply 1/2/3 for city |
| 3 | Parent: complete name | CRM lead without demo/meeting; follow-up menu shown |
| 4 | Parent: pick `1` after CRM | `next_action` = Free Demo Class in session |
| 5 | School: EduAI path, all 4 fields | CRM `type=school`, notes include school type + product |
| 6 | School: Collaboration path + student count | CRM includes `estimated_students` |
| 7 | School: ERP question on lab step | Side quest uses eduai tool; resumes lab question |
| 8 | `menu` during side quest | Returns to main menu |

---

## Things this v3 keeps from v1

- WAHA transport (no Meta Cloud API migration).
- LangChain agent + Groq + `memoryBufferWindow` + jina.ai HTTP tools
  (Other branch only).
- Typing simulation (`startTyping -> wait 3-5s -> stopTyping -> send`).
- Three-rep sales notification (now env-driven).
- Identity-protection prompt on the Other agent.

## Things this v3 keeps from v2

- Group / self / non-message filter.
- Explicit session state machine in `staticData`.
- All secrets via env (no hardcoded keys, IPs, or phone numbers).
- Switch-based routing (no chained IFs).
- Structured `LEAD_DATA:{...}` parser on the Other branch.
- Backend CRM ingest endpoint (with the broken Authorization expression
  from v2 fixed).
