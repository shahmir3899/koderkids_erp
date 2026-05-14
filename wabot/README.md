# Koder Kids WhatsApp Bot — v3

This folder contains the n8n workflow that powers the Koder Kids WhatsApp
sales / support bot.

| File       | Purpose                                                             |
|------------|---------------------------------------------------------------------|
| `v1.txt`   | Reference snapshot of the original production flow (WAHA + 3 agents).|
| `v2.txt`   | Reference snapshot of the Meta Cloud-API exploratory rewrite.        |
| `v3.json`  | **The current bot** — WAHA, strict button FSMs + Other agent + CRM.  |

> v1 and v2 are kept as read-only references. Import only `v3.json` into n8n.

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
    Main Menu      Parse Role     Parent FSM        School FSM      Other Agent
                                                                  (LangChain + Groq
                                                                   + memory +
                                                                   koderkids.pk /
                                                                   kodereduai.pk
                                                                   tools)
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
| Parent | Strict button-only FSM: child age -> city -> laptop -> interest -> name. No LLM calls. Sends to CRM as `type=parent`.    |
| School | Strict FSM: school name -> city -> lab -> interest -> name+role. No LLM calls. Sends to CRM as `type=school`.            |
| Other  | Default. LangChain agent with Groq llama-3.3-70b, memory buffer, and live website tools. Sends to CRM as `type=other`.   |

The Other agent is also the **fallback** for:

- Anything entered before the role is picked.
- Two failed parses inside the Parent or School FSM (the user gets escalated automatically).
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
      | 'awaiting_parent_interest' | 'awaiting_parent_name'
      | 'awaiting_school_name' | 'awaiting_school_city' | 'awaiting_school_lab'
      | 'awaiting_school_interest' | 'awaiting_school_role'
      | 'in_other' | 'lead_done',
  role: 'parent' | 'school' | 'other' | null,
  data: { /* collected fields */ },
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

## Troubleshooting: `access to env vars denied`

Self-hosted n8n **2.x** blocks the **`$env` expression proxy** almost everywhere
(Code nodes, **Set** node field expressions, and often **HTTP Request** URL /
header expressions). You may see:

`Problem in node 'Inject Env Config' access to env vars denied`

### What v3 does now

1. **`Inject Env Config` is a Code node** (not Set). It reads **`process.env`**
   (the real OS / Docker environment) and merges `wahaSession`, `wahaBaseUrl`,
   `wahaApiKey`, `backendUrl`, etc. onto the webhook item. That avoids the
   blocked `$env` helper entirely.

2. **HTTP Request nodes** no longer use `$env`. They use
   `{{ $('Inject Env Config').first().json.wahaBaseUrl }}` (and the same pattern
   for API keys and the CRM URL).

3. **Other Code nodes** keep using `$('Inject Env Config').first().json` for
   WAHA session and sales rep numbers.

### If `wahaBaseUrl` / keys are still empty at runtime

Some task runners ship a **stripped `process.env`**. Then either:

- Set **`N8N_BLOCK_ENV_ACCESS_IN_NODE=false`** on the n8n process and restart
  (allows `$env` again if you prefer that style), **or**

- Store values as **n8n Variables** (`$vars.*`) or **Credentials**, and change
  **Inject Env Config** to read those instead of `process.env`.

The old “Set node + `$env`” pattern is **not** reliable on locked-down n8n 2.x.

---

## Environment variables

### n8n side

| Env var                | Required | Example                                                              | Purpose                                                                 |
|------------------------|----------|----------------------------------------------------------------------|-------------------------------------------------------------------------|
| `WAHA_BASE_URL`        | yes      | `http://212.224.86.152:3000`                                         | Base URL of your WAHA instance.                                         |
| `WAHA_API_KEY`         | yes      | `e7038641...`                                                        | `X-Api-Key` for WAHA endpoints.                                         |
| `WAHA_SESSION`         | yes      | `default`                                                            | WAHA session name (use `default` unless multiple).                      |
| `BACKEND_URL`          | yes      | `https://koderkids-erp.onrender.com`                                 | Django backend base URL.                                                |
| `BACKEND_WA_BOT_KEY`   | yes      | a random 40+ char string                                             | Must match `WHATSAPP_BOT_KEY` on the Django side.                       |
| `SALES_REP_1`          | yes      | `923339446254`                                                       | First sales rep to notify (no `@c.us` suffix needed; auto-appended).    |
| `SALES_REP_2`          | optional | `923329779989`                                                       | Second sales rep.                                                       |
| `SALES_REP_3`          | optional | `923185414080`                                                       | Third sales rep.                                                        |
| `FRONTEND_URL`         | optional | `https://frontend.koderkids.pk`                                      | Used in notifications to deep-link to the CRM lead page.                |

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

## Importing the workflow

1. Open n8n -> Workflows -> Import from File -> select `wabot/v3.json`.
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

- **WAHA Plus / NOWEB+** — buttons and lists render as tappable WhatsApp
  interactive messages.
- **Plain WAHA (WEBJS / GOWS)** — the user sees the same message but the
  buttons may collapse into the body text. They simply type `1`, `2`,
  `3`. Every FSM handler parses both interactive replies and text.

If you upgrade your WAHA engine later, no workflow change is needed.

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
