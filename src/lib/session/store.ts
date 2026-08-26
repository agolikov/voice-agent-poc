"use client";

import { defaultSessionSettings, sessionSettingsSchema, type SessionSettings } from "~/lib/session/settings";

const STORAGE_KEY = "callmode.settings";

/**
 * Settings live in the browser because they are this person's preferences, not
 * session state: they carry across runs and are what "change it for the next
 * run" acts on. A stored value that no longer parses falls back to the defaults
 * rather than breaking the setup screen.
 */
export const loadSettings = (): SessionSettings => {
  if (typeof window === "undefined") return defaultSessionSettings;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSessionSettings;
    const parsed = sessionSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultSessionSettings;
  } catch {
    return defaultSessionSettings;
  }
};

export const saveSettings = (settings: SessionSettings): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // A private window with storage disabled is not a reason to block a call.
  }
};
