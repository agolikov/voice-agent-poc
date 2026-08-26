"use client";

const storageKey = "callmode-theme";

export const ThemeToggle = () => {
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
      className="fixed top-4 right-4 z-40 rounded-full border border-rule bg-card/90 px-3 py-1.5 text-xs font-medium text-ink shadow-sm backdrop-blur transition hover:border-accent"
      aria-label="Toggle color theme"
      title="Toggle color theme"
    >
      <span className="theme-light-action" aria-hidden="true">
        ☀ Light mode
      </span>
      <span className="theme-dark-action" aria-hidden="true">
        ◐ Dark mode
      </span>
    </button>
  );
};
