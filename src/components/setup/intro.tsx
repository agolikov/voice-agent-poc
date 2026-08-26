import { Card } from "~/components/ui";

const beats = [
  {
    title: "Pick a situation",
    body: "A pharmacy, a job interview, an argument with a landlord — or describe your own and a scene gets written for your language and level.",
  },
  {
    title: "Have it out loud",
    body: "A voice agent plays the other person and works the scene beat by beat. It asks, then waits. It will not fill your silence for you.",
  },
  {
    title: "Ask for help, then say it",
    body: "Stuck? Press H. You get one line in the language you are learning — and you have to repeat it back before the scene moves on.",
  },
  {
    title: "Get the debrief",
    body: "Every line you were given, every one you could not say, and what to fix. Ready the moment you hang up.",
  },
];

export const Intro = () => (
  <div>
    <Card className="p-5">
      <ol className="grid gap-5 sm:grid-cols-2">
        {beats.map((beat, index) => (
          <li key={beat.title} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-rule text-xs text-ink-soft">
              {index + 1}
            </span>
            <div>
              <h3 className="font-serif text-base text-ink">{beat.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{beat.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>

    <p className="mt-4 text-xs text-ink-soft">
      You will need a microphone. Voice minutes are billed at roughly ten cents a minute, so the last
      step sets a hard limit on how long the call can run.
    </p>
  </div>
);
