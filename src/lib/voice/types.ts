import type { Scenario } from "~/lib/scenario/schema";
import type { DynamicVariables } from "~/lib/session/dynamic-variables";
import type { SessionSettings } from "~/lib/session/settings";

/** What /api/scenarios/prepare hands back: the situation, given a language. */
export type PreparedScenario = {
  scenario: Scenario;
  cached: boolean;
};

/** What /api/sessions hands back when a run actually starts. */
export type OpenedSession = {
  sessionId: string;
  dynamicVariables: DynamicVariables;
  overrides: {
    agent: { language: string; firstMessage?: string };
    tts: { voiceId?: string; speed: number };
    asr: { keywords: string[] };
  };
};

export type TemplateSummary = {
  slug: string;
  title: string;
  summary: string;
  source: "library" | "generated";
  suggestedLevel: SessionSettings["cefrLevel"];
  beatCount: number;
  userGoal: string;
  editable: boolean;
};

/** A hint currently on screen, put there by the agent's showHint call. */
export type ActiveHint = {
  beatId: string;
  text: string;
  translation: string;
  /** Set once the learner's repetition has been judged. */
  outcome: "awaiting" | "repeated" | "partial" | "missed";
};

export type TranscriptEntry = {
  id: string;
  eventId?: number;
  role: "agent" | "learner";
  text: string;
  recommendedTerms: string[];
  agentResponseMs?: number;
  modelResponseMs?: number;
  modelName?: string;
  createdAt?: string;
};

export type LoggedMistake = {
  heard: string;
  correction: string;
  category: string;
};
