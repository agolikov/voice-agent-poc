"use client";

import { languageOptions } from "~/components/setup/languages";
import { useI18n } from "~/components/i18n-provider";
import { Card, Select } from "~/components/ui";
import { cefrLevels } from "~/lib/scenario/schema";
import type { SessionSettings } from "~/lib/session/settings";

type Props = {
  settings: SessionSettings;
  onChange: (settings: SessionSettings) => void;
};

export const LanguageForm = ({ settings, onChange }: Props) => {
  const { locale, t } = useI18n();
  const set = <K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <Card className="p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t("learningLanguage")}
          value={settings.targetLanguage}
          options={languageOptions(locale)}
          onChange={(value) => set("targetLanguage", value)}
          hint={t("learningLanguageHint")}
        />
        <Select
          label={t("nativeLanguage")}
          value={settings.nativeLanguage}
          options={languageOptions(locale)}
          onChange={(value) => set("nativeLanguage", value)}
          hint={t("nativeLanguageHint")}
        />
        <Select
          label={t("level")}
          value={settings.cefrLevel}
          options={cefrLevels.map((level) => ({ value: level, label: level }))}
          onChange={(value) => set("cefrLevel", value)}
          hint={t("levelHint")}
        />
      </div>
    </Card>
  );
};
