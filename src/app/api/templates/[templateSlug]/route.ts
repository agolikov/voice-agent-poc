import { NextResponse } from "next/server";
import { z } from "zod";

import { getSavedTemplate, saveTemplate } from "~/lib/db/queries";
import { scenarioTemplateSchema } from "~/lib/scenario/schema";

type RouteContext = { params: Promise<{ templateSlug: string }> };

const editableTemplateSchema = scenarioTemplateSchema.omit({
  slug: true,
  source: true,
});

export const GET = async (_request: Request, context: RouteContext): Promise<NextResponse> => {
  const { templateSlug } = await context.params;
  const template = await getSavedTemplate(templateSlug);

  if (!template || template.source !== "generated") {
    return NextResponse.json({ error: "Saved situation not found." }, { status: 404 });
  }

  return NextResponse.json({ template });
};

export const PATCH = async (request: Request, context: RouteContext): Promise<NextResponse> => {
  const { templateSlug } = await context.params;
  const existing = await getSavedTemplate(templateSlug);

  if (!existing || existing.source !== "generated") {
    return NextResponse.json({ error: "Saved situation not found." }, { status: 404 });
  }

  const body = editableTemplateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  const template = scenarioTemplateSchema.parse({
    ...body.data,
    slug: existing.slug,
    source: "generated",
  });
  await saveTemplate(template);

  return NextResponse.json({ template });
};
