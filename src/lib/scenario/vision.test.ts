import { describe, expect, it } from "vitest";

import { decodedBytes, maxImageBytes, parseDataUrl } from "~/lib/scenario/vision";

const dataUrl = (mediaType: string, bytes: number) =>
  `data:${mediaType};base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;

describe("accepting a photo from the browser", () => {
  it("splits a data URL into the parts a model message needs", () => {
    const image = parseDataUrl("data:image/jpeg;base64,QUJD");
    expect(image).toEqual({ mediaType: "image/jpeg", base64: "QUJD" });
  });

  it("refuses anything that is not an image data URL", () => {
    expect(() => parseDataUrl("https://example.com/menu.jpg")).toThrow(/does not look like/i);
    expect(() => parseDataUrl("data:application/pdf;base64,QUJD")).toThrow(/not supported/i);
    // A PDF or an SVG dressed up as a photo would reach the provider and fail
    // there instead, one round trip later.
    expect(() => parseDataUrl("data:image/svg+xml;base64,QUJD")).toThrow(/not supported/i);
  });

  it("refuses a photo too large to be worth sending", () => {
    expect(() => parseDataUrl(dataUrl("image/jpeg", maxImageBytes + 1_000))).toThrow(/too large/i);
    expect(parseDataUrl(dataUrl("image/png", maxImageBytes - 1_000)).mediaType).toBe("image/png");
  });

  it("measures the decoded weight, not the base64 length", () => {
    expect(decodedBytes("QUJD")).toBe(3);
    expect(decodedBytes("QUJDRA==")).toBe(4);
    expect(decodedBytes("QUJDREU=")).toBe(5);
  });
});
