import { NextResponse } from "next/server";

import { deleteSession } from "~/lib/db/queries";

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * Delete one past conversation, with its attempts and its transcript.
 *
 * There is one anonymous visitor behind the site-wide passcode, so having
 * reached this route is the whole authorisation story — see src/lib/auth/gate.ts.
 * A missing session is a 404 rather than a silent success, so the history page
 * does not report a row as deleted when the id it held was already stale.
 */
export const DELETE = async (_request: Request, context: RouteContext): Promise<NextResponse> => {
  const { sessionId } = await context.params;
  return (await deleteSession(sessionId))
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
};
