import { generateText } from "ai";

import type { UiLocale } from "~/lib/i18n/locale";
import { authoringLanguage } from "~/lib/scenario/prompt";
import { getVisionModel } from "~/lib/scenario/provider";

/** What the browser sends after it has shrunk the photo. */
export type AttachedImage = { mediaType: string; base64: string };

/**
 * A downscaled photo is around 200 KB. This is the ceiling that stops a raw
 * 48-megapixel original — or something that is not a photo at all — from being
 * posted at the vision endpoint, not a target.
 */
export const maxImageBytes = 6_000_000;

const allowedMediaTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const dataUrlPattern = /^data:(?<mediaType>[a-z]+\/[a-z0-9.+-]+);base64,(?<base64>[A-Za-z0-9+/=]+)$/;

/** Roughly what a base64 payload weighs once decoded. */
export const decodedBytes = (base64: string): number =>
  Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);

/**
 * Split a data URL into the parts a model message needs.
 *
 * The browser hands us a `data:` URL because that is what a canvas produces, but
 * everything downstream wants the media type and the payload apart, and an
 * unparseable or oversized one has to be refused here rather than at the
 * provider, where it costs a round trip to find out.
 */
export const parseDataUrl = (value: string): AttachedImage => {
  const groups = dataUrlPattern.exec(value)?.groups;
  if (!groups?.base64 || !groups.mediaType) {
    throw new Error("That does not look like an image.");
  }

  if (!allowedMediaTypes.includes(groups.mediaType)) {
    throw new Error(`${groups.mediaType} images are not supported.`);
  }

  if (decodedBytes(groups.base64) > maxImageBytes) {
    throw new Error("That image is too large. Take the photo again at a lower resolution.");
  }

  return { mediaType: groups.mediaType, base64: groups.base64 };
};

export const visionSystemPrompt = (uiLocale: UiLocale): string =>
  `You read a photograph and write the notes a language-practice app needs to
build a conversation around it.

You are not describing the picture. You are extracting the things a learner
could end up having to say out loud: what is on offer, what it costs, what the
sign says, what could go wrong with it.

Rules that matter:
- Copy names, dishes, prices, times, platform numbers, dosages, addresses and
  reference codes exactly as printed, in the language they are printed in. Do
  not translate them, do not tidy them, do not convert the currency.
- If the photo is a list — a menu, a timetable, a price board, a form, a label —
  reproduce the entries that matter, one per line, with their prices.
- Open with one sentence saying what the photo is and where it is from.
- Close with two or three things a learner could practise with it.
- If something is unreadable, say it is unreadable. Never invent a line you
  cannot actually see: an invented price ends up in the scene as a fact.
- Write your own prose in ${authoringLanguage[uiLocale]}. Quoted material stays
  in the language it was printed in.
- Under 250 words.`;

const VISION_PROMPT = `Read this photo. The learner wants a conversation built around what is in it.`;

/**
 * Turn a photograph into the text the scene is written from.
 *
 * The image is read once, here, and never again: what is stored on the template
 * is this text, so replaying the situation next month does not depend on the
 * photo still existing or on the vision model still being deployed.
 */
export const readImageContext = async (
  image: AttachedImage,
  uiLocale: UiLocale = "en",
): Promise<string> => {
  const { text } = await generateText({
    model: getVisionModel(),
    system: visionSystemPrompt(uiLocale),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: VISION_PROMPT },
          { type: "file", data: image.base64, mediaType: image.mediaType },
        ],
      },
    ],
    maxOutputTokens: 700,
  });

  const context = text.trim();
  if (!context) {
    throw new Error("The vision model returned nothing for that photo.");
  }
  return context;
};
