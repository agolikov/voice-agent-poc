import { describe, expect, it } from "vitest";

import { mergeDictation } from "~/lib/speech/dictation";

describe("voice dictation text", () => {
  it("appends speech to text the user already typed", () => {
    expect(mergeDictation("At a hotel", "my booking is missing")).toBe(
      "At a hotel my booking is missing",
    );
  });

  it("does not add stray spaces when either side is empty", () => {
    expect(mergeDictation("", "  Поезд отменили  ")).toBe("Поезд отменили");
  });
});
