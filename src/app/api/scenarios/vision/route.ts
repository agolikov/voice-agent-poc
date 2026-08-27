import { NextResponse } from "next/server";
import { z } from "zod";

import { uiLocales } from "~/lib/i18n/locale";
import { parseDataUrl, readImageContext } from "~/lib/scenario/vision";

const bodySchema = z.object({
  /** A `data:` URL. The browser shrinks the photo before it gets here. */
  image: z.string().min(32),
  uiLocale: z.enum(uiLocales).default("en"),
});

/**
 * Read a photo once and hand back what it says.
 *
 * Deliberately separate from generation: the learner sees what the model
 * actually read off their photo, and can correct it, before a scene is written
 * on top of it. A misread price is obvious here and invisible three steps later.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  let image;
  try {
    image = parseDataUrl(body.data.image);
  } catch (error) {
    const message = error instanceof Error ? error.message : "That image could not be read.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    return NextResponse.json({ context: await readImageContext(image, body.data.uiLocale) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
