# API reference

All routes are Next.js route handlers under
[`src/app/api/`](../src/app/api/). Request bodies are JSON validated with Zod.
A validation failure returns `400 { error: "<prettified Zod error>" }`.
Failures from upstream services (the LLM or ElevenLabs) return `502`.

**Auth.** When `SITE_PASSCODE` is set, every route except the public ones
listed below requires a valid `callmode-access` cookie. Without one it gets
`401 { error: "locked" }`. There is no per-user ownership: anyone past the gate
can read, write or delete any session. See
[Access and security](access-and-security.md).

## Overview

| Method & path | Purpose | Called by |
| --- | --- | --- |
| `GET /api/health` | Liveness probe. **Public** | Container platform |
| `POST /api/unlock` | Check the passcode and set the access cookie. **Public** | `/unlock` form |
| `POST /api/connections` | Check the AI or ElevenLabs credentials | Settings step |
| `GET /api/scenarios` | List curated and saved templates | Situation picker |
| `POST /api/scenarios/vision` | Read a photo into text | Composer |
| `POST /api/scenarios/generate` | Design a template from a description and/or photo notes | Composer |
| `POST /api/scenarios/prepare` | Realize a template (or get it from cache) | Wizard **Start** |
| `GET /api/scenarios/:scenarioId` | Fetch a realized scenario | (not used by the UI) |
| `GET /api/templates/:templateSlug` | Fetch a saved generated template | Editor |
| `PATCH /api/templates/:templateSlug` | Update a saved generated template | Editor |
| `POST /api/sessions` | Open a run and get the agent's dynamic variables and overrides | *Start the call* |
| `POST /api/conversation-token` | Mint a short-lived WebRTC token | *Start the call* |
| `POST /api/sessions/:id/conversation` | Bind the ElevenLabs conversation id | On connect |
| `POST /api/sessions/:id/messages` | Append or update a transcript line | Every `onMessage` |
| `POST /api/sessions/:id/attempts` | Append an attempt-log entry | Client tool handlers |
| `POST /api/sessions/:id/end` | Record the outcome | `endScenario`, End button, timer |
| `DELETE /api/sessions/:id` | Delete a session with its attempts and messages | History page |
| `GET /api/sessions/:id/transcript` | Download the transcript as text | Debrief, history |
| `GET /api/sessions/:id/audio` | Download the call recording (MP3) | Debrief, history |
| `POST /api/elevenlabs/webhook` | Receive post-call analysis. **Public** (HMAC-verified) | ElevenLabs |

Types referenced below: `SessionSettings`
([`settings.ts`](../src/lib/session/settings.ts)), `ScenarioTemplate` and
`Scenario` ([`schema.ts`](../src/lib/scenario/schema.ts)), `TemplateSummary`
and `OpenedSession` ([`types.ts`](../src/lib/voice/types.ts)).

---

## Health and access

### `GET /api/health`
Returns `200 { "status": "ok" }`. It deliberately does not touch the database:
a health check that fails on a slow query would restart a server that is
working. `force-dynamic`.

### `POST /api/unlock`
```jsonc
{ "passcode": "…", "next": "/practice/abc" }   // next is optional
```
| Result | Response |
| --- | --- |
| Gate off (`SITE_PASSCODE` unset) | `200 { redirectTo }` |
| Correct | `200 { redirectTo }` + `Set-Cookie: callmode-access=…` |
| Wrong or empty | `401 { error: "invalid" }` |
| More than 10 attempts in 10 min from one client | `429 { error: "throttled" }` |

`redirectTo` is `next` if it is a same-site path (it starts with `/` but not
`//`), otherwise `/`. The client key is the first `x-forwarded-for` entry, or
`x-real-ip`. The throttle is kept in memory per server instance.

### `POST /api/connections`
```jsonc
{ "service": "ai" | "elevenlabs" }
```
- `ai`: `generateText` against `AI_MODEL` with "Reply with exactly: OK"
  (8 tokens, no retries, 12 s timeout).
- `elevenlabs`: `agents.get(ELEVENLABS_AGENT_ID)` (12 s timeout).

Success: `200 { ok: true, message: "Connected to <name> in <ms> ms." }`.
Failure: `502 { ok: false, message }`, with `sk-…` and `xi-…` tokens redacted
from the message. An unknown service returns `400`.

---

## Scenarios and templates

### `GET /api/scenarios`
```jsonc
{ "templates": TemplateSummary[] }
// { slug, title, summary, source, suggestedLevel, beatCount, userGoal, editable }
```
Curated templates (sorted by title) come first, then saved templates (newest
first). `editable` is `true` for `source: "generated"`.

### `POST /api/scenarios/vision`
```jsonc
{ "image": "data:image/jpeg;base64,…", "uiLocale": "en" | "pl" | "ru" }
```
- `400` if the data URL is malformed, the type is not JPEG, PNG, WebP or GIF,
  or the decoded size is over about 6 MB.
- `200 { "context": "<the vision model's notes>" }`
- `502` if the model fails or returns nothing.

### `POST /api/scenarios/generate`
```jsonc
{
  "description": "I need to call my landlord about…", // ≤ 500 chars, default ""
  "imageContext": "Menu del día — 14,50 €…",          // ≤ 4000 chars, default ""
  "settings": SessionSettings,
  "uiLocale": "en"                                    // default "en"
}
```
At least one of `description` (≥ 3 characters after trimming) or
`imageContext` must be present. The template is designed, saved to the
`template` table under the first free slug (the title's slug, then `-2`, `-3`…)
and returned **unrealized**: `200 { "template": ScenarioTemplate }`. Use the
returned `slug`, because it may differ from the bare title's.

### `POST /api/scenarios/prepare`
```jsonc
{ "templateSlug": "pharmacy", "settings": SessionSettings }
```
Looks up the template (curated files first, then the `template` table).
Returns the cached scenario for `realizationKey(template, settings)`, or
realizes and saves a new one.
- `200 { "scenario": Scenario, "cached": boolean }`
- `404` for an unknown slug. `502` if realization fails.

No session row is created here. That happens when the call starts.

### `GET /api/scenarios/:scenarioId`
`200 { scenario }` or `404 { error: "Not found" }`.

### `GET /api/templates/:templateSlug`
`200 { template }` for a saved **generated** template. Otherwise `404`
(curated templates are not served here).

### `PATCH /api/templates/:templateSlug`
The body is a full `ScenarioTemplate` without `slug` and `source`. It is
validated and upserted, keeping the existing slug and `source: "generated"`.
`200 { template }`, `400` or `404`.

---

## Sessions

### `POST /api/sessions`
```jsonc
{ "scenarioId": "uuid", "settings": SessionSettings }
```
```jsonc
// 200 — OpenedSession
{
  "sessionId": "uuid",
  "dynamicVariables": { "agent_name": "…", "beats_block": "…", /* … */ },
  "overrides": {
    "agent": { "language": "es", "firstMessage": "…" },
    "tts":   { "voiceId": "…?", "speed": 1 },
    "asr":   { "keywords": ["help", "me", "garganta", /* ≤ 50 */] }
  }
}
```
`404` if the scenario no longer exists. The target language, level and (if the
scenario records it) native language in `settings` are replaced by the
scenario's own before anything is built or stored. See
[The voice call](voice-call.md#dynamic-variables) for what each value contains.

### `POST /api/conversation-token`
No body. Calls `conversationalAi.conversations.getWebrtcToken({ agentId })`
with the server's API key.
- `200 { "token": "…" }`
- `500` if `ELEVENLABS_API_KEY` or `ELEVENLABS_AGENT_ID` is missing. `502` on
  an upstream failure.

### `POST /api/sessions/:id/conversation`
`{ "conversationId": "…" }` → `200 { ok: true }`. Stores the ElevenLabs
conversation id so the webhook and the audio download can find the session.

### `POST /api/sessions/:id/messages`
```jsonc
{
  "id": "client-uuid",          // primary key; a retry updates the same row
  "eventId": 12,                // optional
  "role": "agent" | "learner",
  "text": "…",
  "recommendedTerms": [],       // default []
  "agentResponseMs": 1340,      // optional, ≥ 0
  "modelResponseMs": 610,       // optional, ≥ 0
  "modelName": "…"              // optional
}
```
→ `200 { ok: true }`.

### `POST /api/sessions/:id/attempts`
```jsonc
{
  "beatId": "greeting",
  "kind": "answer" | "hint" | "repeat" | "mistake",
  "heard": "",                  // default ""
  "expected": "",               // default ""
  "verdict": "answered" | "repeated" | "partial" | "missed",   // optional
  "correction": "",             // default ""
  "category": "grammar"         // optional
}
```
→ `200 { ok: true }`. The server computes `score` from `heard` and `expected`.

### `POST /api/sessions/:id/end`
`{ "outcome": "goal-achieved" | "partial" | "abandoned" | "out-of-time",
"summary": "…" }` → `200 { ok: true }`. Sets `ended_at`, `outcome` and
`summary`.

### `DELETE /api/sessions/:id`
`200 { ok: true }` or `404 { error: "Not found" }`. Deletes the messages,
attempts and session in one transaction. The scenario is kept.

### `GET /api/sessions/:id/transcript`
`text/plain; charset=utf-8`, downloaded as `callmode-<id>.txt`. It contains the
title, start time, outcome and summary, then one line per message
(`[timestamp] You|Agent: text`) with the recommended terms used and the agent
and model timings.

### `GET /api/sessions/:id/audio`
Streams `conversationalAi.conversations.audio.get(conversationId)` as
`audio/mpeg`, downloaded as `callmode-<id>.mp3`.
- `404` if the session is missing or has no `conversationId`. `500` if
  `ELEVENLABS_API_KEY` is missing. `502` if ElevenLabs has no recording.

---

## Webhook

### `POST /api/elevenlabs/webhook`
Configure it as the agent's post-call webhook in ElevenLabs. It is public by
design: ElevenLabs sends no cookie, and every delivery is authenticated by
HMAC instead.

1. Reads the **raw** body and verifies the `ElevenLabs-Signature` header
   (`t=<unix>,v0=<hex>`) against `ELEVENLABS_WEBHOOK_SECRET`. The signature
   check comes first, then the 30-minute staleness check.
   - `500` if the secret is not configured.
   - `401 { error: "malformed" | "mismatch" | "stale" }`.
2. Ignores any `type` other than `post_call_transcription`, returning
   `200 { ok: true, ignored: "<type>" }`.
3. `400` if `data.conversation_id` is missing.
4. `attachAnalysis(...)` → `200 { ok: true, matched: boolean }`.

See [Data model → Webhook enrichment](data-model.md#webhook-enrichment).

---

## Pages

| Path | Rendered | Data |
| --- | --- | --- |
| `/` | client | `GET /api/scenarios`, settings from `localStorage` |
| `/practice/:scenarioId` | server → client | `getScenario()` on the server. 404 if missing |
| `/debrief/:sessionId` | server | `getDebrief()`. 404 if missing |
| `/history` | server (dynamic) | `listRecentSessions(100)` |
| `/unlock` | server (dynamic) + client form | Redirects away if the gate is off or the visitor is already unlocked |
