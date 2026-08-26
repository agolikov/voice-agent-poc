import { describe, expect, it } from "vitest";

import { meetsTolerance, normalizeForComparison, similarity } from "~/lib/session/similarity";

describe("normalizing a transcript", () => {
  it("ignores case, punctuation and diacritics", () => {
    expect(normalizeForComparison("¿Cómo estás, señor?")).toBe("como estas senor");
  });

  it("collapses the whitespace a transcript arrives with", () => {
    expect(normalizeForComparison("  me  duele\tla   garganta ")).toBe("me duele la garganta");
  });
});

describe("scoring a repetition", () => {
  const expected = "me duele la garganta desde hace tres dias";

  it("scores a verbatim repetition as perfect", () => {
    expect(similarity(expected, expected)).toBe(1);
  });

  it("ignores a missing accent, which is usually the transcriber's fault", () => {
    expect(similarity("me duele la garganta desde hace tres días", expected)).toBe(1);
  });

  it("penalises one wrong word gently", () => {
    const score = similarity("me duele la cabeza desde hace tres dias", expected);
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThan(1);
  });

  it("scores an unrelated answer near zero", () => {
    expect(similarity("no gracias", expected)).toBeLessThan(0.2);
  });

  it("scores silence as zero", () => {
    expect(similarity("", expected)).toBe(0);
  });
});

describe("tolerance thresholds", () => {
  const expected = "no soy alergico a nada";

  it("lets a verbatim repetition through at every tolerance", () => {
    for (const tolerance of ["strict", "normal", "lenient"] as const) {
      expect(meetsTolerance(expected, expected, tolerance), tolerance).toBe(true);
    }
  });

  it("rejects a one-word slip under strict but accepts it under normal", () => {
    const heard = "no soy alergico a nadie";
    expect(meetsTolerance(heard, expected, "strict")).toBe(false);
    expect(meetsTolerance(heard, expected, "normal")).toBe(true);
  });

  it("accepts a half-remembered line only when lenient", () => {
    const heard = "no alergico nada";
    expect(meetsTolerance(heard, expected, "normal")).toBe(false);
    expect(meetsTolerance(heard, expected, "lenient")).toBe(true);
  });
});
