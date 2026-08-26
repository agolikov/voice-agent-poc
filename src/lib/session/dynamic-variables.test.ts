import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadTemplates } from "~/lib/scenario/library";
import type { Scenario } from "~/lib/scenario/schema";
import {
  ASR_KEYWORD_LIMIT,
  buildAsrKeywords,
  buildDynamicVariables,
  buildOverrides,
  hintInstruction,
  languagePolicyInstruction,
  renderBeats,
} from "~/lib/session/dynamic-variables";
import { defaultSessionSettings, type SessionSettings } from "~/lib/session/settings";

const scenario: Scenario = {
  id: "scenario-1",
  slug: "pharmacy",
  title: "At the pharmacy",
  source: "library",
  targetLanguage: "es",
  cefrLevel: "B1",
  setting: "A pharmacy in Seville, late evening",
  agentRole: { name: "el farmaceutico", role: "a pharmacist", persona: "Brisk but kind." },
  userRole: { role: "a customer with a sore throat", goal: "Leave with something to take" },
  beats: [
    {
      id: "greeting",
      index: 0,
      intent: "Open the exchange",
      agentCue: "Buenas tardes, digame.",
      modelAnswer: "Hola, me duele la garganta desde hace tres dias.",
      modelAnswerTranslation: "Hello, my throat has hurt for three days.",
      keyPhrases: ["me duele la garganta", "tres dias"],
      successCriteria: "A symptom has been named",
    },
    {
      id: "allergies",
      index: 1,
      intent: "Ask about allergies",
      agentCue: "Es alergico a algo?",
      modelAnswer: "No soy alergico a nada.",
      modelAnswerTranslation: "I am not allergic to anything.",
      keyPhrases: ["alergico"],
      successCriteria: "Answered yes or no",
    },
  ],
  vocabulary: [
    { term: "la garganta", translation: "throat", note: "" },
    { term: "el jarabe", translation: "syrup", note: "" },
  ],
  closing: "Wish them well and say goodbye",
  successCriteria: ["Described the symptoms without switching languages"],
};

const withSettings = (overrides: Partial<SessionSettings>): SessionSettings => ({
  ...defaultSessionSettings,
  ...overrides,
});

describe("the prompt/code contract", () => {
  /**
   * The agent prompt reads dynamic variables by name. A placeholder with no
   * variable behind it reaches the model as a literal `{{...}}`, and the scene
   * silently loses whichever instruction it carried — so this is asserted
   * rather than trusted.
   */
  it("provides a value for every placeholder in the agent prompt", () => {
    const prompt = readFileSync(
      join(process.cwd(), "agent/prompts/roleplay-tutor.md"),
      "utf8",
    );
    const placeholders = [...new Set([...prompt.matchAll(/\{\{([a-z_]+)\}\}/g)].map((m) => m[1]))];
    const provided = Object.keys(buildDynamicVariables(scenario, defaultSessionSettings));

    expect(placeholders.length).toBeGreaterThan(0);
    expect(placeholders.filter((name) => !provided.includes(name as string))).toEqual([]);
  });

  it("passes only primitives, as the platform requires", () => {
    for (const value of Object.values(buildDynamicVariables(scenario, defaultSessionSettings))) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
    }
  });
});

describe("hint instructions", () => {
  it("forbids the native language in target-only mode", () => {
    const instruction = hintInstruction(withSettings({ hintMode: "target-only" }));
    expect(instruction).toContain("do not use English");
    expect(instruction).not.toContain("translation is already");
  });

  it("keeps the translation off the audio in target-plus-translation mode", () => {
    const instruction = hintInstruction(withSettings({ hintMode: "target-plus-translation" }));
    expect(instruction).toContain("never speak the translation aloud");
  });

  it("asks for exactly one native sentence in native-cue-first mode", () => {
    const instruction = hintInstruction(withSettings({ hintMode: "native-cue-first" }));
    expect(instruction).toContain("ONE short sentence in English");
  });

  it("carves out the cue sentence in the language policy for native-cue-first", () => {
    const policy = languagePolicyInstruction(
      withSettings({ hintMode: "native-cue-first", allowNativeLanguage: false }),
    );
    expect(policy).toContain("one exception");
  });

  it("bans the native language outright in the other immersive modes", () => {
    const policy = languagePolicyInstruction(
      withSettings({ hintMode: "target-only", allowNativeLanguage: false }),
    );
    expect(policy).toContain("Never use English");
  });
});

describe("rendered beats", () => {
  it("hands the model answer to the agent for every beat", () => {
    const rendered = renderBeats(scenario);
    for (const beat of scenario.beats) {
      expect(rendered).toContain(beat.modelAnswer);
      expect(rendered).toContain(beat.id);
    }
  });
});

describe("overrides", () => {
  it("boosts the help trigger and the scene's own words in ASR", () => {
    const settings = withSettings({ helpTrigger: "ayudame" });
    const keywords = buildAsrKeywords(scenario, settings);
    expect(keywords).toContain("ayudame");
    expect(keywords).toContain("la garganta");
    expect(keywords).toContain("me duele la garganta");
  });

  it("respects the platform's keyword cap", () => {
    const wordy: Scenario = {
      ...scenario,
      vocabulary: Array.from({ length: 80 }, (_, index) => ({
        term: `palabra${index}`,
        translation: `word${index}`,
        note: "",
      })),
    };
    expect(buildAsrKeywords(wordy, defaultSessionSettings).length).toBe(ASR_KEYWORD_LIMIT);
  });

  it("opens on the first beat's cue and slows down when asked", () => {
    const overrides = buildOverrides(scenario, withSettings({ agentSpeechRate: "slow" }));
    expect(overrides.agent.firstMessage).toBe(scenario.beats[0]?.agentCue);
    expect(overrides.agent.language).toBe("es");
    expect(overrides.tts.speed).toBeLessThan(1);
  });

  it("lets the session voice win over the scenario voice", () => {
    const overrides = buildOverrides(
      { ...scenario, agentRole: { ...scenario.agentRole, voiceId: "scene-voice" } },
      withSettings({ voiceId: "chosen-voice" }),
    );
    expect(overrides.tts.voiceId).toBe("chosen-voice");
  });
});

describe("every curated template", () => {
  it("produces a complete variable set once realized", () => {
    for (const template of loadTemplates()) {
      const realized: Scenario = {
        ...scenario,
        slug: template.slug,
        title: template.title,
        userRole: template.userRole,
        beats: template.beats.map((beat, index) => ({
          ...scenario.beats[0]!,
          id: beat.id,
          index,
          intent: beat.intent,
          successCriteria: beat.successCriteria,
        })),
      };
      const variables = buildDynamicVariables(realized, defaultSessionSettings);
      expect(variables.beat_count, template.slug).toBe(template.beats.length);
      expect(String(variables.beats_block), template.slug).toContain(template.beats[0]!.id);
    }
  });
});
