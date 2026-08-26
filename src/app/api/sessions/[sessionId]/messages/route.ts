import { NextResponse } from "next/server";
import { z } from "zod";

import { recordMessage } from "~/lib/db/queries";

const bodySchema = z.object({
  id: z.string().min(1),
  eventId: z.number().int().optional(),
  role: z.enum(["agent", "learner"]),
  text: z.string(),
  recommendedTerms: z.array(z.string()).default([]),
  agentResponseMs: z.number().int().nonnegative().optional(),
  modelResponseMs: z.number().int().nonnegative().optional(),
  modelName: z.string().optional(),
});

type RouteContext = { params: Promise<{ sessionId: string }> };

export const POST = async (request: Request, context: RouteContext): Promise<NextResponse> => {
  const { sessionId } = await context.params;
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  await recordMessage({ sessionId, ...body.data });
  return NextResponse.json({ ok: true });
};
