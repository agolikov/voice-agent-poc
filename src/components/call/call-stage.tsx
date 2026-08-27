"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BeatTracker } from "~/components/call/beat-tracker";
import { useI18n } from "~/components/i18n-provider";
import { HintCard } from "~/components/call/hint-card";
import { ScriptPreview } from "~/components/call/script-preview";
import { Transcript } from "~/components/call/transcript";
import { Button, Card } from "~/components/ui";
import type { Scenario } from "~/lib/scenario/schema";
import type { SessionSettings } from "~/lib/session/settings";
import { usePracticeSession } from "~/lib/voice/use-practice-session";

type Props = { scenario: Scenario; settings: SessionSettings };

export const CallStage = ({ scenario, settings }: Props) => {
  const { locale, t } = useI18n();
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
  const statusLabel = {
    idle: t("statusIdle"), preparing: t("statusPreparing"), connecting: t("statusConnecting"),
    live: t("yourTurn"), ended: t("statusEnded"), error: t("statusError"),
  }[status];

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
              {isLive ? (session.isSpeaking ? t("theySpeaking") : t("yourTurn")) : statusLabel}
            </span>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs tracking-wide text-ink-soft uppercase">{t("youAre")}</dt>
              <dd className="mt-0.5 text-ink">{scenario.userRole.role}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-ink-soft uppercase">{t("theyAre")}</dt>
              <dd className="mt-0.5 text-ink">
                {scenario.agentRole.name} — {scenario.agentRole.role}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide text-ink-soft uppercase">{t("whatYouWant")}</dt>
              <dd className="mt-0.5 text-ink">{scenario.userRole.goal}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <BeatTracker beats={scenario.beats} current={session.beatIndex} />
            <p className="mt-2 text-xs text-ink-soft">
              {t("beatProgress", { current: session.beatIndex + 1, total: scenario.beats.length })}
              {session.beat ? ` — ${session.beat.intent}` : ""}
            </p>
          </div>
        </Card>

        <HintCard hint={session.hint} hintMode={settings.hintMode} />

        {status === "idle" ? (
          <Card className="p-5">
            <h2 className="font-serif text-base text-ink">{t("beforeStart")}</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              <li>
                {t("spokenLanguage", { language: new Intl.DisplayNames([locale], { type: "language" }).of(scenario.targetLanguage) ?? scenario.targetLanguage })}
              </li>
              <li>
                {t("helpInstruction", { trigger: settings.helpTrigger })}
              </li>
              <li>{t("callEnds", { minutes: settings.maxDurationMinutes })}</li>
            </ul>
            <Button className="mt-4" onClick={() => void session.start()}>
              {t("startCall")}
            </Button>
          </Card>
        ) : null}

        {/* Only before the call: mid-scene it stops being a way to steady your
            nerves and becomes a script to read from. */}
        {status === "idle" ? <ScriptPreview scenario={scenario} /> : null}

        {status === "error" ? (
          <Card className="border-flag p-4 text-sm text-flag">{session.error}</Card>
        ) : null}

        {isLive || status === "connecting" || status === "preparing" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={session.askForHelp} disabled={!isLive} variant="ghost">
              {t("helpMe")}
            </Button>
            <Button
              onClick={session.finishTurn}
              disabled={!isLive || session.isSpeaking || session.isMuted || session.turnSubmitting}
              variant="ghost"
              className="border-accent text-accent"
            >
              <span title={t("doneSpeakingTitle")}>
                {session.turnSubmitting ? t("sendingTurn") : t("doneSpeaking")}
              </span>
            </Button>
            <Button
              onClick={() => session.setMuted(!session.isMuted)}
              disabled={!isLive || session.turnSubmitting}
              variant="ghost"
            >
              {session.isMuted ? t("unmute") : t("mute")}
            </Button>
            <Button onClick={session.stop} variant="danger">
              {t("endCall")}
            </Button>
            <span className="text-xs text-ink-soft">
              {t("hintsUsed", { count: session.hintCount })}
            </span>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-3 font-serif text-base text-ink">{t("transcript")}</h2>
          <Transcript entries={session.transcript} live />
        </Card>

        {scenario.vocabulary.length > 0 ? (
          <Card className="p-5">
            <h2 className="mb-3 font-serif text-base text-ink">{t("sceneWords")}</h2>
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
