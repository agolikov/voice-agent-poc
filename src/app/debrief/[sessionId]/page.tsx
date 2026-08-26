import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "~/components/ui";
import { Transcript } from "~/components/call/transcript";
import { getDebrief } from "~/lib/db/queries";
import { translate } from "~/lib/i18n/messages";
import { getServerLocale } from "~/lib/i18n/server";

type Props = { params: Promise<{ sessionId: string }> };

const DebriefPage = async ({ params }: Props) => {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const outcomeLabels: Record<string, string> = {
    "goal-achieved": t("gotWhatWanted"), partial: t("partlyThere"),
    abandoned: t("endedEarly"), "out-of-time": t("ranOutTime"),
  };
  const categoryLabels: Record<string, string> = {
    grammar: t("grammar"), vocabulary: t("vocabulary"), "word-order": t("wordOrder"),
    register: t("register"), pronunciation: t("pronunciation"),
  };
  const { sessionId } = await params;
  const debrief = await getDebrief(sessionId);
  if (!debrief) notFound();

  const { session, scenario, attempts, messages } = debrief;

  const repeats = attempts.filter((attempt) => attempt.kind === "repeat");
  const answers = attempts.filter((attempt) => attempt.kind === "answer");
  const hints = attempts.filter((attempt) => attempt.kind === "hint");
  const mistakes = attempts.filter((attempt) => attempt.kind === "mistake");
  const missed = repeats.filter((attempt) => attempt.verdict === "missed");

  const byCategory = mistakes.reduce<Record<string, number>>((counts, mistake) => {
    const key = mistake.category ?? "other";
    return { ...counts, [key]: (counts[key] ?? 0) + 1 };
  }, {});

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">{scenario?.title ?? t("session")}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {session.outcome ? outcomeLabels[session.outcome] ?? session.outcome : t("unfinished")}
            {session.summary ? ` — ${session.summary}` : ""}
          </p>
        </div>
        <Link href="/" className="shrink-0 text-sm text-accent hover:underline">
          {t("runAnother")}
        </Link>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("turnsAnswered"), value: answers.length },
          { label: t("hintsStat"), value: hints.length },
          { label: t("linesRepeated"), value: repeats.filter((a) => a.verdict === "repeated").length },
          { label: t("linesMissed"), value: missed.length },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="font-serif text-2xl text-ink">{stat.value}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{stat.label}</p>
          </Card>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-lg text-ink">{t("conversation")}</h2>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link
              href={`/api/sessions/${session.id}/transcript`}
              className="text-accent hover:underline"
            >
              {t("downloadChat")}
            </Link>
            {session.conversationId ? (
              <Link
                href={`/api/sessions/${session.id}/audio`}
                className="text-accent hover:underline"
              >
                {t("downloadRecording")}
              </Link>
            ) : (
              <span className="text-ink-soft" title={t("noRecordingTitle")}>
                {t("recordingUnavailable")}
              </span>
            )}
          </div>
        </div>
        <Card className="p-4">
          {messages.length > 0 ? (
            <Transcript
              entries={messages.map((message) => ({
                id: message.id,
                eventId: message.eventId ?? undefined,
                role: message.role,
                text: message.body,
                recommendedTerms: message.recommendedTerms,
                agentResponseMs: message.agentResponseMs ?? undefined,
                modelResponseMs: message.modelResponseMs ?? undefined,
                modelName: message.modelName ?? undefined,
                createdAt: message.createdAt.toISOString(),
              }))}
            />
          ) : (
            <p className="text-sm text-ink-soft">
              {t("noTranscript")}
            </p>
          )}
        </Card>
      </section>

      {mistakes.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-lg text-ink">{t("whatToFix")}</h2>
          <p className="mb-3 text-sm text-ink-soft">
            {Object.entries(byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => `${categoryLabels[category] ?? category}: ${count}`)
              .join(" · ")}
          </p>
          <div className="space-y-2">
            {mistakes.map((mistake) => (
              <Card key={mistake.id} className="p-4">
                <p className="text-sm text-ink-soft line-through decoration-flag/60">
                  {mistake.heard}
                </p>
                <p className="mt-1 text-sm text-ink">{mistake.correction}</p>
                {mistake.category ? (
                  <span className="mt-2 inline-block rounded border border-rule px-1.5 py-0.5 text-[10px] tracking-wide text-ink-soft uppercase">
                    {categoryLabels[mistake.category] ?? mistake.category}
                  </span>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {repeats.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-lg text-ink">{t("linesGiven")}</h2>
          <div className="space-y-2">
            {repeats.map((repeat) => (
              <Card key={repeat.id} className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-serif text-base text-ink">{repeat.expected}</p>
                  <span
                    className={`shrink-0 text-xs ${
                      repeat.verdict === "repeated" ? "text-accent" : "text-flag"
                    }`}
                  >
                    {repeat.verdict === "repeated" ? t("repeated") : (repeat.verdict ?? t("attempted"))}
                    {repeat.score === null ? "" : ` · ${repeat.score}%`}
                  </span>
                </div>
                {repeat.heard && repeat.heard !== repeat.expected ? (
                  <p className="mt-1 text-sm text-ink-soft">{t("youSaid")} {repeat.heard}</p>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {attempts.length === 0 ? (
        <Card className="mt-8 p-5 text-sm text-ink-soft">
          {t("nothingLogged")}
        </Card>
      ) : null}

      {session.analysis ? (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-lg text-ink">{t("postCallAnalysis")}</h2>
          <Card className="overflow-x-auto p-4">
            <pre className="text-xs text-ink-soft">
              {JSON.stringify(session.analysis, null, 2)}
            </pre>
          </Card>
        </section>
      ) : null}

      {scenario ? (
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={`/practice/${scenario.id}`}
            className="text-sm text-accent hover:underline"
          >
            {t("runAgain")}
          </Link>
          <Link href="/history" className="text-sm text-accent hover:underline">
            {t("seePast")}
          </Link>
        </div>
      ) : null}
    </main>
  );
};

export default DebriefPage;
