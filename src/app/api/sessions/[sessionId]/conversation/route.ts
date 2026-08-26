import { NextResponse } from "next/server";
import { z } from "zod";

import { attachConversationId } from "~/lib/db/queries";

const bodySchema = z.object({ conversationId: z.string().min(1) });

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * Bind the ElevenLabs conversation id to our session row. Without this the
 * post-call webhook has no way to find the session it belongs to.
 */
export const POST = async (request: Request, context: RouteContext): Promise<NextResponse> => {
  const { sessionId } = await context.params;
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  await attachConversationId(sessionId, body.data.conversationId);
  return NextResponse.json({ ok: true });
};
