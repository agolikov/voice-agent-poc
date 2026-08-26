"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { uiLocaleCookie, type UiLocale } from "~/lib/i18n/locale";
import { translate, type MessageKey } from "~/lib/i18n/messages";

type I18nValue = {
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export const I18nProvider = ({ locale: initialLocale, children }: { locale: UiLocale; children: ReactNode }) => {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale: (next) => {
        setLocaleState(next);
        document.documentElement.lang = next;
        document.cookie = `${uiLocaleCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      },
      t: (key, values) => translate(locale, key, values),
    }),
    [locale, router],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nValue => {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
};
