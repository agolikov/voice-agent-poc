# CallMode

Practise a real conversation in the language you are learning, out loud, with an
ElevenLabs voice agent playing the other person.

Pick a situation or describe one. The agent plays the pharmacist, the hiring
manager, the landlord — and works through the scene beat by beat, asking and then
waiting. When you are stuck, you ask for help: it gives you one line in the target
language, **you say it back**, and the scene carries on. At the end you get a
debrief of the lines you were given, the ones you missed, and what to fix.

## Watch it

[**A 26-second walkthrough**](callmode-walkthrough.mp4) — English interface,
learning Polish, one situation from the library, straight through to the brief.
Silent, and it stops where the microphone would take over.

## The help loop

This is the part worth understanding, because it is what makes the app different
from talking to a chatbot.

1. Press <kbd>H</kbd>, hit **Help me say this**, or say your trigger word.
2. The model answer for the current beat appears on screen and the agent says it.
3. The agent asks you to repeat it, and stops. It will not continue for you.
4. It grades your repetition against the model answer.
5. Miss it twice and it corrects you, logs it, and moves on — the scene never
   deadlocks on a misheard word.

The button and the <kbd>H</kbd> key send a literal `[HELP]` message and never touch
speech recognition, so they cannot be misheard. The spoken trigger is a fallback,
boosted through ASR keywords.

The whole script is also available before the call, collapsed, behind one
confirmation. It is a spoiler in the strict sense — the scene works by putting you
somewhere you have to produce a line, and reading it first replaces producing it
with recognising it — so it asks whether you are sure, and it is not offered once
the call is live. It exists because a learner too nervous to press the button does
not practise at all.

## Everything is a per-run setting

Target and native language, level, hint mode, hint length, repeat policy and
tolerance, correction style, speaking pace, whether the agent may ever use your
language, and a hard time limit. Change any of them and run the same situation
again — it plays differently. Settings live in your browser and persist between
runs.

Three hint modes:

| Mode | What you hear | What you see |
| --- | --- | --- |
| `target-only` | the line, target language only | the line |
| `target-plus-translation` | the line, target language only | the line and its meaning |
| `native-cue-first` | one sentence of your language, then the line | the line and its meaning |

## Situations

Curated situations ship as **language-neutral templates** in `src/data/templates/`
— the situation design is what is worth curating, not the Spanish for "I'd like to
return this". A template is realized into a concrete scene for your language and
level on first use and then cached, so the second run of the same situation costs
nothing. Situations you describe yourself become templates too, and go through the
identical path.

### Build one from a photo

Photograph the menu in front of you, the timetable on the wall, the letter from
the tax office. A vision model reads it once, and the scene is written from what
is actually in it: the real dishes at the real prices, the platform number that
is really printed there.

The reading is shown to you before anything is written on top of it, in a box you
can edit — a misread price is obvious there and invisible three steps later. What
gets stored on the template is that text, not the image, so replaying the
situation next month does not depend on the photo still existing.

A photo is a brief on its own: leave the description empty and the scene is built
from the picture alone. `AI_VISION_MODEL` picks the model that does the reading.

## Tech

Two jobs, and they are not solved by the same thing.

**The conversation is an ElevenLabs voice agent.** Recognition, the turn-taking
model and speech synthesis sit behind one realtime session the browser joins
over WebRTC — not a pipeline of STT, then an LLM, then TTS, each waiting on the
one before it. What the app is selling is the feeling that someone is waiting
for you to speak, and that feeling is made of latency.

The agent also drives the screen, through six client tools the browser
implements: `showHint`, `recordAttempt`, `advanceBeat`, `logMistake`,
`changeSituation` and `endScenario`. The help loop is those calls arriving in
order, and the debrief is assembled from them as they land.

**The scenes are written by an open-weight model.** That is bounded, structured
work — fill a schema with a setting, two roles, a goal, and the beats, each with
its model answer and key phrases. It is asked for with `generateObject` against
the same Zod schema the app validates against anyway, so the model fills a shape
rather than returning prose someone has to dig an object out of. It does not
need a frontier model, and the demo runs `Qwen/Qwen3-32B` on an
OpenAI-compatible endpoint. Photographs go to a separate vision model: reading a
menu and writing a scene are different jobs, and whatever is best at one is
rarely the cheapest at the other.

That half is deliberately portable. `AI_BASE_URL` and `AI_MODEL` take any
OpenAI-compatible endpoint, leaving `AI_BASE_URL` empty talks to Anthropic
directly, and `DATABASE_URL` takes any Postgres. The voice layer is the one part
that is not swappable.

| Layer | What the demo uses |
| --- | --- |
| App | Next.js 16 (App Router), React 19, Tailwind 4 |
| Voice | ElevenLabs Agents over WebRTC — `scribe_realtime` ASR, `eleven_flash_v2_5` TTS, `gemini-2.5-flash` behind the agent |
| Scene writing | Nebius Token Factory, `Qwen/Qwen3-32B`; `Qwen/Qwen2.5-VL-72B-Instruct` reads photos |
| Storage | Postgres, through Drizzle and `node-postgres` — Neon for the demo |
| Hosting | Vercel for the demo; the `Dockerfile` is the self-host path |
| Access | one shared passcode, no accounts |

## Setup

```sh
pnpm install
cp .env.example .env.local        # then fill it in
pnpm db:migrate                   # create the Postgres tables
```

`AI_BASE_URL` takes any OpenAI-compatible endpoint; leave it empty to talk to
Anthropic directly. `AI_VISION_MODEL` is the model that reads photos, and has to
be vision-capable — unset, `AI_MODEL` is asked to look, which is right for
Anthropic and wrong for a text-only open-weights endpoint. On Nebius,
`Qwen/Qwen2.5-VL-72B-Instruct` reads a menu down to the cents.

### 1. Create the agent

The agent is configuration as code. Its prompt lives in
`agent/prompts/roleplay-tutor.md`; the JSON pushed to ElevenLabs is generated from
it.

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

### 2. Run it

```sh
pnpm dev          # http://localhost:3000
```

The microphone needs `localhost` or HTTPS.

### Seeing it without any keys

```sh
pnpm db:seed
```

Seeds one editable saved situation, one hand-written Spanish scene and one
finished session, so the situation editor, `/practice/demo-pharmacy-es` and
`/debrief/demo-session` are inspectable with nothing configured.

## Site access

`SITE_PASSCODE` puts one shared code in front of the whole site. This is
deliberately not an account system: the demo is shown to people who should not
have to sign up, and every visitor is the same anonymous user. What it buys is
that a crawler, a scanner, or someone who guessed the hostname cannot reach the
app — nor spend the ElevenLabs voice minutes and model tokens it holds
credentials for.

```sh
# Hex rather than base64: the code also has to survive a `?key=` link, where
# base64's `+` decodes back as a space.
SITE_PASSCODE=$(openssl rand -hex 12)
```

Leave it unset and the site runs open, which is what local development wants.
Set it and everything is gated:

- A page request with no valid cookie redirects to `/unlock`, which asks for the
  code and returns the visitor to where they were headed.
- An API request with no valid cookie gets `401` — there is no HTML redirect for
  `fetch` to follow.
- `https://<host>/?key=<code>` unlocks in one click and redirects to strip the
  parameter, so you can hand out a single link. It keeps the code out of the
  address bar, browser history and `Referer`, but it does pass through the
  server's access log once; the typed code does not.

Redirects are built from `x-forwarded-host` when a proxy set it, so the gate
works unchanged on every hostname the app is served on — the LAN route and any
tunnel in front of it. Without that, a visitor arriving through a tunnel would
be redirected to the internal hostname, which they cannot resolve.

Two paths stay public by design, both in `src/lib/auth/decide.ts`:
`/api/health`, because a liveness probe carries no cookie and a `401` would
restart a healthy container, and `/api/elevenlabs/webhook`, because ElevenLabs
carries no cookie either and already authenticates every delivery by HMAC.

The cookie is HTTP-only and signed with the passcode itself, so **changing
`SITE_PASSCODE` logs everyone out** rather than only stopping new arrivals. Its
30-day expiry is inside the signed payload, so a value copied out of a browser
still stops working. `/api/unlock` throttles guesses per client in memory,
which is enough for one container and would need shared state behind more
than one.

## How it fits together

```
src/lib/scenario/    templates, realization, reading photos, the generation prompts
src/lib/session/     settings, dynamic variables, similarity scoring
src/lib/voice/       the practice session hook and its client tools
src/lib/db/          drizzle schema and queries
src/lib/auth/        the shared-passcode gate, driven by src/proxy.ts
src/app/api/         token minting, scenarios, vision, sessions, the post-call webhook
agent/               agent + client tool config, and the prompt they are built from
```

The browser never holds `ELEVENLABS_API_KEY`. It asks `/api/conversation-token`
for a short-lived WebRTC token instead.

Dynamic variables and overrides are built server-side in
`src/lib/session/dynamic-variables.ts` so the contract with the prompt lives in one
place — and a test asserts that every `{{placeholder}}` in the prompt has a value
behind it, because a placeholder with nothing behind it reaches the model as
literal text and silently drops whatever instruction it carried.

## The debrief does not wait for the webhook

Every judged turn is logged live through client tools, so the debrief is complete
the moment the call ends. The post-call webhook adds ElevenLabs' own analysis when
it arrives — which in local development, with no public URL, it never does. Nothing
depends on it.

Past runs are listed at `/history`, newest first, each row linking to its
debrief with the transcript and — when ElevenLabs kept a recording — the audio.
A row can be deleted from there, which takes its attempts and its transcript
with it and leaves the realized scene alone, since other runs still point at it.

To receive it anyway:

```sh
cloudflared tunnel --url http://localhost:3000
# point the agent's post-call webhook at https://<tunnel>/api/elevenlabs/webhook
```

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

## Cost

Voice minutes are billed at roughly $0.08–0.10 per minute, so a ten-minute session
is about a dollar. `maxDurationMinutes` ends the call itself; the agent is also told
the limit so it can steer to a close rather than being cut off mid-sentence.

## What this does not do

Pronunciation is not scored. ElevenLabs' ASR returns text, not phonemes, so the
repeat gate judges phrasing and word choice and is blind to accent. Azure's
Pronunciation Assessment is the upgrade path if that turns out to matter.

## Future improvements

The scene you get is shaped by the situation and your level, and by nothing
else. The three below are one idea from three sides: the app should know what
you personally cannot say yet, and spend the voice minutes there.

**Say what a scene has to exercise.** You pick a situation and a level, and what
comes back is whatever the model thought fitted. There is no way to say that
this run must make you produce the past conditional, or these twelve words, or
the formal register throughout. A scene is realized from a template plus
settings, so this is a third input to that realization: a required inventory the
writer has to build beats around, and the repeat gate has to score against.

**Read the sessions already stored.** Every judged turn is logged with what was
expected, what was heard, a verdict and a similarity score, and every mistake
the agent corrects is filed under `grammar`, `vocabulary`, `word-order`,
`register` or `pronunciation`. Nothing reads any of it across sessions — the
debrief looks at one call and forgets it. That history is the raw material for
everything here, and it is being written today.

**Practise the gaps, not the topic.** Picking a situation is picking a topic,
and the vocabulary you get is whatever that topic happens to carry: the words
you already have come round again, and the ones you keep missing turn up only by
accident. Aggregated across sessions, the attempt log says which structures fail
and which words never survive a repeat. The app should be able to write the
scene that puts exactly those in your mouth, and to bring them back until the
scores say they have stuck.
