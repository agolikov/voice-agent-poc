import { getDebrief } from "~/lib/db/queries";

type RouteContext = { params: Promise<{ sessionId: string }> };

const timing = (milliseconds: number | null) =>
  milliseconds === null ? "not reported" : `${milliseconds} ms`;

export const GET = async (_request: Request, context: RouteContext): Promise<Response> => {
  const { sessionId } = await context.params;
  const debrief = await getDebrief(sessionId);
  if (!debrief) return Response.json({ error: "Session not found." }, { status: 404 });

  const { session, scenario, messages } = debrief;
  const lines = [
    scenario?.title ?? "Practice conversation",
    `Started: ${session.startedAt.toISOString()}`,
    `Outcome: ${session.outcome ?? "unfinished"}`,
    session.summary ? `Summary: ${session.summary}` : null,
    "",
    ...messages.flatMap((message) => [
      `[${message.createdAt.toISOString()}] ${message.role === "learner" ? "You" : "Agent"}: ${message.body}`,
      message.recommendedTerms.length > 0
        ? `  Recommended terms used: ${message.recommendedTerms.join(", ")}`
        : null,
      message.role === "agent"
        ? `  Timing — agent: ${timing(message.agentResponseMs)}, model TTFB: ${timing(message.modelResponseMs)}${message.modelName ? ` (${message.modelName})` : ""}`
        : null,
    ]),
  ].filter((line): line is string => line !== null);

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="callmode-${sessionId}.txt"`,
    },
  });
};
