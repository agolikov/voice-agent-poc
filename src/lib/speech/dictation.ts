export const mergeDictation = (existing: string, spoken: string): string =>
  [existing.trim(), spoken.trim()].filter(Boolean).join(" ");
