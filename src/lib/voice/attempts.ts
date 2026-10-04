import type { ActiveHint } from "~/lib/voice/types";

export type Verdict = "answered" | "repeated" | "partial" | "missed";

/**
 * Whether a judged turn was the learner repeating a hint or answering on their
 * own, which decides where the debrief files it.
 *
 * `repeated` and `missed` only exist inside the help protocol. `partial` does
 * not say which it was, so it counts as a repetition while a hint for that beat
 * is still being worked on — on screen, and neither passed nor given up on.
 */
export const attemptKind = (
  verdict: Verdict,
  beatId: string,
  hint: ActiveHint | null,
): "repeat" | "answer" => {
  if (verdict === "repeated" || verdict === "missed") return "repeat";
  if (verdict === "answered") return "answer";
  return hint?.beatId === beatId && (hint.outcome === "awaiting" || hint.outcome === "partial")
    ? "repeat"
    : "answer";
};
