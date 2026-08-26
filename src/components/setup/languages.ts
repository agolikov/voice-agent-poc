/**
 * Languages offered up front. Any BCP-47 tag works — this is a shortlist, not a
 * limit.
 */
export const languages = [
  { value: "es", label: "Spanish", flag: "🇪🇸" },
  { value: "fr", label: "French", flag: "🇫🇷" },
  { value: "de", label: "German", flag: "🇩🇪" },
  { value: "it", label: "Italian", flag: "🇮🇹" },
  { value: "pt", label: "Portuguese", flag: "🇵🇹" },
  { value: "pl", label: "Polish", flag: "🇵🇱" },
  { value: "nl", label: "Dutch", flag: "🇳🇱" },
  { value: "sv", label: "Swedish", flag: "🇸🇪" },
  { value: "cs", label: "Czech", flag: "🇨🇿" },
  { value: "uk", label: "Ukrainian", flag: "🇺🇦" },
  { value: "ru", label: "Russian", flag: "🇷🇺" },
  { value: "tr", label: "Turkish", flag: "🇹🇷" },
  { value: "ja", label: "Japanese", flag: "🇯🇵" },
  { value: "ko", label: "Korean", flag: "🇰🇷" },
  { value: "zh", label: "Chinese", flag: "🇨🇳" },
  { value: "ar", label: "Arabic", flag: "🇸🇦" },
  { value: "en", label: "English", flag: "🇬🇧" },
] as const;

export const languageLabel = (value: string, locale = "en") => {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(value) ?? value;
  } catch {
    return languages.find((language) => language.value === value)?.label ?? value;
  }
};

export const languageOptions = (locale = "en") => languages.map((language) => ({
  value: language.value,
  label: `${language.flag}  ${languageLabel(language.value, locale)}`,
}));
