import { NextResponse } from "next/server";
import { z } from "zod";

import { endSession } from "~/lib/db/queries";

const bodySchema = z.object({
  outcome: z.enum(["goal-achieved", "partial", "abandoned", "out-of-time"]),
  summary: z.string().default(""),
});

type RouteContext = { params: Promise<{ sessionId: string }> };

export const POST = async (request: Request, context: RouteContext): Promise<NextResponse> => {
  const { sessionId } = await context.params;
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  await endSession(sessionId, body.data.outcome, body.data.summary);
  return NextResponse.json({ ok: true });
};
