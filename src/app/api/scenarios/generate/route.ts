import { NextResponse } from "next/server";
import { z } from "zod";

import { saveTemplate } from "~/lib/db/queries";
import { uiLocales } from "~/lib/i18n/locale";
import { generateTemplate } from "~/lib/scenario/generate";
import { sessionSettingsSchema } from "~/lib/session/settings";

const bodySchema = z.object({
  description: z.string().min(3).max(500),
  settings: sessionSettingsSchema,
  uiLocale: z.enum(uiLocales).default("en"),
});

/**
 * Turn a free-text request into a saved template. It is not realized here — the
 * caller then goes through /api/scenarios/prepare like any curated situation,
 * so both paths share one code path and one cache.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  try {
    const template = await generateTemplate(
      body.data.description,
      body.data.settings,
      body.data.uiLocale,
    );
    await saveTemplate(template);
    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
