import { describe, expect, it } from "vitest";

import { isUiLocale } from "~/lib/i18n/locale";
import { translate } from "~/lib/i18n/messages";

describe("interface translations", () => {
  it("supports exactly English, Polish, and Russian", () => {
    expect(["en", "pl", "ru"].every(isUiLocale)).toBe(true);
    expect(isUiLocale("de")).toBe(false);
  });

  it("interpolates values in every supported alphabet", () => {
    expect(translate("en", "beatProgress", { current: 2, total: 6 })).toBe("Beat 2 of 6");
    expect(translate("pl", "beatProgress", { current: 2, total: 6 })).toBe("Etap 2 z 6");
    expect(translate("ru", "beatProgress", { current: 2, total: 6 })).toBe("Этап 2 из 6");
  });
});
