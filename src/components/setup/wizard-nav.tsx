"use client";

type Props = {
  steps: readonly string[];
  current: number;
  /** Steps up to here have been reached, so they stay clickable. */
  furthest: number;
  onSelect: (index: number) => void;
};

export const WizardNav = ({ steps, current, furthest, onSelect }: Props) => (
  <nav aria-label="Setup steps">
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((label, index) => {
        const state = index < current ? "done" : index === current ? "now" : "todo";
        const reachable = index <= furthest;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none sm:gap-3">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onSelect(index)}
              aria-current={state === "now" ? "step" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full text-sm transition ${
                reachable ? "hover:text-ink" : "cursor-default"
              } ${state === "now" ? "text-ink" : "text-ink-soft"}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                  state === "now"
                    ? "border-accent bg-accent text-white"
                    : state === "done"
                      ? "border-accent text-accent"
                      : "border-rule"
                }`}
              >
                {state === "done" ? "✓" : index + 1}
              </span>
              <span className={`hidden sm:inline ${state === "now" ? "font-medium" : ""}`}>
                {label}
              </span>
            </button>
            {index < steps.length - 1 ? <span className="h-px flex-1 bg-rule" /> : null}
          </li>
        );
      })}
    </ol>
  </nav>
);
