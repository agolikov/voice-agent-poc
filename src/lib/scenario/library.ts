import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { scenarioTemplateSchema, type ScenarioTemplate } from "~/lib/scenario/schema";

const templatesDir = join(process.cwd(), "src/data/templates");

/**
 * Read and validate every curated template. Server-only: it touches the
 * filesystem, so the browser gets this list through /api/scenarios instead.
 *
 * A malformed template throws at read time rather than surfacing as a broken
 * scene halfway through a call.
 */
export const loadTemplates = (): ScenarioTemplate[] => {
  const files = readdirSync(templatesDir).filter((file) => file.endsWith(".json"));

  const templates = files.map((file) => {
    const raw: unknown = JSON.parse(readFileSync(join(templatesDir, file), "utf8"));
    const parsed = scenarioTemplateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid scenario template ${file}: ${parsed.error.message}`);
    }
    return parsed.data;
  });

  return templates.sort((a, b) => a.title.localeCompare(b.title));
};

export const findTemplate = (slug: string): ScenarioTemplate | undefined =>
  loadTemplates().find((template) => template.slug === slug);
