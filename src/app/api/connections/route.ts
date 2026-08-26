import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getModel, MODEL_ID } from "~/lib/scenario/provider";

const bodySchema = z.object({ service: z.enum(["ai", "elevenlabs"]) });

const errorMessage = (service: "ai" | "elevenlabs", error: unknown): string => {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (/abort|timed?\s*out|timeout/i.test(message)) {
    return service === "ai"
      ? `AI request to ${MODEL_ID} timed out after 12 seconds. Check AI_BASE_URL, AI_MODEL, and provider availability.`
      : "ElevenLabs request timed out after 12 seconds. Check your network and try again.";
  }
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/xi-[A-Za-z0-9_-]+/g, "[redacted]");
};

const checkAi = async () => {
  const startedAt = Date.now();
  const { text } = await generateText({
    model: getModel(),
    prompt: "Connection check. Reply with exactly: OK",
    maxOutputTokens: 8,
    maxRetries: 0,
    timeout: 12_000,
  });

  if (!text.trim()) throw new Error("The model returned an empty response.");

  return {
    ok: true as const,
    message: `Connected to ${MODEL_ID} in ${Date.now() - startedAt} ms.`,
  };
};

const checkElevenLabs = async () => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID must be set.");
  }

  const startedAt = Date.now();
  const client = new ElevenLabsClient({ apiKey, timeoutInSeconds: 12, maxRetries: 0 });
  const agent = await client.conversationalAi.agents.get(agentId);

  return {
    ok: true as const,
    message: `Connected to ${agent.name} in ${Date.now() - startedAt} ms.`,
  };
};

/** Read-only credential and upstream checks. No keys or tokens are returned. */
export const POST = async (request: Request): Promise<NextResponse> => {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "Unknown connection check." }, { status: 400 });
  }

  try {
    const result = body.data.service === "ai" ? await checkAi() : await checkElevenLabs();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: errorMessage(body.data.service, error) },
      { status: 502 },
    );
  }
};
