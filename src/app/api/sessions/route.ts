import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, getScenario } from "~/lib/db/queries";
import {
  buildDynamicVariables,
  buildOverrides,
  settingsForScenario,
} from "~/lib/session/dynamic-variables";
import { sessionSettingsSchema } from "~/lib/session/settings";

const bodySchema = z.object({
  scenarioId: z.string().min(1),
  settings: sessionSettingsSchema,
});

/**
 * Open a run: a row to log against, and the exact payload for ElevenLabs.
 *
 * The dynamic variables are built here rather than in the browser so the
 * contract with the agent prompt lives in one testable place.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  const scenario = await getScenario(body.data.scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: "That scene no longer exists." }, { status: 404 });
  }

  // Stored on the session too, so the row records what the agent was told.
  const settings = settingsForScenario(scenario, body.data.settings);

  return NextResponse.json({
    sessionId: await createSession(scenario.id, settings),
    dynamicVariables: buildDynamicVariables(scenario, settings),
    overrides: buildOverrides(scenario, settings),
  });
};
