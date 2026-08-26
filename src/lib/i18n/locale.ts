export const uiLocales = ["en", "pl", "ru"] as const;
export type UiLocale = (typeof uiLocales)[number];

export const uiLocaleCookie = "callmode-locale";

export const isUiLocale = (value: unknown): value is UiLocale =>
  typeof value === "string" && uiLocales.includes(value as UiLocale);

export const speechLocale: Record<UiLocale, string> = {
  en: "en-US",
  pl: "pl-PL",
  ru: "ru-RU",
};

export const dateLocale: Record<UiLocale, string> = {
  en: "en-GB",
  pl: "pl-PL",
  ru: "ru-RU",
};
