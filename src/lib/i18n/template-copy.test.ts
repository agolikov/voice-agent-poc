import { describe, expect, it } from "vitest";

import { localizeTemplate } from "~/lib/i18n/template-copy";
import type { TemplateSummary } from "~/lib/voice/types";

const template: TemplateSummary = {
  slug: "airport-check-in",
  title: "Airport check-in",
  summary: "Summary",
  userGoal: "Goal",
  source: "library",
  suggestedLevel: "A2",
  beatCount: 5,
  editable: false,
};

describe("localizeTemplate", () => {
  it("localizes curated copy without changing scenario metadata", () => {
    expect(localizeTemplate(template, "ru")).toMatchObject({
      slug: template.slug,
      title: "Регистрация в аэропорту",
      suggestedLevel: "A2",
    });
  });

  it("preserves user-created scenarios", () => {
    const generated = { ...template, source: "generated" as const };
    expect(localizeTemplate(generated, "pl")).toBe(generated);
  });
});
