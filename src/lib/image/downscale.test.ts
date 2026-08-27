import { describe, expect, it } from "vitest";

import { fitWithin, maxImageEdge } from "~/lib/image/downscale";

describe("shrinking a photo before it is uploaded", () => {
  it("caps the longest edge and keeps the aspect ratio", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: maxImageEdge, height: 960 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 960, height: maxImageEdge });
  });

  it("leaves a photo that is already small enough alone", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0 });
  });
});
