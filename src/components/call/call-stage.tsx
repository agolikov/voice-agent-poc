"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BeatTracker } from "~/components/call/beat-tracker";
import { HintCard } from "~/components/call/hint-card";
import { Transcript } from "~/components/call/transcript";
import { Button, Card } from "~/components/ui";
import type { Scenario } from "~/lib/scenario/schema";
import type { SessionSettings } from "~/lib/session/settings";
import { usePracticeSession } from "~/lib/voice/use-practice-session";

type Props = { scenario: Scenario; settings: SessionSettings };

export const CallStage = ({ scenario, settings }: Props) => {
  const router = useRouter();
  const session = usePracticeSession(scenario, settings);
  const { status, sessionId } = session;

  // The debrief is built from the attempt log, which is already written by the
  // time the call ends — so there is nothing to wait for here.
  useEffect(() => {
    if (status === "ended" && sessionId) {
      router.push(`/debrief/${sessionId}`);
    }
  }, [status, sessionId, router]);

  const isLive = status === "live";

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl text-ink">{scenario.title}</h1>
              <p className="mt-1 text-sm text-ink-soft">{scenario.setting}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                isLive
                  ? session.isSpeaking
                    ? "bg-warn-soft text-warn"
                    : "bg-accent-soft text-accent"
                  : "border border-rule text-ink-soft"
              }`}
            >
              {isLive ? (session.isSpeaking ? "they are speaking" : "your turn") : status}
            </span>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs tracking-wide text-ink-soft uppercase">You are</dt>
              <dd className="mt-0.5 text-ink">{scenario.userRole.role}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-ink-soft uppercase">They are</dt>
              <dd className="mt-0.5 text-ink">
                {scenario.agentRole.name} — {scenario.agentRole.role}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide text-ink-soft uppercase">What you want</dt>
              <dd className="mt-0.5 text-ink">{scenario.userRole.goal}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <BeatTracker beats={scenario.beats} current={session.beatIndex} />
            <p className="mt-2 text-xs text-ink-soft">
              Beat {session.beatIndex + 1} of {scenario.beats.length}
              {session.beat ? ` — ${session.beat.intent}` : ""}
            </p>
          </div>
        </Card>

        <HintCard hint={session.hint} hintMode={settings.hintMode} />

        {status === "idle" ? (
          <Card className="p-5">
            <h2 className="font-serif text-base text-ink">Before you start</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              <li>
                They will speak {new Intl.DisplayNames(["en"], { type: "language" }).of(scenario.targetLanguage) ?? scenario.targetLanguage} and expect you to as well.
              </li>
              <li>
                Stuck? Press <kbd className="rounded border border-rule px-1">H</kbd>, hit the Help
                button, or say &ldquo;{settings.helpTrigger}&rdquo; — then repeat what you hear.
              </li>
              <li>The call ends itself after {settings.maxDurationMinutes} minutes.</li>
            </ul>
            <Button className="mt-4" onClick={() => void session.start()}>
              Start the call
            </Button>
          </Card>
        ) : null}

        {status === "error" ? (
          <Card className="border-flag p-4 text-sm text-flag">{session.error}</Card>
        ) : null}

        {isLive || status === "connecting" || status === "preparing" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={session.askForHelp} disabled={!isLive} variant="ghost">
              Help me say this (H)
            </Button>
            <Button onClick={() => session.setMuted(!session.isMuted)} disabled={!isLive} variant="ghost">
              {session.isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button onClick={session.stop} variant="danger">
              End the call
            </Button>
            <span className="text-xs text-ink-soft">
              {session.hintCount} hint{session.hintCount === 1 ? "" : "s"} used
            </span>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-3 font-serif text-base text-ink">Transcript</h2>
          <Transcript entries={session.transcript} live />
        </Card>

        {scenario.vocabulary.length > 0 ? (
          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base text-ink">Words for this scene</h2>
            <dl className="space-y-1.5 text-sm">
              {scenario.vocabulary.map((entry) => (
                <div key={entry.term} className="flex justify-between gap-3">
                  <dt className="text-ink">{entry.term}</dt>
                  <dd className="text-right text-ink-soft">{entry.translation}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ) : null}
      </div>
    </div>
  );
};
