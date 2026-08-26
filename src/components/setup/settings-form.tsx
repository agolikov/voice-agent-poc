"use client";

import { ConnectionChecks } from "~/components/setup/connection-checks";
import { Card, fieldClass, Label, Select } from "~/components/ui";
import {
  correctionStyles,
  hintLengths,
  hintModes,
  repeatPolicies,
  repeatTolerances,
  speechRates,
  type SessionSettings,
} from "~/lib/session/settings";

const hintModeLabels: Record<(typeof hintModes)[number], string> = {
  "target-only": "Target language only",
  "target-plus-translation": "Target language, translation on screen",
  "native-cue-first": "A cue in your language first",
};

const hintModeHints: Record<(typeof hintModes)[number], string> = {
  "target-only": "Full immersion. You hear and repeat the line, nothing else.",
  "target-plus-translation": "You hear only the target language, but you can see what it means.",
  "native-cue-first": "Most supportive. One sentence of your language, then the line.",
};

const repeatPolicyLabels: Record<(typeof repeatPolicies)[number], string> = {
  "two-tries": "Two tries, then move on",
  "hard-gate": "Stay on it until it is right",
  "one-try": "One try, always move on",
};

const repeatPolicyHints: Record<(typeof repeatPolicies)[number], string> = {
  "two-tries": "A missed line is logged for the debrief and the scene carries on.",
  "hard-gate": "Most drill value, but a misheard word can strand you on one line.",
  "one-try": "Lowest friction. Mistakes surface only at the end.",
};

const toleranceLabels: Record<(typeof repeatTolerances)[number], string> = {
  strict: "Strict — near-verbatim",
  normal: "Normal — every content word",
  lenient: "Lenient — the same meaning",
};

type Props = {
  settings: SessionSettings;
  onChange: (settings: SessionSettings) => void;
};

export const SettingsForm = ({ settings, onChange }: Props) => {
  const set = <K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <Card className="p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="When you ask for help"
          value={settings.hintMode}
          options={hintModes.map((mode) => ({ value: mode, label: hintModeLabels[mode] }))}
          onChange={(value) => set("hintMode", value)}
          hint={hintModeHints[settings.hintMode]}
        />
        <Select
          label="Corrections"
          value={settings.correctionStyle}
          options={[
            { value: correctionStyles[0], label: "As we go, in character" },
            { value: correctionStyles[1], label: "Save it all for the debrief" },
          ]}
          onChange={(value) => set("correctionStyle", value)}
        />
        <Select
          label="Speaking pace"
          value={settings.agentSpeechRate}
          options={[
            { value: speechRates[0], label: "Slower than natural" },
            { value: speechRates[1], label: "Natural" },
          ]}
          onChange={(value) => set("agentSpeechRate", value)}
        />
        <label className="block">
          <Label>End the call after</Label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              className={fieldClass}
              value={settings.maxDurationMinutes}
              onChange={(event) =>
                set("maxDurationMinutes", Math.max(1, Math.min(60, Number(event.target.value) || 1)))
              }
            />
            <span className="text-sm text-ink-soft">min</span>
          </div>
          <span className="mt-1 block text-xs text-ink-soft">
            Voice minutes are billed, so this is a spending guard as much as a fatigue one.
          </span>
        </label>
      </div>

      <ConnectionChecks />

      {/* The defaults below are the ones worth shipping; they are here for the second run. */}
      <details className="group mt-5 border-t border-rule pt-4">
        <summary className="cursor-pointer list-none text-sm font-medium text-ink-soft transition hover:text-ink">
          <span className="mr-1.5 inline-block transition group-open:rotate-90">›</span>
          Fine-tune the help loop
        </summary>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Select
            label="How long the hint is"
            value={settings.hintLength}
            options={[
              { value: hintLengths[0], label: "Short — the least that works" },
              { value: hintLengths[1], label: "A full sentence" },
            ]}
            onChange={(value) => set("hintLength", value)}
          />
          <Select
            label="If you cannot repeat it"
            value={settings.repeatPolicy}
            options={repeatPolicies.map((policy) => ({
              value: policy,
              label: repeatPolicyLabels[policy],
            }))}
            onChange={(value) => set("repeatPolicy", value)}
            hint={repeatPolicyHints[settings.repeatPolicy]}
          />
          <Select
            label="How close is close enough"
            value={settings.repeatTolerance}
            options={repeatTolerances.map((tolerance) => ({
              value: tolerance,
              label: toleranceLabels[tolerance],
            }))}
            onChange={(value) => set("repeatTolerance", value)}
          />
          <Select
            label="May they use your language?"
            value={settings.allowNativeLanguage ? "yes" : "no"}
            options={[
              { value: "no", label: "No — full immersion" },
              { value: "yes", label: "Yes, if I am truly stuck" },
            ]}
            onChange={(value) => set("allowNativeLanguage", value === "yes")}
          />
          <label className="block sm:col-span-2">
            <Label>Say this out loud to ask for help</Label>
            <input
              className={fieldClass}
              value={settings.helpTrigger}
              onChange={(event) => set("helpTrigger", event.target.value)}
            />
            <span className="mt-1 block text-xs text-ink-soft">
              Pressing <kbd className="rounded border border-rule px-1">H</kbd> or the button always
              works and never goes through speech recognition. A single letter makes a poor spoken
              trigger, so keep this a word.
            </span>
          </label>
        </div>
      </details>
    </Card>
  );
};
