"use client";

import type { ActiveHint } from "~/lib/voice/types";
import type { HintMode } from "~/lib/session/settings";

const outcomeStyles = {
  awaiting: "border-warn bg-warn-soft",
  repeated: "border-accent bg-accent-soft",
  partial: "border-warn bg-warn-soft",
  missed: "border-flag bg-flag-soft",
} as const;

const outcomeLabels = {
  awaiting: "Say this out loud",
  repeated: "Got it",
  partial: "Close — listen again",
  missed: "Moving on. This one is in your debrief.",
} as const;

type Props = { hint: ActiveHint | null; hintMode: HintMode };

/**
 * The hint has to be visible, not only audible: a learner cannot repeat a line
 * they only half-heard, and hunting for it in the transcript breaks the turn.
 *
 * The translation is shown only in the modes that allow it — in `target-only`
 * putting it on screen would quietly undo the immersion the setting asked for.
 */
export const HintCard = ({ hint, hintMode }: Props) => {
  if (!hint) return null;

  return (
    <div className={`rounded-xl border-2 p-5 ${outcomeStyles[hint.outcome]}`}>
      <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">
        {outcomeLabels[hint.outcome]}
      </p>
      <p className="mt-2 font-serif text-2xl leading-snug text-ink">{hint.text}</p>
      {hintMode !== "target-only" ? (
        <p className="mt-2 text-sm text-ink-soft">{hint.translation}</p>
      ) : null}
    </div>
  );
};
