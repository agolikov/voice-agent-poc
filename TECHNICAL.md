# CallMode — technical notes

What the app is, how to run it, and the decisions worth knowing.
For what it does and why, see [README.md](README.md).

## Stack

| Layer | What the demo uses |
| --- | --- |
| App | Next.js 16 (App Router), React 19, Tailwind 4 |
| Voice | ElevenLabs Agents over WebRTC — `scribe_realtime` ASR, `eleven_flash_v2_5` TTS, `gemini-2.5-flash` behind the agent |
| Scene writing | Nebius Token Factory, `Qwen/Qwen3-32B`; `Qwen/Qwen2.5-VL-72B-Instruct` reads photos |
| Storage | Postgres, through Drizzle and `node-postgres` — Neon for the demo |
| Hosting | Vercel for the demo; the `Dockerfile` is the self-host path |
| Access | one shared passcode, no accounts |

`AI_BASE_URL` / `AI_MODEL` take any OpenAI-compatible endpoint, an empty
`AI_BASE_URL` talks to Anthropic directly, and `DATABASE_URL` takes any Postgres.
The voice layer is the one part that is not swappable.

## Setup

```sh
pnpm install
cp .env.example .env.local        # then fill it in
pnpm db:migrate                   # create the Postgres tables
pnpm dev                          # http://localhost:3000
```

The microphone needs `localhost` or HTTPS.

`AI_VISION_MODEL` is the model that reads photos and has to be vision-capable —
unset, `AI_MODEL` is asked to look, which is right for Anthropic and wrong for a
text-only open-weights endpoint.

### Create the agent

The agent is configuration as code: the prompt lives in
`agent/prompts/roleplay-tutor.md`, and the JSON pushed to ElevenLabs is generated
from it.

```sh
npx @elevenlabs/cli auth login
npx @elevenlabs/cli tools push             # the six client tools
node agent/build.mjs                       # prompt.md + tool ids -> agent config
npx @elevenlabs/cli agents push --dry-run  # check the diff first
npx @elevenlabs/cli agents push
```

Put the resulting agent id in `ELEVENLABS_AGENT_ID`.

> **Overrides fail silently.** In the agent's **Security → overrides** settings,
> enable first message, language, voice, speed and ASR keywords. If they are off,
> the platform ignores them without an error and every scene runs in English at
> default speed.

### Seeing it without any keys

```sh
pnpm db:seed
```

Seeds one editable saved situation, one hand-written Spanish scene and one
finished session, so the situation editor, `/practice/demo-pharmacy-es` and
`/debrief/demo-session` are inspectable with nothing configured.

## Architecture

```
src/lib/scenario/    templates, realization, reading photos, the generation prompts
src/lib/session/     settings, dynamic variables, similarity scoring
src/lib/voice/       the practice session hook and its client tools
src/lib/db/          drizzle schema and queries
src/lib/auth/        the shared-passcode gate, driven by src/proxy.ts
src/app/api/         token minting, scenarios, vision, sessions, the post-call webhook
agent/               agent + client tool config, and the prompt they are built from
```

Two jobs, and they are not solved by the same thing.

**The conversation is an ElevenLabs voice agent.** Recognition, turn-taking and
speech synthesis sit behind one realtime session the browser joins over WebRTC —
not a pipeline of STT, then an LLM, then TTS, each waiting on the one before it.
What the app is selling is the feeling that someone is waiting for you to speak,
and that feeling is made of latency.

The agent drives the screen through six client tools the browser implements:
`showHint`, `recordAttempt`, `advanceBeat`, `logMistake`, `changeSituation` and
`endScenario`. The help loop is those calls arriving in order, and the debrief is
assembled from them as they land.

**The scenes are written by an open-weight model.** Bounded, structured work: fill
a schema with a setting, two roles, a goal, and the beats, each with its model
answer and key phrases. It is asked for with `generateObject` against the same Zod
schema the app validates against anyway, so the model fills a shape rather than
returning prose someone has to dig an object out of. No frontier model needed.

The browser never holds `ELEVENLABS_API_KEY` — it asks `/api/conversation-token`
for a short-lived WebRTC token instead.

Dynamic variables and overrides are built server-side in
`src/lib/session/dynamic-variables.ts`, so the contract with the prompt lives in
one place. A test asserts that every `{{placeholder}}` in the prompt has a value
behind it: a placeholder with nothing behind it reaches the model as literal text
and silently drops whatever instruction it carried.

### The help loop, mechanically

The button and the <kbd>H</kbd> key send a literal `[HELP]` message and never
touch speech recognition, so they cannot be misheard. The spoken trigger is a
fallback, boosted through ASR keywords.

### Templates and realization

Curated situations ship as language-neutral templates in `src/data/templates/` —
the situation design is what is worth curating, not the Spanish for "I'd like to
return this". A template is realized into a concrete scene for a given language
and level on first use and then cached, so the second run costs nothing.
User-described situations become templates too and go through the identical path.

Photos: a vision model reads the image once, and the reading is shown to the user
in an editable box before anything is written on top of it — a misread price is
obvious there and invisible three steps later. What is stored on the template is
that text, not the image, so replaying next month does not depend on the photo
still existing. Leave the description empty and the scene is built from the
picture alone.

### The debrief does not wait for the webhook

Every judged turn is logged live through client tools, so the debrief is complete
when the call ends. The post-call webhook only adds ElevenLabs' own analysis when
it arrives — which in local development, with no public URL, it never does.
Deleting a history row takes its attempts and transcript with it and leaves the
realized scene alone, since other runs still point at it.

To receive the webhook locally:

```sh
cloudflared tunnel --url http://localhost:3000
# point the agent's post-call webhook at https://<tunnel>/api/elevenlabs/webhook
```

## Site access

`SITE_PASSCODE` puts one shared code in front of the whole site. Deliberately not
an account system: every visitor is the same anonymous user. What it buys is that
a crawler, a scanner, or someone who guessed the hostname cannot reach the app —
nor spend the voice minutes and model tokens it holds credentials for.

```sh
# Hex rather than base64: the code also has to survive a `?key=` link, where
# base64's `+` decodes back as a space.
SITE_PASSCODE=$(openssl rand -hex 12)
```

Leave it unset and the site runs open, which is what local development wants. Set
it and everything is gated:

- A page request with no valid cookie redirects to `/unlock`, which asks for the
  code and returns the visitor to where they were headed.
- An API request with no valid cookie gets `401` — there is no HTML redirect for
  `fetch` to follow.
- `https://<host>/?key=<code>` unlocks in one click and redirects to strip the
  parameter, so you can hand out a single link. It keeps the code out of the
  address bar, history and `Referer`, but it does pass through the server's
  access log once; the typed code does not.

Redirects are built from `x-forwarded-host` when a proxy set it, so the gate works
unchanged on every hostname the app is served on. Without that, a visitor arriving
through a tunnel would be redirected to the internal hostname they cannot resolve.

Two paths stay public by design, both in `src/lib/auth/decide.ts`: `/api/health`,
because a liveness probe carries no cookie and a `401` would restart a healthy
container, and `/api/elevenlabs/webhook`, because ElevenLabs carries no cookie
either and already authenticates every delivery by HMAC.

The cookie is HTTP-only and signed with the passcode itself, so **changing
`SITE_PASSCODE` logs everyone out** rather than only stopping new arrivals. Its
30-day expiry is inside the signed payload, so a value copied out of a browser
still stops working. `/api/unlock` throttles guesses per client in memory, which
is enough for one container and would need shared state behind more than one.

## Testing

```sh
pnpm test        # vitest
pnpm typecheck
pnpm build
```

The suite covers the prompt/variable contract, all three hint modes, the ASR
keyword cap, template/realization merging including malformed and incomplete model
responses, the cache key — including that two photos of two different menus do not
collide on it — what the vision endpoint will and will not accept from the
browser, that a photo reaches both the model that designs the scene and the model
that writes its lines, repeat scoring at each tolerance, and webhook signature
verification against tampered, wrong-secret, replayed and malformed deliveries.

Pronunciation is not scored: ElevenLabs' ASR returns text, not phonemes. Azure's
Pronunciation Assessment is the upgrade path if that turns out to matter.

## Future improvements

Three sides of one idea: the app should know what you personally cannot say yet,
and spend the voice minutes there.

**Say what a scene has to exercise.** Today you pick a situation and a level, and
what comes back is whatever the model thought fitted. There is no way to require
the past conditional, or these twelve words, or the formal register throughout.
A scene is realized from a template plus settings, so this is a third input to
realization: an inventory the writer builds beats around and the repeat gate
scores against.

**Read the sessions already stored.** Every judged turn is logged with what was
expected, what was heard, a verdict and a similarity score; every correction is
categorised. Nothing reads any of it across sessions — the debrief looks at one
call and forgets it. That history is the raw material for everything here, and it
is being written today.

**Practise the gaps, not the topic.** Picking a situation is picking a topic, and
you get whatever vocabulary that topic carries. Aggregated, the attempt log says
which structures fail and which words never survive a repeat. The app should write
the scene that puts exactly those in your mouth, and bring them back until the
scores say they have stuck.
