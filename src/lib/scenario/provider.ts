import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * One model, resolved server-side. The browser never sees a key and cannot pick
 * a model — it asks for a scenario and gets one back.
 *
 * Set AI_BASE_URL to point at any OpenAI-compatible endpoint; leave it empty to
 * talk to Anthropic directly.
 */
export const MODEL_ID = process.env.AI_MODEL ?? "claude-sonnet-5";

export const getModel = (): LanguageModel => {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY is not set — scenario generation is unavailable.");
  }

  const baseURL = process.env.AI_BASE_URL;
  if (baseURL) {
    return createOpenAICompatible({ name: "callmode", baseURL, apiKey }).chatModel(MODEL_ID);
  }

  return createAnthropic({ apiKey })(MODEL_ID);
};
