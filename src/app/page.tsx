"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Intro } from "~/components/setup/intro";
import { LanguageForm } from "~/components/setup/language-form";
import { languageLabel } from "~/components/setup/languages";
import { ScenarioComposer } from "~/components/setup/scenario-composer";
import { ScenarioEditor } from "~/components/setup/scenario-editor";
import { ScenarioPicker } from "~/components/setup/scenario-picker";
import { SettingsForm } from "~/components/setup/settings-form";
import { WizardNav } from "~/components/setup/wizard-nav";
import { Button, Card } from "~/components/ui";
import type { Scenario } from "~/lib/scenario/schema";
import { loadSettings, saveSettings } from "~/lib/session/store";
import { defaultSessionSettings, type SessionSettings } from "~/lib/session/settings";
import type { TemplateSummary } from "~/lib/voice/types";

const steps = [
  {
    label: "What this is",
    title: "Practise a real conversation, out loud",
    blurb:
      "CallMode gives you the other person: a voice agent that plays the pharmacist, the hiring manager, the landlord — and waits for you to speak.",
  },
  {
    label: "Language",
    title: "What are you learning?",
    blurb: "This decides the language of the scene and how hard the lines you have to say will be.",
  },
  {
    label: "Situation",
    title: "What do you want to practise?",
    blurb: "Pick one of these, or describe a situation of your own and it gets written for you.",
  },
  {
    label: "How it runs",
    title: "How much help do you want?",
    blurb:
      "Everything here is per run. Change any of it and the same situation plays differently next time.",
  },
] as const;

const SetupPage = () => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [settings, setSettings] = useState<SessionSettings>(defaultSessionSettings);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
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

  const goTo = (next: number) => {
    setStep(next);
    setFurthest((seen) => Math.max(seen, next));
    setError(null);
    window.scrollTo({ top: 0 });
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

  const selectedTitle = templates.find((template) => template.slug === selected)?.title;
  const isLast = step === steps.length - 1;
  /** The situation is the one thing the wizard cannot supply a default for. */
  const blocked = step === 2 && !selected;

  const summary = [
    step > 0 ? `${languageLabel(settings.targetLanguage)} · ${settings.cefrLevel}` : null,
    step > 1 ? (selectedTitle ?? (selected ? "Your situation" : "No situation yet")) : null,
  ].filter(Boolean) as string[];

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header>
        <h1 className="font-serif text-xl text-ink">CallMode</h1>
        <div className="mt-5">
          <WizardNav
            steps={steps.map((entry) => entry.label)}
            current={step}
            furthest={furthest}
            onSelect={goTo}
          />
        </div>
      </header>

      <section className="mt-8">
        <h2 className="font-serif text-2xl text-ink">{steps[step]!.title}</h2>
        <p className="mt-1.5 text-sm text-ink-soft">{steps[step]!.blurb}</p>

        <div className="mt-6">
          {step === 0 ? <Intro /> : null}

          {step === 1 ? <LanguageForm settings={settings} onChange={update} /> : null}

          {step === 2 ? (
            <div className="grid gap-5">
              <ScenarioPicker
                templates={templates}
                selected={selected}
                onSelect={setSelected}
                onEdit={setEditing}
                loading={loading}
              />
              <ScenarioComposer
                settings={settings}
                onSettingsChange={update}
                onCreated={(template) => {
                  void refreshTemplates();
                  setSelected(template.slug);
                }}
              />
              {editing ? (
                <ScenarioEditor
                  slug={editing}
                  onCancel={() => setEditing(null)}
                  onSaved={(template) => {
                    setEditing(null);
                    setSelected(template.slug);
                    void refreshTemplates();
                  }}
                />
              ) : null}
            </div>
          ) : null}

          {step === 3 ? <SettingsForm settings={settings} onChange={update} /> : null}
        </div>
      </section>

      <div className="sticky bottom-0 mt-8 -mx-5 border-t border-rule bg-paper/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {step > 0 ? (
              <Button onClick={() => goTo(step - 1)} variant="ghost">
                Back
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            {summary.length > 0 ? (
              <p className="hidden truncate text-sm text-ink-soft sm:block">
                {summary.join(" · ")}
              </p>
            ) : null}
            {isLast ? (
              <Button onClick={begin} disabled={!selected || preparing}>
                {preparing ? "Setting the scene…" : "Start"}
              </Button>
            ) : (
              <Button onClick={() => goTo(step + 1)} disabled={blocked}>
                {step === 0 ? "Get started" : "Next"}
              </Button>
            )}
          </div>
        </div>

        {blocked ? (
          <p className="mt-2 text-right text-xs text-ink-soft">Pick a situation to carry on.</p>
        ) : null}
        {error ? <Card className="mt-3 border-flag p-3 text-sm text-flag">{error}</Card> : null}
      </div>
    </main>
  );
};

export default SetupPage;
