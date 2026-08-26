"use client";

import { useState } from "react";

import { Button, Card, fieldClass, Label, Select } from "~/components/ui";
import {
  beatCountPresets,
  beatCountRange,
  type SessionSettings,
} from "~/lib/session/settings";
import type { ScenarioTemplate } from "~/lib/scenario/schema";

type Props = {
  settings: SessionSettings;
  onSettingsChange: (settings: SessionSettings) => void;
  onCreated: (template: ScenarioTemplate) => void;
};

const examples = [
  "Complaining that a parcel is three weeks late",
  "Persuading my manager to let me work remotely",
  "Explaining to a mechanic what noise my car is making",
];

export const ScenarioComposer = ({ settings, onSettingsChange, onCreated }: Props) => {
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { min, max } = beatCountRange[settings.beatCount];

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/scenarios/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, settings }),
      });
      const body = (await response.json()) as { template?: ScenarioTemplate; error?: string };
      if (!response.ok || !body.template) {
        throw new Error(body.error ?? "Could not write that situation.");
      }
      setDescription("");
      onCreated(body.template);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <Label>Or describe your own situation</Label>
      <textarea
        className={`${fieldClass} min-h-20 resize-y`}
        placeholder="What do you want to practise?"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
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
          label="How long a scene to write"
          value={settings.beatCount}
          options={beatCountPresets.map((preset) => ({
            value: preset,
            label: `${preset[0]?.toUpperCase()}${preset.slice(1)} — ${beatCountRange[preset].min}–${beatCountRange[preset].max} beats`,
          }))}
          onChange={(value) => onSettingsChange({ ...settings, beatCount: value })}
          hint={`Yours will get ${min}–${max} beats.`}
        />
        <div className="flex items-center gap-3 pb-5">
          <Button onClick={create} disabled={busy || description.trim().length < 3} variant="ghost">
            {busy ? "Writing the scene…" : "Write it"}
          </Button>
          {error ? <span className="text-xs text-flag">{error}</span> : null}
        </div>
      </div>
    </Card>
  );
};
