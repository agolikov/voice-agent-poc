import Link from "next/link";
import { connection } from "next/server";

import { Card } from "~/components/ui";
import { listRecentSessions } from "~/lib/db/queries";

const outcomeLabels: Record<string, string> = {
  "goal-achieved": "Goal achieved",
  partial: "Partly completed",
  abandoned: "Ended early",
  "out-of-time": "Out of time",
};

const HistoryPage = async () => {
  await connection();
  const sessions = await listRecentSessions(100);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Past conversations</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Every live transcript is saved here. Audio is available when ElevenLabs retained a recording.
          </p>
        </div>
        <Link href="/" className="shrink-0 text-sm text-accent hover:underline">
          New practice
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
                  {session.title ?? "Practice session"}
                </Link>
                <p className="mt-1 text-xs text-ink-soft">
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
                    session.startedAt,
                  )}
                  {session.outcome ? ` · ${outcomeLabels[session.outcome] ?? session.outcome}` : " · Unfinished"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <Link
                  href={`/api/sessions/${session.id}/transcript`}
                  className="text-accent hover:underline"
                >
                  Download chat
                </Link>
                {session.conversationId ? (
                  <Link
                    href={`/api/sessions/${session.id}/audio`}
                    className="text-accent hover:underline"
                  >
                    Download audio
                  </Link>
                ) : (
                  <span className="text-ink-soft" title="No ElevenLabs recording is attached">
                    Audio unavailable
                  </span>
                )}
              </div>
            </div>
            {session.summary ? <p className="mt-3 text-sm text-ink-soft">{session.summary}</p> : null}
          </Card>
        ))}
        {sessions.length === 0 ? (
          <Card className="p-5 text-sm text-ink-soft">No conversations have been started yet.</Card>
        ) : null}
      </div>
    </main>
  );
};

export default HistoryPage;
