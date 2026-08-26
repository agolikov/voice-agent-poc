import { z } from "zod";

import { cefrLevelSchema } from "~/lib/scenario/schema";

/**
 * How much support the learner gets when they ask for help.
 *
 * - `target-only`          full immersion; the model answer, nothing else
 * - `target-plus-translation` same audio, translation on screen only
 * - `native-cue-first`     one native-language sentence, then the model answer
 */
export const hintModes = [
  "target-only",
  "target-plus-translation",
  "native-cue-first",
] as const;
export const hintModeSchema = z.enum(hintModes);
export type HintMode = z.infer<typeof hintModeSchema>;

export const hintLengths = ["short", "full-sentence"] as const;
export const hintLengthSchema = z.enum(hintLengths);

/**
 * What happens when the learner cannot repeat the hint.
 *
 * `two-tries` is the default because a hard gate turns a single ASR misfire
 * into a dead conversation.
 */
export const repeatPolicies = ["two-tries", "hard-gate", "one-try"] as const;
export const repeatPolicySchema = z.enum(repeatPolicies);
export type RepeatPolicy = z.infer<typeof repeatPolicySchema>;

export const repeatTolerances = ["strict", "normal", "lenient"] as const;
export const repeatToleranceSchema = z.enum(repeatTolerances);
export type RepeatTolerance = z.infer<typeof repeatToleranceSchema>;

/** Correct as the scene runs, or stay in character and save it all for the debrief. */
export const correctionStyles = ["in-flow", "end-only"] as const;
export const correctionStyleSchema = z.enum(correctionStyles);

export const speechRates = ["slow", "normal"] as const;
export const speechRateSchema = z.enum(speechRates);

export const beatCountPresets = ["short", "standard", "long"] as const;
export const beatCountPresetSchema = z.enum(beatCountPresets);
export type BeatCountPreset = z.infer<typeof beatCountPresetSchema>;

/** Beats requested from the generator, per preset. */
export const beatCountRange: Record<BeatCountPreset, { min: number; max: number }> = {
  short: { min: 4, max: 5 },
  standard: { min: 6, max: 8 },
  long: { min: 10, max: 12 },
};

/** ElevenLabs TTS speed multiplier. Valid range is 0.7 to 1.2. */
export const speechRateValue: Record<z.infer<typeof speechRateSchema>, number> = {
  slow: 0.8,
  normal: 1.0,
};

export const sessionSettingsSchema = z.object({
  targetLanguage: z.string().min(2),
  nativeLanguage: z.string().min(2),
  cefrLevel: cefrLevelSchema,
  /**
   * The spoken help trigger. A single letter is a poor ASR target, so the
   * default is a word — the on-screen button and the `H` key remain the
   * deterministic path and do not go through ASR at all.
   */
  helpTrigger: z.string().min(1).max(40),
  hintMode: hintModeSchema,
  hintLength: hintLengthSchema,
  repeatPolicy: repeatPolicySchema,
  repeatTolerance: repeatToleranceSchema,
  correctionStyle: correctionStyleSchema,
  agentSpeechRate: speechRateSchema,
  /** Overrides the scenario's own voice when set. */
  voiceId: z.string().optional(),
  beatCount: beatCountPresetSchema,
  /** Whether the agent may ever drop into the learner's native language. */
  allowNativeLanguage: z.boolean(),
  /** Cost and fatigue guard. The call ends itself when this elapses. */
  maxDurationMinutes: z.number().int().min(1).max(60),
});
export type SessionSettings = z.infer<typeof sessionSettingsSchema>;

export const defaultSessionSettings: SessionSettings = {
  targetLanguage: "es",
  nativeLanguage: "en",
  cefrLevel: "B1",
  helpTrigger: "help me",
  hintMode: "target-only",
  hintLength: "short",
  repeatPolicy: "two-tries",
  repeatTolerance: "normal",
  correctionStyle: "in-flow",
  agentSpeechRate: "normal",
  beatCount: "standard",
  allowNativeLanguage: false,
  maxDurationMinutes: 10,
};

/** A named, reusable settings preset. */
export const settingsPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  settings: sessionSettingsSchema,
});
export type SettingsPreset = z.infer<typeof settingsPresetSchema>;
