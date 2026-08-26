"use client";

import { useState } from "react";

import { useI18n } from "~/components/i18n-provider";
import { Button, Card, fieldClass, Label, Select } from "~/components/ui";
import {
  beatCountPresets,
  beatCountRange,
  type SessionSettings,
} from "~/lib/session/settings";
import type { ScenarioTemplate } from "~/lib/scenario/schema";
import { useDictation } from "~/lib/speech/use-dictation";

type Props = {
  settings: SessionSettings;
  onSettingsChange: (settings: SessionSettings) => void;
  onCreated: (template: ScenarioTemplate) => void;
};

export const ScenarioComposer = ({ settings, onSettingsChange, onCreated }: Props) => {
  const { locale, t } = useI18n();
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dictation = useDictation({ locale, value: description, onChange: setDescription });
  const examples = [t("exampleParcel"), t("exampleRemote"), t("exampleMechanic")];

  const { min, max } = beatCountRange[settings.beatCount];

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/scenarios/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, settings, uiLocale: locale }),
      });
      const body = (await response.json()) as { template?: ScenarioTemplate; error?: string };
      if (!response.ok || !body.template) {
        throw new Error(body.error ?? t("couldNotWrite"));
      }
      setDescription("");
      onCreated(body.template);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : t("somethingWrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <Label>{t("describeOwn")}</Label>
      <textarea
        className={`${fieldClass} min-h-20 resize-y`}
        placeholder={t("describePlaceholder")}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          variant={dictation.listening ? "danger" : "ghost"}
          onClick={dictation.listening ? dictation.stop : dictation.start}
          disabled={busy || dictation.supported === false}
          className="flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${dictation.listening ? "animate-pulse bg-flag" : "bg-accent"}`}
          />
          {dictation.listening ? t("stopDictation") : t("startDictation")}
        </Button>
        <span className="text-xs text-ink-soft" role="status" aria-live="polite">
          {dictation.listening ? t("listening") : null}
          {dictation.supported === false ? t("micUnsupported") : null}
          {dictation.error === "denied" ? t("micDenied") : null}
          {dictation.error === "no-speech" ? t("micNoSpeech") : null}
          {dictation.error === "failed" ? t("micError") : null}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setDescription(example)}
            className="rounded-full border border-rule px-2.5 py-1 text-xs text-ink-soft transition hover:border-accent"
          >
            {example}
          </button>
        ))}
      </div>
      <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
        {/* Scene length only shapes situations you write; the curated ones already have their beats. */}
        <Select
          label={t("sceneLength")}
          value={settings.beatCount}
          options={beatCountPresets.map((preset) => ({
            value: preset,
            label: `${t(preset)} — ${beatCountRange[preset].min}–${beatCountRange[preset].max} ${t("beats")}`,
          }))}
          onChange={(value) => onSettingsChange({ ...settings, beatCount: value })}
          hint={t("sceneBeatsHint", { min, max })}
        />
        <div className="flex items-center gap-3 pb-5">
          <Button onClick={create} disabled={busy || description.trim().length < 3} variant="ghost">
            {busy ? t("writingScene") : t("writeIt")}
          </Button>
          {error ? <span className="text-xs text-flag">{error}</span> : null}
        </div>
      </div>
    </Card>
  );
};
