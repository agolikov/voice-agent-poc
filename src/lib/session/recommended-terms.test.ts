import { describe, expect, it } from "vitest";

import { findRecommendedTerms } from "~/lib/session/recommended-terms";

describe("recommended term matching", () => {
  it("matches phrases without caring about case, accents, or punctuation", () => {
    expect(
      findRecommendedTerms("Sí, tengo DOLOR de cabeza.", ["el dolor de cabeza", "dolor de cabeza"]),
    ).toEqual(["dolor de cabeza"]);
  });

  it("does not match inside a longer word", () => {
    expect(findRecommendedTerms("La pantalla está rota", ["pan"])).toEqual([]);
  });

  it("deduplicates repeated recommendations", () => {
    expect(findRecommendedTerms("Quiero el jarabe", ["el jarabe", "el jarabe"])).toEqual([
      "el jarabe",
    ]);
  });
});
