"use client";

import Image from "next/image";

import { useI18n } from "~/components/i18n-provider";
import { scenarioImages } from "~/components/setup/scenario-images";
import { Card } from "~/components/ui";
import type { TemplateSummary } from "~/lib/voice/types";

type Props = {
  templates: TemplateSummary[];
  selected: string | null;
  onSelect: (slug: string) => void;
  onEdit: (slug: string) => void;
  loading: boolean;
};

export const ScenarioPicker = ({ templates, selected, onSelect, onEdit, loading }: Props) => {
  const { t } = useI18n();
  if (loading) {
    return <p className="text-sm text-ink-soft">{t("loadingSituations")}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {templates.map((template, index) => {
        const isSelected = template.slug === selected;
        const image = template.source === "library" ? scenarioImages[template.slug] : undefined;
        return (
          <div
            key={template.slug}
            className={`overflow-hidden rounded-xl border transition ${
              isSelected
                ? "border-accent bg-accent-soft"
                : "border-rule bg-card hover:border-accent"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(template.slug)}
              className="block w-full text-left"
              aria-pressed={isSelected}
            >
              {image ? (
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={768}
                  height={512}
                  sizes="(min-width: 640px) 448px, 100vw"
                  loading={index < 2 ? "eager" : "lazy"}
                  className="aspect-3/2 w-full border-b border-rule object-cover"
                />
              ) : null}
              <div className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-serif text-base text-ink">{template.title}</h3>
                  <span className="shrink-0 text-xs text-ink-soft">
                    {template.suggestedLevel} · {template.beatCount} {t("beats")}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-ink-soft">{template.summary}</p>
                <p className="mt-2 text-xs text-ink-soft">
                  <span className="font-medium">{t("youWant")}</span> {template.userGoal}
                </p>
              </div>
            </button>
            {template.editable ? (
              <div className="flex items-center justify-between border-t border-rule px-4 py-2">
                <span className="rounded border border-rule px-1.5 py-0.5 text-[10px] tracking-wide text-ink-soft uppercase">
                  {t("saved")}
                </span>
                <button
                  type="button"
                  onClick={() => onEdit(template.slug)}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {t("editSituation")}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
      {templates.length === 0 ? (
        <Card className="p-4 text-sm text-ink-soft sm:col-span-2">{t("noSituations")}</Card>
      ) : null}
    </div>
  );
};
