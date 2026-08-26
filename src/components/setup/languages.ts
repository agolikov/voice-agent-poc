/**
 * Languages offered up front. Any BCP-47 tag works — this is a shortlist, not a
 * limit.
 */
export const languages = [
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "pl", label: "Polish" },
  { value: "nl", label: "Dutch" },
  { value: "sv", label: "Swedish" },
  { value: "cs", label: "Czech" },
  { value: "uk", label: "Ukrainian" },
  { value: "ru", label: "Russian" },
  { value: "tr", label: "Turkish" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
] as const;

export const languageLabel = (value: string) =>
  languages.find((language) => language.value === value)?.label ?? value;
