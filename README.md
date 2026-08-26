# CallMode

Practise a real conversation in the language you are learning, out loud, with an
ElevenLabs voice agent playing the other person.

Pick a situation or describe one. The agent plays the pharmacist, the hiring
manager, the landlord — and works through the scene beat by beat, asking and then
waiting. When you are stuck, you ask for help: it gives you one line in the target
language, **you say it back**, and the scene carries on. At the end you get a
debrief of the lines you were given, the ones you missed, and what to fix.

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

## Setup

```sh
pnpm install
cp .env.example .env.local        # then fill it in
pnpm db:push                      # create the SQLite tables
```

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

Seeds one hand-written Spanish scene and one finished session, so
`/practice/demo-pharmacy-es` and `/debrief/demo-session` are inspectable with
nothing configured.

## How it fits together

```
src/lib/scenario/    templates, realization, the generation prompts
src/lib/session/     settings, dynamic variables, similarity scoring
src/lib/voice/       the practice session hook and its client tools
src/lib/db/          drizzle schema and queries
src/app/api/         token minting, scenarios, sessions, the post-call webhook
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
responses, the cache key, repeat scoring at each tolerance, and webhook signature
verification against tampered, wrong-secret, replayed and malformed deliveries.

## Cost

Voice minutes are billed at roughly $0.08–0.10 per minute, so a ten-minute session
is about a dollar. `maxDurationMinutes` ends the call itself; the agent is also told
the limit so it can steer to a close rather than being cut off mid-sentence.

## What this does not do

Pronunciation is not scored. ElevenLabs' ASR returns text, not phonemes, so the
repeat gate judges phrasing and word choice and is blind to accent. Azure's
Pronunciation Assessment is the upgrade path if that turns out to matter.
