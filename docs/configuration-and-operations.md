# Configuration and operations

For step-by-step setup, see [TECHNICAL.md → Setup](../TECHNICAL.md#setup).
This page is the reference.

## Environment variables

Copy `.env.example` to `.env.local`. Every variable is read on the server only.

| Variable | Required | Default | Used by |
| --- | --- | --- | --- |
| `ELEVENLABS_API_KEY` | for calls | — | Token minting, audio download, connection check |
| `ELEVENLABS_AGENT_ID` | for calls | — | Token minting, connection check. Get it from `pnpm agent:push` or `agents.json` |
| `ELEVENLABS_WEBHOOK_SECRET` | for the webhook | — | Verifying post-call webhook signatures. Without it the webhook returns `500` |
| `AI_API_KEY` | for scene writing | — | All LLM calls. Without it, generate, prepare (on a cache miss), vision and the AI connection check fail |
| `AI_BASE_URL` | no | empty → Anthropic | Any OpenAI-compatible endpoint (structured outputs are forced on) |
| `AI_MODEL` | no | `claude-sonnet-5` | Template design and realization |
| `AI_VISION_MODEL` | no | `AI_MODEL` | Photo reading. **Must be vision-capable** |
| `DATABASE_URL` | yes, in deployment | `postgresql://postgres:postgres@localhost:5432/callmode` | Everything stateful. Use `sslmode=verify-full` for hosted Postgres |
| `DATABASE_POOL_MAX` | no | `5` | Pool size per process. Keep it small: pooled providers count every socket |
| `SITE_PASSCODE` | no | empty → site open | The access gate. Changing it logs everyone out |
| `NODE_ENV` | — | — | `production` adds `Secure` to the access cookie and disables the dev pool cache |

What still works without keys (after `pnpm db:seed`): the setup wizard, the
picker, the editor for the seeded situation, `/practice/demo-pharmacy-es` (up
to *Start the call*), `/debrief/demo-session` and `/history`.

## Running locally

```sh
pnpm install
cp .env.example .env.local   # fill in
pnpm db:migrate              # create tables in DATABASE_URL
pnpm db:seed                 # optional: demo rows
pnpm dev                     # http://localhost:3000
```

The microphone only works on `localhost` or HTTPS. To use a tunnel host in
development, add it to `allowedDevOrigins` in `next.config.ts`.

## The agent as code

The ElevenLabs agent is defined by files in this repo:

```
agent/prompts/roleplay-tutor.md      ← edit this
agent/tool_configs/<tool>.json       ← and these (one per client tool)
        │
        │  npx @elevenlabs/cli tools push      → writes tool ids to tools.json
        ▼
tools.json
        │
        │  node agent/build.mjs                → prompt + tool ids → config
        ▼
agent/agent_configs/roleplay-tutor.json   (generated — do not edit)
        │
        │  pnpm agent:diff  (= agents push --dry-run)
        │  pnpm agent:push  (= agents push)
        ▼
ElevenLabs agent  (id recorded in agents.json)
```

First time:
```sh
npx @elevenlabs/cli auth login
npx @elevenlabs/cli tools push
node agent/build.mjs
pnpm agent:diff
pnpm agent:push
# put the agent id into ELEVENLABS_AGENT_ID
```

Changing the prompt: edit `roleplay-tutor.md`, run `node agent/build.mjs`, then
`pnpm agent:diff` and `pnpm agent:push`.

- `build.mjs` exits with an error if a tool in `agent/tool_configs/` has no id
  in `tools.json`. Push the tools first.
- If you add or rename a `{{placeholder}}` in the prompt, add a matching value
  in `buildDynamicVariables()`. The test
  `provides a value for every placeholder in the agent prompt` fails until you
  do.
- If you add a client tool, add its JSON in `agent/tool_configs/`, push the
  tools, rebuild, and register a handler with `useConversationClientTool` in
  `use-practice-session.ts`. Without a handler, the agent's call goes
  unanswered.
- **Enable the overrides** in the agent's *Security → overrides* settings:
  first message, language, voice, speed and ASR keywords. The config requests
  them, but if the platform has them disabled they are **silently ignored**.
- `pnpm agent:pull` pulls the remote config back down.

### Receiving the post-call webhook locally
```sh
cloudflared tunnel --url http://localhost:3000
# In ElevenLabs, set the agent's post-call webhook to
#   https://<tunnel>/api/elevenlabs/webhook
# and copy its signing secret into ELEVENLABS_WEBHOOK_SECRET.
```

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js dev server, production build, production server |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` / `test:watch` | Vitest (`src/**/*.test.ts`, node environment, `~` → `src`) |
| `pnpm db:migrate` | Apply `drizzle/*.sql` to `DATABASE_URL` (`scripts/migrate.mjs`) |
| `pnpm db:push` | `drizzle-kit push` (development schema sync) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | Insert the demo template, scenario and session |
| `pnpm db:import-sqlite <file>` | One-off, idempotent import from the old SQLite database |
| `pnpm agent:pull` / `agent:diff` / `agent:push` | ElevenLabs CLI agent sync |

Changing the DB schema: edit `src/lib/db/schema.ts`, generate a migration with
`npx drizzle-kit generate`, commit the new `drizzle/` files, then run
`pnpm db:migrate`.

## Deployment

### Vercel (the demo)
A standard Next.js deployment. Set the environment variables, and point
`DATABASE_URL` at a managed Postgres (the demo uses Neon). Run
`pnpm db:migrate` against that database from a machine that can reach it.
`@vercel/analytics` is already included in the layout.

### Docker (self-hosting)
The [`Dockerfile`](../Dockerfile) builds in three stages (deps → build →
runtime) on `node:24-alpine`:

- **Not a standalone build.** `loadTemplates()` reads
  `src/data/templates/*.json` from `process.cwd()` at request time, so the
  runtime image keeps `src/`, `drizzle/` and `scripts/` alongside `.next/` and
  `node_modules/`.
- **Migrations run on every start**:
  `node scripts/migrate.mjs && exec node_modules/.bin/next start`.
- `next` is started directly rather than through pnpm, so restarting the
  container does not depend on reaching the npm registry through corepack.
- `next build` needs no database. The pool is created but connects lazily.
- It listens on `0.0.0.0:3000`. Use `/api/health` as the liveness probe, which
  is public and does not touch the DB.

```sh
docker build -t callmode .
docker run -p 3000:3000 --env-file .env.local \
  -e DATABASE_URL=postgresql://user:pass@db:5432/callmode callmode
```

### Behind a proxy or tunnel
The gate builds redirect URLs from `x-forwarded-host` and `x-forwarded-proto`,
so the same container works on a LAN hostname and on a public tunnel. The
unlock throttle keys on `x-forwarded-for`, so make sure the proxy sets it.

## Tests

`pnpm test` runs the Vitest unit tests in 16 files. They all run in Node and
none need a network, database or API keys.

| File | Covers |
| --- | --- |
| `auth/decide.test.ts` | Every gate decision: gate off, public paths, `?key=` right and wrong (always stripped), valid, expired and forged cookies, API refuse vs page challenge, safe `next`, forwarded origin |
| `auth/gate.test.ts` | Passcode reading and trimming, timing-safe compare, token mint, verify and expiry, rotation invalidating tokens |
| `scenario/generate.test.ts` | `mergeRealization` (template structure wins, invented beats ignored, skipped beats dropped, empty or malformed results refused, languages recorded on the scene), the cache key (stable, and changes with language, level, photo or template edits but not with play-only settings) and slug candidates for a taken title |
| `scenario/library.test.ts` | Every curated template parses, has a unique slug, enough beats, unique beat ids and vocabulary |
| `scenario/prompt.test.ts` | Photo notes reach both prompts. The photo becomes the brief when nothing was typed |
| `scenario/vision.test.ts` | Data-URL parsing, type and size refusal, decoded-size maths |
| `session/dynamic-variables.test.ts` | Every prompt placeholder is provided, only primitives are passed, all three hint modes and the language policy, ASR keyword boosting and the 50 cap, first message and speed, session voice over scenario voice, a call pinned to its scene's language and level |
| `voice/attempts.test.ts` | Filing a judged turn as a repetition or an answer, including `partial` with and without an open hint |
| `session/similarity.test.ts` | Normalization and scoring at each tolerance |
| `session/recommended-terms.test.ts` | Case-, accent- and punctuation-insensitive phrase matching with word boundaries |
| `session/post-call-transcript.test.ts` | TTFB extraction from snake_case and camelCase metrics |
| `webhook/verify.test.ts` | Valid, tampered, wrong-secret, replayed, slow and malformed deliveries |
| `i18n/*.test.ts` | Exactly en, pl and ru. Interpolation. Curated copy localization |
| `image/downscale.test.ts`, `speech/dictation.test.ts` | Resize maths. Merging dictated text |

Not covered by tests: React components, route handlers end to end, the
database layer and the live call. Check those by running the app (`pnpm dev`,
then a real call).

## Interface language and theme

- **UI locales**: `en`, `pl` and `ru`
  ([`src/lib/i18n/`](../src/lib/i18n/)). The choice is stored in the
  `callmode-locale` cookie (1 year), read on the server by `getServerLocale()`
  and provided to the client by `I18nProvider`. All strings are in
  `messages.ts`, and `translate(locale, key, values)` interpolates `{name}`
  placeholders.
- The UI locale also decides the language in which generated situations and
  photo notes are **authored** (`authoringLanguage`), and the locale used for
  dictation.
- Curated template titles, summaries and goals are translated for pl and ru in
  `template-copy.ts`. The realized scenario's own text is not affected.
- **Theme**: `callmode-theme` in `localStorage` (`light` or `dark`), falling
  back to `prefers-color-scheme`. An inline script in the layout applies it
  before paint.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Every scene runs in the agent's base language (Spanish) at default speed | Overrides are not enabled on the agent (*Security → overrides*) |
| Hints are spoken but never appear on screen | `client_tool_call` is missing from `client_events`, or the tool is not attached to the agent |
| *Setting the scene…* hangs or returns 502 | The LLM endpoint or model is wrong. Use *Connections → Check AI* in the settings step |
| Every generation fails to parse on an OpenAI-compatible endpoint | The endpoint has no `json_schema` support. `supportsStructuredOutputs` is forced on in `provider.ts` |
| A photo is "read" as nonsense or the request is refused | `AI_VISION_MODEL` is unset and `AI_MODEL` is text-only |
| *Model* timing stays *pending* and there is no post-call analysis | The webhook is not reaching the app (no public URL, wrong URL or wrong secret) |
| *Download speech recording* is not offered | No `conversation_id` was bound (the call never connected) |
| Debrief shows *Unfinished* | The call ended without `/end`: a dropped connection, a closed tab or a connect failure |
| `401 locked` from the API in the browser | `SITE_PASSCODE` was set or changed. Unlock again |
| Microphone blocked | The page is not on `localhost` or HTTPS |
