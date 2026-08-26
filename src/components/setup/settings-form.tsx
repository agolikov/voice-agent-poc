"use client";

import { Card, fieldClass, Label, Select } from "~/components/ui";
import { cefrLevels } from "~/lib/scenario/schema";
import {
  beatCountPresets,
  beatCountRange,
  correctionStyles,
  hintLengths,
  hintModes,
  repeatPolicies,
  repeatTolerances,
  speechRates,
  type SessionSettings,
} from "~/lib/session/settings";

/**
 * Languages offered up front. Any BCP-47 tag works — this is a shortlist, not a
 * limit, and the field accepts anything typed into it.
 */
const languages = [
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "pl", label: "Polish" },
  { value: "nl", label: "Dutch" },
  { value: "sv", label: "Swedish" },
  { value: "cs", label: "Czech" },
  { value: "uk", label: "Ukrainian" },
  { value: "ru", label: "Russian" },
  { value: "tr", label: "Turkish" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
] as const;

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

  const { min, max } = beatCountRange[settings.beatCount];

  return (
    <Card className="p-5">
      <h2 className="font-serif text-lg text-ink">Settings for this run</h2>
      <p className="mt-1 text-sm text-ink-soft">
        All of it changes per run. Pick something different next time and the same situation plays
        differently.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Select
          label="I am learning"
          value={settings.targetLanguage}
          options={languages}
          onChange={(value) => set("targetLanguage", value)}
        />
        <Select
          label="My language"
          value={settings.nativeLanguage}
          options={languages}
          onChange={(value) => set("nativeLanguage", value)}
        />
        <Select
          label="My level"
          value={settings.cefrLevel}
          options={cefrLevels.map((level) => ({ value: level, label: level }))}
          onChange={(value) => set("cefrLevel", value)}
          hint="Sets how long and how complex the lines you have to say will be."
        />
        <Select
          label="Scene length"
          value={settings.beatCount}
          options={beatCountPresets.map((preset) => ({
            value: preset,
            label: `${preset[0]?.toUpperCase()}${preset.slice(1)} (${beatCountRange[preset].min}–${beatCountRange[preset].max} beats)`,
          }))}
          onChange={(value) => set("beatCount", value)}
          hint={`New situations you write will get ${min}–${max} beats.`}
        />
      </div>

      <hr className="my-6 border-rule" />

      <h3 className="font-serif text-base text-ink">When you ask for help</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Select
          label="What you hear"
          value={settings.hintMode}
          options={hintModes.map((mode) => ({ value: mode, label: hintModeLabels[mode] }))}
          onChange={(value) => set("hintMode", value)}
          hint={hintModeHints[settings.hintMode]}
        />
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

      <hr className="my-6 border-rule" />

      <h3 className="font-serif text-base text-ink">The other person</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
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
        <Select
          label="May they use your language?"
          value={settings.allowNativeLanguage ? "yes" : "no"}
          options={[
            { value: "no", label: "No — full immersion" },
            { value: "yes", label: "Yes, if I am truly stuck" },
          ]}
          onChange={(value) => set("allowNativeLanguage", value === "yes")}
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
    </Card>
  );
};
