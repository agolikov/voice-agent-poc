import type { RepeatTolerance } from "~/lib/session/settings";

/**
 * Strip everything that should not decide whether a repetition counts:
 * punctuation, case, and diacritics. Diacritics go because ASR output is
 * inconsistent about them across languages, and a missing accent is a
 * transcription artefact far more often than it is a learner error.
 */
export const normalizeForComparison = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const tokenize = (text: string): string[] =>
  normalizeForComparison(text).split(" ").filter(Boolean);

/** Levenshtein distance over tokens, not characters. */
const tokenDistance = (a: string[], b: string[]): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1);
      const insertion = (current[j - 1] as number) + 1;
      const deletion = (previous[j] as number) + 1;
      current.push(Math.min(substitution, insertion, deletion));
    }
    previous = current;
  }

  return previous[b.length] as number;
};

/**
 * How close a repetition was to the model answer, from 0 to 1.
 *
 * This does not gate the conversation — the agent's own judgement does, because
 * only it knows whether a different word was still correct. This is for showing
 * the learner how close they were in the debrief, and for flagging turns worth
 * a second look.
 */
export const similarity = (heard: string, expected: string): number => {
  const a = tokenize(heard);
  const b = tokenize(expected);
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = tokenDistance(a, b);
  return Math.max(0, 1 - distance / Math.max(a.length, b.length));
};

/** The score at which a repetition stops looking like the model answer. */
export const toleranceThreshold: Record<RepeatTolerance, number> = {
  strict: 0.95,
  normal: 0.7,
  lenient: 0.5,
};

export const meetsTolerance = (
  heard: string,
  expected: string,
  tolerance: RepeatTolerance,
): boolean => similarity(heard, expected) >= toleranceThreshold[tolerance];
