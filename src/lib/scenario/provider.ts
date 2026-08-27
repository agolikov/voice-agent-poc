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

/**
 * Reading a photograph is a different job from writing a scene, and the model
 * that is good at one is rarely the cheapest at the other. It is a separate
 * setting for that reason; unset, the writing model is asked to look, which is
 * correct for Anthropic and wrong for a text-only open-weights endpoint.
 */
export const VISION_MODEL_ID = process.env.AI_VISION_MODEL ?? MODEL_ID;

const model = (id: string): LanguageModel => {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY is not set — scenario generation is unavailable.");
  }

  const baseURL = process.env.AI_BASE_URL;
  if (baseURL) {
    return createOpenAICompatible({
      name: "callmode",
      baseURL,
      apiKey,
      // Without this the SDK will not send response_format, and a scenario is
      // asked for as JSON in the prompt instead — which a reasoning model
      // answers with its thinking wrapped around the object, and every
      // generation fails to parse. Turn it off for an endpoint that has no
      // json_schema support.
      supportsStructuredOutputs: true,
    }).chatModel(id);
  }

  return createAnthropic({ apiKey })(id);
};

export const getModel = (): LanguageModel => model(MODEL_ID);

export const getVisionModel = (): LanguageModel => model(VISION_MODEL_ID);
