"use client";

import { useI18n } from "~/components/i18n-provider";

const storageKey = "callmode-theme";

export const ThemeToggle = () => {
  const { t } = useI18n();
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    root.style.colorScheme = next;
    localStorage.setItem(storageKey, next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full border border-rule bg-card/90 px-3 py-1.5 text-xs font-medium text-ink shadow-sm backdrop-blur transition hover:border-accent"
      aria-label={t("toggleTheme")}
      title={t("toggleTheme")}
    >
      <span className="theme-light-action" aria-hidden="true">
        ☀ {t("lightMode")}
      </span>
      <span className="theme-dark-action" aria-hidden="true">
        ◐ {t("darkMode")}
      </span>
    </button>
  );
};
