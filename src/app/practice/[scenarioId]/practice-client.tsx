"use client";

import { useEffect, useState } from "react";

import { ConversationProvider } from "@elevenlabs/react";

import { useI18n } from "~/components/i18n-provider";
import { CallStage } from "~/components/call/call-stage";
import type { Scenario } from "~/lib/scenario/schema";
import { defaultSessionSettings, type SessionSettings } from "~/lib/session/settings";
import { loadSettings } from "~/lib/session/store";

/**
 * Settings are read in the browser, so the first paint uses the defaults and
 * settles a tick later. Rendering the call before they are read would connect
 * the agent with the wrong hint mode and language.
 */
export const PracticeClient = ({ scenario }: { scenario: Scenario }) => {
  const { t } = useI18n();
  const [settings, setSettings] = useState<SessionSettings | null>(null);

  useEffect(() => setSettings(loadSettings()), []);

  if (!settings) {
    return <p className="text-sm text-ink-soft">{t("loadingSettings")}</p>;
  }

  return (
    <ConversationProvider>
      <CallStage scenario={scenario} settings={{ ...defaultSessionSettings, ...settings }} />
    </ConversationProvider>
  );
};
