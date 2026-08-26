"use client";

import { Card } from "~/components/ui";
import type { TemplateSummary } from "~/lib/voice/types";

type Props = {
  templates: TemplateSummary[];
  selected: string | null;
  onSelect: (slug: string) => void;
  loading: boolean;
};

export const ScenarioPicker = ({ templates, selected, onSelect, loading }: Props) => {
  if (loading) {
    return <p className="text-sm text-ink-soft">Loading situations…</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {templates.map((template) => {
        const isSelected = template.slug === selected;
        return (
          <button
            key={template.slug}
            type="button"
            onClick={() => onSelect(template.slug)}
            className={`rounded-xl border p-4 text-left transition ${
              isSelected
                ? "border-accent bg-accent-soft"
                : "border-rule bg-card hover:border-accent"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-serif text-base text-ink">{template.title}</h3>
              <span className="shrink-0 text-xs text-ink-soft">
                {template.suggestedLevel} · {template.beatCount} beats
              </span>
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">{template.summary}</p>
            <p className="mt-2 text-xs text-ink-soft">
              <span className="font-medium">You want:</span> {template.userGoal}
            </p>
            {template.source === "generated" ? (
              <span className="mt-2 inline-block rounded border border-rule px-1.5 py-0.5 text-[10px] tracking-wide text-ink-soft uppercase">
                Yours
              </span>
            ) : null}
          </button>
        );
      })}
      {templates.length === 0 ? (
        <Card className="p-4 text-sm text-ink-soft sm:col-span-2">No situations yet.</Card>
      ) : null}
    </div>
  );
};
