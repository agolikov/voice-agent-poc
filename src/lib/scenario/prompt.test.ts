import { describe, expect, it } from "vitest";

import { loadTemplates } from "~/lib/scenario/library";
import { buildRealizationPrompt, buildTemplatePrompt } from "~/lib/scenario/prompt";
import { defaultSessionSettings } from "~/lib/session/settings";

const template = loadTemplates().find((candidate) => candidate.slug === "restaurant")!;

const imageContext = `A handwritten menu board outside a bar in Seville.
- Pulpo a la gallega — 14,50 €
- Tortilla de patatas — 6 €`;

describe("building a situation from a photo", () => {
  it("puts what the photo showed in front of the model that designs the scene", () => {
    const prompt = buildTemplatePrompt({
      description: "Ordering from this menu",
      settings: defaultSessionSettings,
      imageContext,
    });
    expect(prompt).toContain("Pulpo a la gallega — 14,50 €");
    expect(prompt).toContain('practise: "Ordering from this menu"');
  });

  /**
   * A photo is a brief on its own. Asking the model to practise "" would have it
   * invent a situation and ignore the thing the learner actually photographed.
   */
  it("makes the photo the brief when nothing was typed", () => {
    const prompt = buildTemplatePrompt({
      description: "   ",
      settings: defaultSessionSettings,
      imageContext,
    });
    expect(prompt).toContain("did not write anything");
    expect(prompt).toContain("Tortilla de patatas — 6 €");
  });

  /**
   * Realization writes the lines the learner repeats. Without the photo notes it
   * would write them about a plausible menu rather than the one photographed,
   * and the scene would be grounded in nothing.
   */
  it("carries the photo through to the model that writes the lines", () => {
    const prompt = buildRealizationPrompt(
      { ...template, imageContext },
      defaultSessionSettings,
    );
    expect(prompt).toContain("Pulpo a la gallega — 14,50 €");
    expect(prompt).toContain("never invent an entry that is not there");
  });

  it("says nothing about photos when there was no photo", () => {
    const withoutPhoto = buildTemplatePrompt({
      description: "Returning a jacket without a receipt",
      settings: defaultSessionSettings,
    });
    expect(withoutPhoto).not.toMatch(/photograph/i);
    expect(buildRealizationPrompt(template, defaultSessionSettings)).not.toMatch(/photograph/i);
  });
});
