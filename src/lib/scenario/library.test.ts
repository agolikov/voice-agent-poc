import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { scenarioImages } from "~/components/setup/scenario-images";
import { loadTemplates } from "~/lib/scenario/library";

describe("curated template library", () => {
  const templates = loadTemplates();

  it("ships a usable library", () => {
    expect(templates.length).toBeGreaterThanOrEqual(10);
  });

  it("gives every template a unique slug", () => {
    const slugs = templates.map((template) => template.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every template enough beats for a real scene", () => {
    for (const template of templates) {
      expect(template.beats.length, template.slug).toBeGreaterThanOrEqual(4);
    }
  });

  it("gives every beat a unique id within its template", () => {
    for (const template of templates) {
      const ids = template.beats.map((beat) => beat.id);
      expect(new Set(ids).size, template.slug).toBe(ids.length);
    }
  });

  it("gives every template vocabulary to boost in ASR", () => {
    for (const template of templates) {
      expect(template.vocabularyConcepts.length, template.slug).toBeGreaterThan(0);
    }
  });

  it("gives every predefined situation a local thumbnail", () => {
    for (const template of templates) {
      const image = scenarioImages[template.slug];
      expect(image, template.slug).toBeDefined();
      expect(
        existsSync(join(process.cwd(), "public", image!.src.replace(/^\//, ""))),
        image!.src,
      ).toBe(true);
      expect(image!.alt.length, template.slug).toBeGreaterThan(10);
    }
  });
});
