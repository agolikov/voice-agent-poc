"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ScenarioComposer } from "~/components/setup/scenario-composer";
import { ScenarioPicker } from "~/components/setup/scenario-picker";
import { SettingsForm } from "~/components/setup/settings-form";
import { Button, Card } from "~/components/ui";
import type { Scenario } from "~/lib/scenario/schema";
import { loadSettings, saveSettings } from "~/lib/session/store";
import { defaultSessionSettings, type SessionSettings } from "~/lib/session/settings";
import type { TemplateSummary } from "~/lib/voice/types";

const SetupPage = () => {
  const router = useRouter();
  const [settings, setSettings] = useState<SessionSettings>(defaultSessionSettings);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setSettings(loadSettings()), []);

  const refreshTemplates = useCallback(async () => {
    const response = await fetch("/api/scenarios");
    const body = (await response.json()) as { templates: TemplateSummary[] };
    setTemplates(body.templates);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  const update = (next: SessionSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  /**
   * Realizing the scene takes a model call, so it happens here — before the
   * brief — rather than while the learner is waiting on a connected microphone.
   */
  const begin = async () => {
    if (!selected) return;
    setPreparing(true);
    setError(null);
    try {
      const response = await fetch("/api/scenarios/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateSlug: selected, settings }),
      });
      const body = (await response.json()) as { scenario?: Scenario; error?: string };
      if (!response.ok || !body.scenario) {
        throw new Error(body.error ?? "Could not prepare that situation.");
      }
      router.push(`/practice/${body.scenario.id}`);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Something went wrong.");
      setPreparing(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header>
        <h1 className="font-serif text-3xl text-ink">CallMode</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Pick a situation, or write one. Then have the conversation out loud — and press{" "}
          <kbd className="rounded border border-rule px-1">H</kbd> whenever you are stuck.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 font-serif text-lg text-ink">Choose a situation</h2>
        <ScenarioPicker
          templates={templates}
          selected={selected}
          onSelect={setSelected}
          loading={loading}
        />
      </section>

      <section className="mt-5">
        <ScenarioComposer
          settings={settings}
          onCreated={(template) => {
            void refreshTemplates();
            setSelected(template.slug);
          }}
        />
      </section>

      <section className="mt-8">
        <SettingsForm settings={settings} onChange={update} />
      </section>

      <div className="sticky bottom-0 mt-8 -mx-5 border-t border-rule bg-paper/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-soft">
            {selected
              ? `Ready: ${templates.find((template) => template.slug === selected)?.title ?? selected}`
              : "Pick a situation to begin."}
          </p>
          <Button onClick={begin} disabled={!selected || preparing}>
            {preparing ? "Setting the scene…" : "Start"}
          </Button>
        </div>
        {error ? (
          <Card className="mt-3 border-flag p-3 text-sm text-flag">{error}</Card>
        ) : null}
      </div>
    </main>
  );
};

export default SetupPage;
