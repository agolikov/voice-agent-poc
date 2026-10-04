import { describe, expect, it } from "vitest";

import { attemptKind } from "~/lib/voice/attempts";
import type { ActiveHint } from "~/lib/voice/types";

const hint = (outcome: ActiveHint["outcome"], beatId = "greeting"): ActiveHint => ({
  beatId,
  text: "Buenas tardes, me duele la garganta.",
  translation: "Good evening, my throat hurts.",
  outcome,
});

describe("filing a judged turn for the debrief", () => {
  it("files a partial attempt at the hint on screen as a repetition", () => {
    expect(attemptKind("partial", "greeting", hint("awaiting"))).toBe("repeat");
  });

  it("keeps filing the second try at the same hint as a repetition", () => {
    expect(attemptKind("partial", "greeting", hint("partial"))).toBe("repeat");
  });

  it("files a partial answer given without help as an answer", () => {
    expect(attemptKind("partial", "greeting", null)).toBe("answer");
  });

  it("does not tie a partial answer to a hint from another beat", () => {
    expect(attemptKind("partial", "symptoms", hint("awaiting"))).toBe("answer");
  });

  it("does not tie a partial answer to a hint already settled", () => {
    expect(attemptKind("partial", "greeting", hint("repeated"))).toBe("answer");
    expect(attemptKind("partial", "greeting", hint("missed"))).toBe("answer");
  });

  it("files the help protocol's own verdicts as repetitions, hint or not", () => {
    expect(attemptKind("repeated", "greeting", null)).toBe("repeat");
    expect(attemptKind("missed", "greeting", null)).toBe("repeat");
  });

  it("files an unaided answer as an answer even while a hint is up", () => {
    expect(attemptKind("answered", "greeting", hint("awaiting"))).toBe("answer");
  });
});
