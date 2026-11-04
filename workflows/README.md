# KoderKids WhatsApp Bot — n8n Workflow

## Overview

This directory contains the n8n workflow JSON for the **KoderKids WhatsApp Bot** — a safe, production-ready automation that routes incoming WhatsApp messages to the appropriate AI specialist agent or the general Koder Agent.

**Workflow file:** [`koderkids_whatsapp_bot.json`](./koderkids_whatsapp_bot.json)

---

## Key Features (Safe Version)

| Feature | Behaviour |
|---|---|
| **Group message filter** | All messages from WhatsApp groups are silently ignored — no reply is sent |
| **Greeting / first message** | Sends a plain-text menu only — no specialist agent is invoked, preventing duplicate messages |
| **Smart routing** | Routes to the correct specialist agent based on numbered selection or natural-language keywords |
| **Default / catch-all** | Any unrecognised message is routed to the **Koder Agent** (general assistant) |
| **Lead handling** | WhatsApp enquiry creates a CRM lead via `POST /api/crm/leads/` and confirms with a reference ID |
| **Plain-text menu fallback** | If an agent call fails, a plain-text menu is returned instead of an error |

---

## Architecture

```
WhatsApp Trigger
       │
  ┌────▼────┐
  │ Is Group │──── YES ──► Ignore (no reply)
  └────┬────┘
       │ NO
       ▼
Extract & Classify Message
  (phone, body, senderName, intent)
       │
       ▼
  Route by Intent
  ├── greeting   ──► Build Welcome Menu ──────────────────────┐
  ├── fee        ──► Fee Agent (/api/ai/execute/ agent=fee)   │
  ├── lead       ──► Lead Agent (/api/crm/leads/)             ├──► Format Reply ──► Send WhatsApp Reply
  ├── inventory  ──► Inventory Agent (agent=inventory)        │
  ├── task       ──► Task Agent (agent=task)                  │
  └── (default)  ──► Koder Agent (/api/robot-reply/) ─────────┘
```

---

## Intent Classification Rules

The **Extract & Classify Message** Code node classifies each incoming message:

| Intent | Triggers |
|---|---|
| `greeting` | `hi`, `hello`, `hey`, `salam`, `start`, `menu`, `help`, or empty message |
| `fee` | Reply `1`, or message contains: `fee`, `fees`, `payment` |
| `lead` | Reply `2`, or message contains: `lead`, `enquiry`, `inquiry`, `prospect`, `new school` |
| `inventory` | Reply `3`, or message contains: `inventory`, `stock`, `item`, `supply`, `equipment` |
| `task` | Reply `4`, or message contains: `task`, `todo`, `assign`, `assignment`, `reminder` |
| `koder` | Reply `5`, `general`, `koder agent`, or **any unmatched message** (default fallback) |

---

## Backend API Endpoints Used

| Agent | Method | Endpoint | Auth |
|---|---|---|---|
| Fee Agent | `POST` | `/api/ai/execute/` `{"agent":"fee"}` | Bearer JWT |
| Lead Agent | `POST` | `/api/crm/leads/` | Bearer JWT |
| Inventory Agent | `POST` | `/api/ai/execute/` `{"agent":"inventory"}` | Bearer JWT |
| Task Agent | `POST` | `/api/ai/execute/` `{"agent":"task"}` | Bearer JWT |
| Koder Agent | `POST` | `/api/robot-reply/` | None (public) |

---

## Import & Setup Instructions

### 1. Import the workflow

1. Open your n8n instance.
2. Go to **Workflows → Import from file**.
3. Select `workflows/koderkids_whatsapp_bot.json`.
4. Click **Import**.

### 2. Configure environment variables in n8n

Go to **Settings → Environment Variables** and add:

| Variable | Description | Example |
|---|---|---|
| `BACKEND_URL` | Your KoderKids ERP backend URL | `https://api.koderkids.com` |
| `BOT_JWT_TOKEN` | JWT token for the bot service account | `eyJhbGci...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Phone Number ID | `123456789012345` |

> **Tip:** Create a dedicated service-account user in the ERP (role: Admin or Teacher) and generate a long-lived token for `BOT_JWT_TOKEN`. Never use a personal account token.

### 3. Configure credentials

In n8n, create the following credential sets:

**`WhatsApp Business API` (Trigger)**
- Type: `WhatsApp Trigger API`
- Access Token: Meta System User token
- App Secret: Meta App secret
- Verify Token: any random secret string (also set in Meta Developer Console)

**`WhatsApp Business API (Send)`**
- Type: `WhatsApp API`
- Access Token: same Meta System User token

**`KoderKids Bot JWT`**
- Type: `HTTP Header Auth`
- Name: `Authorization`
- Value: `Bearer <BOT_JWT_TOKEN>`

### 4. Configure Meta Developer Console

1. In [Meta for Developers](https://developers.facebook.com/), go to your WhatsApp Business app.
2. Under **WhatsApp → Configuration**, set the **Webhook URL** to the URL of the **WhatsApp Trigger** node in n8n (shown in the node's info panel).
3. Set the **Verify Token** to match what you entered in the n8n trigger credential.
4. Subscribe to the **messages** webhook field.

### 5. Activate the workflow

Toggle the workflow to **Active** in n8n.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Group messages still get replies | Ensure the `Is Group Message?` IF node checks both `participant` exists OR `from` contains `@g.us` |
| Duplicate welcome + agent response | Confirm only the `Build Welcome Menu` node is connected to the `greeting` output, not any agent node |
| 401 from backend | Regenerate `BOT_JWT_TOKEN`; confirm the service account exists and is active |
| `agent=inventory` returns "action not found" | The Inventory Agent may not be implemented yet — the workflow still returns a polite fallback |
| WhatsApp send fails | Check `WHATSAPP_PHONE_NUMBER_ID` env var; confirm your Meta app is approved for messaging |

---

## Node Reference

| Node | Type | Purpose |
|---|---|---|
| WhatsApp Trigger | `whatsAppTrigger` | Receives all incoming WhatsApp messages |
| Is Group Message? | `if` | Filters group messages (`participant` field or `@g.us` in `from`) |
| Ignore Group Message | `noOp` | Terminates execution for group messages silently |
| Extract & Classify Message | `code` | Extracts phone/body/name and classifies intent |
| Route by Intent | `switch` | Branches to the correct handler (6 outputs) |
| Build Welcome Menu | `code` | Produces the plain-text menu — greeting only, no agent |
| Fee Agent | `httpRequest` | Calls `/api/ai/execute/` with `agent=fee` |
| Lead Agent — Create Lead | `httpRequest` | Creates a CRM lead via `/api/crm/leads/` |
| Inventory Agent | `httpRequest` | Calls `/api/ai/execute/` with `agent=inventory` |
| Task Agent | `httpRequest` | Calls `/api/ai/execute/` with `agent=task` |
| Koder Agent (General) | `httpRequest` | Calls `/api/robot-reply/` — public, no auth needed |
| Format Reply | `code` | Normalises all agent responses into `{from, replyText}` |
| Send WhatsApp Reply | `whatsApp` | Sends the final message via WhatsApp Business Cloud API |
