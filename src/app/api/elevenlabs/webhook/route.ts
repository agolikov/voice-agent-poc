import { NextResponse } from "next/server";

import { attachAnalysis } from "~/lib/db/queries";
import { verifyWebhookSignature } from "~/lib/webhook/verify";

type PostCallPayload = {
  type?: string;
  data?: {
    conversation_id?: string;
    analysis?: unknown;
    transcript?: unknown;
  };
};

/**
 * Post-call analysis. This is enrichment only — the debrief is already built
 * from the live attempt log, so a webhook that never arrives (no public URL in
 * local development, for instance) costs the learner nothing.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ELEVENLABS_WEBHOOK_SECRET is not set." }, { status: 500 });
  }

  const rawBody = await request.text();
  const verified = verifyWebhookSignature(
    rawBody,
    request.headers.get("elevenlabs-signature"),
    secret,
    Math.floor(Date.now() / 1000),
  );

  if (!verified.ok) {
    return NextResponse.json({ error: verified.reason }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as PostCallPayload;
  if (payload.type !== "post_call_transcription") {
    return NextResponse.json({ ok: true, ignored: payload.type ?? "unknown" });
  }

  const conversationId = payload.data?.conversation_id;
  if (!conversationId) {
    return NextResponse.json({ error: "No conversation_id in payload." }, { status: 400 });
  }

  const matched = await attachAnalysis(conversationId, payload.data?.analysis, payload.data?.transcript);
  return NextResponse.json({ ok: true, matched });
};
