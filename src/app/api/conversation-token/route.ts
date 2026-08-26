import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

/**
 * Mints a short-lived WebRTC token so the browser can talk to the agent without
 * ever holding ELEVENLABS_API_KEY.
 */
export const POST = async (): Promise<NextResponse> => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID must be set." },
      { status: 500 },
    );
  }

  try {
    const client = new ElevenLabsClient({ apiKey });
    const { token } = await client.conversationalAi.conversations.getWebrtcToken({ agentId });
    return NextResponse.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Could not mint a token: ${message}` }, { status: 502 });
  }
};
