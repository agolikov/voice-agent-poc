"use client";

import Link from "next/link";

import { ThemeToggle } from "~/components/theme-toggle";
import { useI18n } from "~/components/i18n-provider";
import { uiLocales, type UiLocale } from "~/lib/i18n/locale";

const labels: Record<UiLocale, string> = { en: "English", pl: "Polski", ru: "Русский" };

export const GlobalControls = () => {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="fixed top-3 right-3 z-40 flex flex-wrap items-center justify-end gap-2">
      <label className="rounded-full border border-rule bg-card/90 px-2.5 py-1.5 text-xs text-ink shadow-sm backdrop-blur">
        <span className="sr-only">{t("interfaceLanguage")}</span>
        <select
          aria-label={t("interfaceLanguage")}
          className="bg-transparent font-medium outline-none"
          value={locale}
          onChange={(event) => setLocale(event.target.value as UiLocale)}
        >
          {uiLocales.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
        </select>
      </label>
      <Link href="/history" className="rounded-full border border-rule bg-card/90 px-3 py-1.5 text-xs font-medium text-ink shadow-sm backdrop-blur transition hover:border-accent">
        {t("pastCalls")}
      </Link>
      <ThemeToggle />
    </div>
  );
};
