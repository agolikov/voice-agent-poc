"use client";

import { useEffect, useState } from "react";

import { Button, Card, fieldClass, Label, Select } from "~/components/ui";
import { cefrLevels, type ScenarioTemplate } from "~/lib/scenario/schema";

type Props = {
  slug: string;
  onCancel: () => void;
  onSaved: (template: ScenarioTemplate) => void;
};

const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const TextField = ({
  label,
  value,
  onChange,
  multiline = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
}) => (
  <label className="block">
    <Label>{label}</Label>
    {multiline ? (
      <textarea
        className={`${fieldClass} min-h-20 resize-y`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    ) : (
      <input
        className={fieldClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    )}
    {hint ? <span className="mt-1 block text-xs text-ink-soft">{hint}</span> : null}
  </label>
);

export const ScenarioEditor = ({ slug, onCancel, onSaved }: Props) => {
  const [template, setTemplate] = useState<ScenarioTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/templates/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { template?: ScenarioTemplate; error?: string };
        if (!response.ok || !body.template) {
          throw new Error(body.error ?? "Could not load that situation.");
        }
        setTemplate(body.template);
      } catch (thrown) {
        if (thrown instanceof DOMException && thrown.name === "AbortError") return;
        setError(thrown instanceof Error ? thrown.message : "Could not load that situation.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  const patch = (values: Partial<ScenarioTemplate>) => {
    setTemplate((current) => (current ? { ...current, ...values } : current));
  };

  const save = async () => {
    if (!template) return;
    setSaving(true);
    setError(null);
    const { slug: _slug, source: _source, ...editable } = template;
    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editable),
      });
      const body = (await response.json()) as { template?: ScenarioTemplate; error?: string };
      if (!response.ok || !body.template) {
        throw new Error(body.error ?? "Could not save that situation.");
      }
      onSaved(body.template);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not save that situation.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/35 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scenario-editor-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <Card className="w-full max-w-3xl p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="scenario-editor-title" className="font-serif text-xl text-ink">
              Edit saved situation
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Changes are stored in the database and used the next time you prepare this scene.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-xl leading-none text-ink-soft hover:bg-accent-soft hover:text-ink"
            aria-label="Close editor"
          >
            ×
          </button>
        </div>

        {loading ? <p className="mt-6 text-sm text-ink-soft">Loading saved situation…</p> : null}

        {template ? (
          <div className="mt-6 grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Title" value={template.title} onChange={(title) => patch({ title })} />
              <Select
                label="Suggested level"
                value={template.suggestedLevel}
                options={cefrLevels.map((level) => ({ value: level, label: level }))}
                onChange={(suggestedLevel) => patch({ suggestedLevel })}
              />
            </div>
            <TextField
              label="Picker summary"
              value={template.summary}
              onChange={(summary) => patch({ summary })}
              multiline
            />
            <TextField
              label="Setting"
              value={template.setting}
              onChange={(setting) => patch({ setting })}
            />

            <div className="grid gap-4 border-t border-rule pt-5 sm:grid-cols-2">
              <TextField
                label="Other person’s role"
                value={template.agentRole.role}
                onChange={(role) => patch({ agentRole: { ...template.agentRole, role } })}
              />
              <TextField
                label="Other person’s name"
                value={template.agentRole.name}
                onChange={(name) => patch({ agentRole: { ...template.agentRole, name } })}
              />
              <TextField
                label="Their personality"
                value={template.agentRole.persona}
                onChange={(persona) => patch({ agentRole: { ...template.agentRole, persona } })}
                multiline
              />
              <div className="grid gap-4">
                <TextField
                  label="Your role"
                  value={template.userRole.role}
                  onChange={(role) => patch({ userRole: { ...template.userRole, role } })}
                />
                <TextField
                  label="Your goal"
                  value={template.userRole.goal}
                  onChange={(goal) => patch({ userRole: { ...template.userRole, goal } })}
                />
              </div>
            </div>

            <section className="border-t border-rule pt-5" aria-labelledby="editor-beats-title">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 id="editor-beats-title" className="font-serif text-lg text-ink">
                    Conversation beats
                  </h3>
                  <p className="mt-1 text-xs text-ink-soft">
                    Each beat is one thing you should manage during the practice call.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="shrink-0"
                  onClick={() =>
                    patch({
                      beats: [
                        ...template.beats,
                        {
                          id: `beat-${crypto.randomUUID()}`,
                          intent: "New conversation beat",
                          successCriteria: "The learner handles this part of the conversation",
                        },
                      ],
                    })
                  }
                >
                  Add beat
                </Button>
              </div>

              <div className="mt-4 grid gap-3">
                {template.beats.map((beat, index) => (
                  <div key={beat.id} className="rounded-lg border border-rule bg-paper p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium tracking-wide text-ink-soft uppercase">
                        Beat {index + 1}
                      </span>
                      {template.beats.length > 1 ? (
                        <button
                          type="button"
                          className="text-xs text-flag hover:underline"
                          onClick={() =>
                            patch({ beats: template.beats.filter((candidate) => candidate.id !== beat.id) })
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextField
                        label="What happens"
                        value={beat.intent}
                        onChange={(intent) =>
                          patch({
                            beats: template.beats.map((candidate) =>
                              candidate.id === beat.id ? { ...candidate, intent } : candidate,
                            ),
                          })
                        }
                      />
                      <TextField
                        label="Done when"
                        value={beat.successCriteria}
                        onChange={(successCriteria) =>
                          patch({
                            beats: template.beats.map((candidate) =>
                              candidate.id === beat.id
                                ? { ...candidate, successCriteria }
                                : candidate,
                            ),
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-4 border-t border-rule pt-5 sm:grid-cols-2">
              <TextField
                label="Vocabulary concepts"
                value={template.vocabularyConcepts.join("\n")}
                onChange={(value) => patch({ vocabularyConcepts: lines(value) })}
                multiline
                hint="One concept per line."
              />
              <TextField
                label="Success criteria"
                value={template.successCriteria.join("\n")}
                onChange={(value) => patch({ successCriteria: lines(value) })}
                multiline
                hint="One criterion per line."
              />
            </div>
            <TextField
              label="How the scene closes"
              value={template.closing}
              onChange={(closing) => patch({ closing })}
            />
          </div>
        ) : null}

        {error ? <p className="mt-5 text-sm text-flag">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3 border-t border-rule pt-5">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!template || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
};
