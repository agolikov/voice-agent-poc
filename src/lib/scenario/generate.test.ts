import { describe, expect, it } from "vitest";

import { mergeRealization, realizationKey } from "~/lib/scenario/generate";
import { loadTemplates } from "~/lib/scenario/library";
import { realizationSchema, scenarioSchema, type Realization } from "~/lib/scenario/schema";
import { defaultSessionSettings } from "~/lib/session/settings";

const template = loadTemplates().find((candidate) => candidate.slug === "pharmacy")!;

const realizationFor = (ids: string[]): Realization => ({
  setting: "A pharmacy in Seville, late evening",
  agentName: "el farmaceutico",
  closing: "Wish them well and say goodbye",
  beats: ids.map((id) => ({
    id,
    agentCue: `cue for ${id}`,
    modelAnswer: `respuesta para ${id}`,
    modelAnswerTranslation: `answer for ${id}`,
    keyPhrases: [`frase ${id}`],
  })),
  vocabulary: [{ term: "la garganta", translation: "throat", note: "" }],
});

const allIds = template.beats.map((beat) => beat.id);

describe("merging a realization onto its template", () => {
  it("produces a scenario that satisfies the schema", () => {
    const scenario = mergeRealization(
      template,
      realizationFor(allIds),
      defaultSessionSettings,
      "scenario-1",
    );
    expect(scenarioSchema.safeParse(scenario).success).toBe(true);
    expect(scenario.beats).toHaveLength(template.beats.length);
  });

  it("keeps the template's structure rather than the model's", () => {
    const shuffled = realizationFor([...allIds].reverse());
    const scenario = mergeRealization(
      template,
      shuffled,
      defaultSessionSettings,
      "scenario-1",
    );
    expect(scenario.beats.map((beat) => beat.id)).toEqual(allIds);
    expect(scenario.beats.map((beat) => beat.index)).toEqual(allIds.map((_, index) => index));
  });

  it("ignores beats the model invented", () => {
    const withExtra = realizationFor([...allIds, "a-beat-nobody-asked-for"]);
    const scenario = mergeRealization(
      template,
      withExtra,
      defaultSessionSettings,
      "scenario-1",
    );
    expect(scenario.beats.map((beat) => beat.id)).toEqual(allIds);
  });

  /**
   * A dropped beat is survivable; a beat with no model answer is not, because
   * asking for help on it would leave nothing to repeat.
   */
  it("drops a beat the model skipped rather than shipping one with no hint", () => {
    const missingOne = realizationFor(allIds.slice(1));
    const scenario = mergeRealization(
      template,
      missingOne,
      defaultSessionSettings,
      "scenario-1",
    );
    expect(scenario.beats).toHaveLength(allIds.length - 1);
    for (const beat of scenario.beats) {
      expect(beat.modelAnswer.length).toBeGreaterThan(0);
    }
  });

  it("refuses a realization with nothing usable in it", () => {
    expect(() =>
      mergeRealization(template, realizationFor(["nothing-real"]), defaultSessionSettings, "s"),
    ).toThrow(/no usable beats/);
  });

  it("rejects a malformed model response at the schema, before merging", () => {
    const malformed = { setting: "", agentName: "x", closing: "y", beats: [] };
    expect(realizationSchema.safeParse(malformed).success).toBe(false);
  });
});

describe("the realization cache key", () => {
  it("is stable for the same template, language and level", () => {
    expect(realizationKey(template, defaultSessionSettings)).toBe(
      realizationKey(template, defaultSessionSettings),
    );
  });

  it("changes when the language or the level changes", () => {
    const base = realizationKey(template, defaultSessionSettings);
    expect(realizationKey(template, { ...defaultSessionSettings, targetLanguage: "pl" })).not.toBe(base);
    expect(realizationKey(template, { ...defaultSessionSettings, cefrLevel: "C1" })).not.toBe(base);
  });

  /**
   * Hint mode and the repeat policy shape the conversation, not the words on the
   * page — so changing them must reuse the cached scene instead of paying for a
   * new one.
   */
  it("does not change for settings that only affect how the scene is played", () => {
    const base = realizationKey(template, defaultSessionSettings);
    expect(realizationKey(template, { ...defaultSessionSettings, hintMode: "native-cue-first" })).toBe(base);
    expect(realizationKey(template, { ...defaultSessionSettings, repeatPolicy: "hard-gate" })).toBe(base);
  });
});
