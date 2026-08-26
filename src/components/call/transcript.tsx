"use client";

import { useEffect, useRef } from "react";

import { useI18n } from "~/components/i18n-provider";
import type { TranscriptEntry } from "~/lib/voice/types";

const timingTone = (milliseconds: number, kind: "agent" | "model") => {
  const green = kind === "agent" ? 1_500 : 800;
  const yellow = kind === "agent" ? 3_000 : 1_500;
  if (milliseconds <= green) return "border-accent bg-accent-soft text-accent";
  if (milliseconds <= yellow) return "border-warn bg-warn-soft text-warn";
  return "border-flag bg-flag-soft text-flag";
};

const formattedTiming = (milliseconds: number) =>
  milliseconds < 1_000 ? `${milliseconds}ms` : `${(milliseconds / 1_000).toFixed(1)}s`;

const TimingBadge = ({
  label,
  milliseconds,
  kind,
  pending = false,
}: {
  label: string;
  milliseconds?: number;
  kind: "agent" | "model";
  pending?: boolean;
}) => {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium ${
        milliseconds === undefined
          ? "border-rule text-ink-soft"
          : timingTone(milliseconds, kind)
      }`}
      title={kind === "agent" ? t("agentTimingTitle") : t("modelTimingTitle")}
    >
      {label}{" "}
      {milliseconds === undefined
        ? pending
          ? t("pending")
          : t("notReported")
        : formattedTiming(milliseconds)}
    </span>
  );
};

export const Transcript = ({ entries, live = false }: { entries: TranscriptEntry[]; live?: boolean }) => {
  const { t } = useI18n();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!live) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries.length, live]);

  return (
    <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`rounded-lg px-2.5 py-2 text-sm leading-relaxed ${
            entry.recommendedTerms.length > 0
              ? "border border-accent bg-accent-soft/40"
              : "border border-transparent"
          }`}
        >
          <p className={entry.role === "agent" ? "text-ink" : "text-ink-soft"}>
            <span className="mr-2 text-[10px] tracking-wide uppercase opacity-60">
              {entry.role === "agent" ? t("them") : t("you")}
            </span>
            {entry.text}
          </p>
          {entry.recommendedTerms.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {entry.recommendedTerms.map((term) => (
                <span
                  key={term}
                  className="rounded border border-accent bg-card px-1.5 py-0.5 text-[10px] font-medium text-accent"
                >
                  ✓ {term}
                </span>
              ))}
            </div>
          ) : null}
          {entry.role === "agent" ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <TimingBadge label={t("agent")} milliseconds={entry.agentResponseMs} kind="agent" />
              <TimingBadge
                label={t("model")}
                milliseconds={entry.modelResponseMs}
                kind="model"
                pending={live && entry.modelResponseMs === undefined}
              />
              {entry.modelName ? <span className="text-[10px] text-ink-soft">{entry.modelName}</span> : null}
            </div>
          ) : null}
        </div>
      ))}
      {entries.length === 0 ? (
        <p className="text-sm text-ink-soft">{t("transcriptEmpty")}</p>
      ) : null}
      <div ref={endRef} />
      {entries.some((entry) => entry.role === "agent") ? (
        <p className="pt-1 text-[10px] text-ink-soft">
          {t("speedLegend")}
        </p>
      ) : null}
    </div>
  );
};
