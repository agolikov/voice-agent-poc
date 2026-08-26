import { NextResponse } from "next/server";
import { z } from "zod";

import { findCachedScenario, listSavedTemplates, saveScenario } from "~/lib/db/queries";
import { realizeScenario } from "~/lib/scenario/generate";
import { findTemplate } from "~/lib/scenario/library";
import type { ScenarioTemplate } from "~/lib/scenario/schema";
import { sessionSettingsSchema } from "~/lib/session/settings";

const bodySchema = z.object({
  templateSlug: z.string().min(1),
  settings: sessionSettingsSchema,
});

/**
 * Give a situation a language, so the brief can show the learner what they are
 * walking into. No session row yet — that belongs to the moment the call starts,
 * not to reading the brief and changing your mind.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  const { templateSlug, settings } = body.data;

  const template: ScenarioTemplate | undefined =
    findTemplate(templateSlug) ??
    (await listSavedTemplates()).find((saved) => saved.slug === templateSlug);

  if (!template) {
    return NextResponse.json({ error: `No situation called "${templateSlug}".` }, { status: 404 });
  }

  try {
    const cached = await findCachedScenario(template, settings);
    const scenario =
      cached ?? (await saveScenario(await realizeScenario(template, settings), template, settings));

    return NextResponse.json({ scenario, cached: cached !== null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
