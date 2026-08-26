import { NextResponse } from "next/server";

import { getScenario } from "~/lib/db/queries";

type RouteContext = { params: Promise<{ scenarioId: string }> };

export const GET = async (_request: Request, context: RouteContext): Promise<NextResponse> => {
  const { scenarioId } = await context.params;
  const scenario = await getScenario(scenarioId);
  return scenario
    ? NextResponse.json({ scenario })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
};
