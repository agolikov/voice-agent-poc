"use client";

import { languageOptions } from "~/components/setup/languages";
import { Card, Select } from "~/components/ui";
import { cefrLevels } from "~/lib/scenario/schema";
import type { SessionSettings } from "~/lib/session/settings";

type Props = {
  settings: SessionSettings;
  onChange: (settings: SessionSettings) => void;
};

export const LanguageForm = ({ settings, onChange }: Props) => {
  const set = <K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <Card className="p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="I am learning"
          value={settings.targetLanguage}
          options={languageOptions}
          onChange={(value) => set("targetLanguage", value)}
          hint="The whole scene is written and spoken in this language."
        />
        <Select
          label="My language"
          value={settings.nativeLanguage}
          options={languageOptions}
          onChange={(value) => set("nativeLanguage", value)}
          hint="Used for translations and, if you allow it, for cues."
        />
        <Select
          label="My level"
          value={settings.cefrLevel}
          options={cefrLevels.map((level) => ({ value: level, label: level }))}
          onChange={(value) => set("cefrLevel", value)}
          hint="Sets how long and how complex the lines you have to say will be."
        />
      </div>
    </Card>
  );
};
