"use client";

import { ConnectionChecks } from "~/components/setup/connection-checks";
import { useI18n } from "~/components/i18n-provider";
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

type Props = {
  settings: SessionSettings;
  onChange: (settings: SessionSettings) => void;
};

export const SettingsForm = ({ settings, onChange }: Props) => {
  const { t } = useI18n();
  const hintModeLabels = {
    "target-only": t("targetOnly"),
    "target-plus-translation": t("targetTranslation"),
    "native-cue-first": t("nativeCue"),
  } as const;
  const hintModeHints = {
    "target-only": t("targetOnlyHint"),
    "target-plus-translation": t("targetTranslationHint"),
    "native-cue-first": t("nativeCueHint"),
  } as const;
  const repeatPolicyLabels = {
    "two-tries": t("twoTries"),
    "hard-gate": t("hardGate"),
    "one-try": t("oneTry"),
  } as const;
  const repeatPolicyHints = {
    "two-tries": t("twoTriesHint"),
    "hard-gate": t("hardGateHint"),
    "one-try": t("oneTryHint"),
  } as const;
  const toleranceLabels = { strict: t("strict"), normal: t("normal"), lenient: t("lenient") } as const;
  const set = <K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <Card className="p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t("helpMode")}
          value={settings.hintMode}
          options={hintModes.map((mode) => ({ value: mode, label: hintModeLabels[mode] }))}
          onChange={(value) => set("hintMode", value)}
          hint={hintModeHints[settings.hintMode]}
        />
        <Select
          label={t("corrections")}
          value={settings.correctionStyle}
          options={[
            { value: correctionStyles[0], label: t("correctAsYouGo") },
            { value: correctionStyles[1], label: t("correctAtEnd") },
          ]}
          onChange={(value) => set("correctionStyle", value)}
        />
        <Select
          label={t("speakingPace")}
          value={settings.agentSpeechRate}
          options={[
            { value: speechRates[0], label: t("slower") },
            { value: speechRates[1], label: t("natural") },
          ]}
          onChange={(value) => set("agentSpeechRate", value)}
        />
        <label className="block">
          <Label>{t("callLimit")}</Label>
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
            <span className="text-sm text-ink-soft">{t("minutes")}</span>
          </div>
          <span className="mt-1 block text-xs text-ink-soft">
            {t("callLimitHint")}
          </span>
        </label>
      </div>

      <ConnectionChecks />

      {/* The defaults below are the ones worth shipping; they are here for the second run. */}
      <details className="group mt-5 border-t border-rule pt-4">
        <summary className="cursor-pointer list-none text-sm font-medium text-ink-soft transition hover:text-ink">
          <span className="mr-1.5 inline-block transition group-open:rotate-90">›</span>
          {t("fineTune")}
        </summary>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Select
            label={t("hintLength")}
            value={settings.hintLength}
            options={[
              { value: hintLengths[0], label: t("shortHint") },
              { value: hintLengths[1], label: t("fullSentence") },
            ]}
            onChange={(value) => set("hintLength", value)}
          />
          <Select
            label={t("repeatFailure")}
            value={settings.repeatPolicy}
            options={repeatPolicies.map((policy) => ({
              value: policy,
              label: repeatPolicyLabels[policy],
            }))}
            onChange={(value) => set("repeatPolicy", value)}
            hint={repeatPolicyHints[settings.repeatPolicy]}
          />
          <Select
            label={t("tolerance")}
            value={settings.repeatTolerance}
            options={repeatTolerances.map((tolerance) => ({
              value: tolerance,
              label: toleranceLabels[tolerance],
            }))}
            onChange={(value) => set("repeatTolerance", value)}
          />
          <Select
            label={t("nativeAllowed")}
            value={settings.allowNativeLanguage ? "yes" : "no"}
            options={[
              { value: "no", label: t("noImmersion") },
              { value: "yes", label: t("yesStuck") },
            ]}
            onChange={(value) => set("allowNativeLanguage", value === "yes")}
          />
          <label className="block sm:col-span-2">
            <Label>{t("helpTrigger")}</Label>
            <input
              className={fieldClass}
              value={settings.helpTrigger}
              onChange={(event) => set("helpTrigger", event.target.value)}
            />
            <span className="mt-1 block text-xs text-ink-soft">
              {t("helpTriggerHint")}
            </span>
          </label>
        </div>
      </details>
    </Card>
  );
};
