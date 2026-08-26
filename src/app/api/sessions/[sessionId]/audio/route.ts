import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

import { getSessionRecord } from "~/lib/db/queries";

type RouteContext = { params: Promise<{ sessionId: string }> };

export const GET = async (_request: Request, context: RouteContext): Promise<Response> => {
  const { sessionId } = await context.params;
  const session = await getSessionRecord(sessionId);
  if (!session) return Response.json({ error: "Session not found." }, { status: 404 });
  if (!session.conversationId) {
    return Response.json(
      { error: "No ElevenLabs recording is attached to this session." },
      { status: 404 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ELEVENLABS_API_KEY is not set." }, { status: 500 });
  }

  try {
    const client = new ElevenLabsClient({ apiKey });
    const audio = await client.conversationalAi.conversations.audio.get(session.conversationId);
    return new Response(audio, {
      headers: {
        "content-type": "audio/mpeg",
        "content-disposition": `attachment; filename="callmode-${sessionId}.mp3"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recording unavailable.";
    return Response.json({ error: message }, { status: 502 });
  }
};
