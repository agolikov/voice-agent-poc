import { z } from "zod";

/**
 * CEFR levels, ordered. The agent uses this to pitch its vocabulary and pace,
 * and the scenario generator uses it to decide how long a `modelAnswer` may be.
 */
export const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const cefrLevelSchema = z.enum(cefrLevels);
export type CefrLevel = z.infer<typeof cefrLevelSchema>;

/**
 * A beat is one exchange in the scene: the agent pushes for something, the
 * learner answers. `modelAnswer` is what HELP hands the learner to repeat, so
 * it must be a complete, natural, speakable line in the target language.
 */
export const beatSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().min(0),
  /** What the agent is trying to get the learner to say or do. */
  intent: z.string().min(1),
  /** An example of how the agent opens this beat, in the target language. */
  agentCue: z.string().min(1),
  /** The line the learner repeats when they ask for help. Target language. */
  modelAnswer: z.string().min(1),
  /** Shown on screen (never spoken) in `target-plus-translation` hint mode. */
  modelAnswerTranslation: z.string().min(1),
  keyPhrases: z.array(z.string().min(1)).default([]),
  /** How the agent decides the learner has handled this beat. */
  successCriteria: z.string().min(1),
});
export type Beat = z.infer<typeof beatSchema>;

export const vocabularyEntrySchema = z.object({
  term: z.string().min(1),
  translation: z.string().min(1),
  note: z.string().default(""),
});
export type VocabularyEntry = z.infer<typeof vocabularyEntrySchema>;

export const scenarioSourceSchema = z.enum(["library", "generated"]);
export type ScenarioSource = z.infer<typeof scenarioSourceSchema>;

export const scenarioSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  title: z.string().min(1),
  source: scenarioSourceSchema,
  /** BCP-47, e.g. "pl", "es-ES". The language the learner is practising. */
  targetLanguage: z.string().min(2),
  cefrLevel: cefrLevelSchema,
  /** One sentence of place and time: "A pharmacy in Krakow, late evening". */
  setting: z.string().min(1),
  agentRole: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    persona: z.string().min(1),
    /** Optional per-scenario voice; session settings can still override it. */
    voiceId: z.string().optional(),
  }),
  userRole: z.object({
    role: z.string().min(1),
    goal: z.string().min(1),
  }),
  beats: z.array(beatSchema).min(1),
  vocabulary: z.array(vocabularyEntrySchema).default([]),
  /** How the agent wraps the scene once the last beat lands. */
  closing: z.string().min(1),
  successCriteria: z.array(z.string().min(1)).default([]),
});
export type Scenario = z.infer<typeof scenarioSchema>;

/**
 * What the generator model is asked to produce. `id`, `slug` and `source` are
 * assigned by us, not the model — it has no business inventing identifiers, and
 * letting it try is a reliable source of schema failures.
 */
export const generatedScenarioSchema = scenarioSchema.omit({
  id: true,
  slug: true,
  source: true,
});
export type GeneratedScenario = z.infer<typeof generatedScenarioSchema>;

/** Re-index beats so `index` always matches array position. */
export const normalizeBeats = (beats: Beat[]): Beat[] =>
  beats.map((beat, index) => ({ ...beat, index }));

/**
 * A curated situation, before it has a language.
 *
 * Hand-writing 12 scenarios for every target language does not scale, and the
 * part worth curating is the situation design — the roles, the goal, the shape
 * of the exchange — not the Spanish for "I'd like to return this". So the
 * library ships templates, authored in English, and a template is realized into
 * a concrete `Scenario` for a given language and level on first use, then cached.
 *
 * The generated-from-a-description path produces a template too, so both
 * sources go through exactly the same realization step.
 */
export const beatTemplateSchema = z.object({
  id: z.string().min(1),
  intent: z.string().min(1),
  successCriteria: z.string().min(1),
});
export type BeatTemplate = z.infer<typeof beatTemplateSchema>;

export const scenarioTemplateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  title: z.string().min(1),
  source: scenarioSourceSchema,
  /** One line the learner reads when picking. */
  summary: z.string().min(1),
  setting: z.string().min(1),
  agentRole: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    persona: z.string().min(1),
    voiceId: z.string().optional(),
  }),
  userRole: z.object({
    role: z.string().min(1),
    goal: z.string().min(1),
  }),
  beats: z.array(beatTemplateSchema).min(1),
  /** Concepts the scene needs, in English. Realization translates them. */
  vocabularyConcepts: z.array(z.string().min(1)).default([]),
  /**
   * What a photo the learner attached actually showed — the menu items, the
   * prices, the times on the ticket. Read once by a vision model and then kept
   * as text, because it is the text that both prompts need: the scene is only
   * grounded in the photo if the model answers name the real dish at the real
   * price. Empty for every situation built without one.
   */
  imageContext: z.string().default(""),
  closing: z.string().min(1),
  successCriteria: z.array(z.string().min(1)).default([]),
  /** Rough difficulty, used to sort the picker. Not a hard gate. */
  suggestedLevel: cefrLevelSchema,
});
export type ScenarioTemplate = z.infer<typeof scenarioTemplateSchema>;

/**
 * What the realization model returns: the language-bearing half of a Scenario.
 * Identifiers, roles and structure come from the template, so the model cannot
 * drift away from the situation that was chosen.
 */
export const realizedBeatSchema = z.object({
  id: z.string().min(1),
  agentCue: z.string().min(1),
  modelAnswer: z.string().min(1),
  modelAnswerTranslation: z.string().min(1),
  keyPhrases: z.array(z.string().min(1)).default([]),
});

export const realizationSchema = z.object({
  /** The scene's setting line, rewritten naturally for the target culture. */
  setting: z.string().min(1),
  agentName: z.string().min(1),
  closing: z.string().min(1),
  beats: z.array(realizedBeatSchema).min(1),
  vocabulary: z.array(vocabularyEntrySchema).default([]),
});
export type Realization = z.infer<typeof realizationSchema>;
