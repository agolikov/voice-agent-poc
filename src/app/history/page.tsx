import Link from "next/link";
import { connection } from "next/server";

import { Card } from "~/components/ui";
import { listRecentSessions } from "~/lib/db/queries";
import { dateLocale } from "~/lib/i18n/locale";
import { translate } from "~/lib/i18n/messages";
import { getServerLocale } from "~/lib/i18n/server";

const HistoryPage = async () => {
  await connection();
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const outcomeLabels: Record<string, string> = {
    "goal-achieved": t("goalAchieved"), partial: t("partlyCompleted"),
    abandoned: t("endedEarly"), "out-of-time": t("outOfTime"),
  };
  const sessions = await listRecentSessions(100);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">{t("pastConversations")}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {t("historyIntro")}
          </p>
        </div>
        <Link href="/" className="shrink-0 text-sm text-accent hover:underline">
          {t("newPractice")}
        </Link>
      </header>

      <div className="mt-6 space-y-3">
        {sessions.map((session) => (
          <Card key={session.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/debrief/${session.id}`}
                  className="font-serif text-lg text-ink hover:text-accent"
                >
                  {session.title ?? t("practiceSession")}
                </Link>
                <p className="mt-1 text-xs text-ink-soft">
                  {new Intl.DateTimeFormat(dateLocale[locale], { dateStyle: "medium", timeStyle: "short" }).format(
                    session.startedAt,
                  )}
                  {session.outcome ? ` · ${outcomeLabels[session.outcome] ?? session.outcome}` : ` · ${t("unfinished")}`}
                </p>
              </div>
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
                    {t("downloadAudio")}
                  </Link>
                ) : (
                  <span className="text-ink-soft" title={t("noRecordingTitle")}>
                    {t("audioUnavailable")}
                  </span>
                )}
              </div>
            </div>
            {session.summary ? <p className="mt-3 text-sm text-ink-soft">{session.summary}</p> : null}
          </Card>
        ))}
        {sessions.length === 0 ? (
          <Card className="p-5 text-sm text-ink-soft">{t("noConversations")}</Card>
        ) : null}
      </div>
    </main>
  );
};

export default HistoryPage;
