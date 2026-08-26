import { NextResponse } from "next/server";
import { z } from "zod";

import { recordAttempt } from "~/lib/db/queries";

const bodySchema = z.object({
  beatId: z.string().min(1),
  kind: z.enum(["answer", "hint", "repeat", "mistake"]),
  heard: z.string().default(""),
  expected: z.string().default(""),
  verdict: z.enum(["answered", "repeated", "partial", "missed"]).optional(),
  correction: z.string().default(""),
  category: z.string().optional(),
});

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * Append one entry to the session's attempt log.
 *
 * Called from client tool handlers while the conversation is live, so it must
 * stay cheap and must never throw back into the agent's turn — a failed log
 * write is not a reason to derail a call.
 */
export const POST = async (request: Request, context: RouteContext): Promise<NextResponse> => {
  const { sessionId } = await context.params;
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  await recordAttempt({ sessionId, ...body.data });
  return NextResponse.json({ ok: true });
};
