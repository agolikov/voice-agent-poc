/** Normalize for matching while preserving the original transcript for display. */
const normalized = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * Return the recommended words/phrases used in a learner turn.
 * Word padding prevents a short term such as "pan" matching "pantalla".
 */
export const findRecommendedTerms = (text: string, terms: readonly string[]): string[] => {
  const haystack = ` ${normalized(text)} `;
  return [...new Set(terms)].filter((term) => {
    const needle = normalized(term);
    return needle.length > 0 && haystack.includes(` ${needle} `);
  });
};

/** Vocabulary plus beat key phrases are both recommendations shown by the app. */
export const scenarioRecommendedTerms = (scenario: {
  vocabulary: { term: string }[];
  beats: { keyPhrases: string[] }[];
}): string[] => [
  ...new Set([
    ...scenario.vocabulary.map(({ term }) => term),
    ...scenario.beats.flatMap(({ keyPhrases }) => keyPhrases),
  ]),
];
