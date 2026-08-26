export type PostCallAgentTurn = {
  eventId?: number;
  modelResponseMs?: number;
  modelName?: string;
};

const recordValue = (value: unknown): number | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const elapsed = record.elapsed_time ?? record.elapsedTime;
  return typeof elapsed === "number" && Number.isFinite(elapsed)
    ? Math.round(elapsed * 1_000)
    : undefined;
};

/** Extract the genuine LLM TTFB reported in ElevenLabs completed-turn metrics. */
export const postCallAgentTurns = (transcript: unknown): PostCallAgentTurn[] => {
  if (!Array.isArray(transcript)) return [];

  return transcript.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const turn = value as Record<string, unknown>;
    if (turn.role !== "agent") return [];

    const turnMetrics = (turn.conversation_turn_metrics ?? turn.conversationTurnMetrics) as
      | Record<string, unknown>
      | undefined;
    const metrics = turnMetrics?.metrics;
    const metricEntries =
      metrics && typeof metrics === "object"
        ? Object.entries(metrics as Record<string, unknown>)
        : [];
    const preferred = [
      "convai_llm_service_ttfb",
      "llm_service_ttfb",
      "llm_ttfb",
    ];
    const exact = preferred
      .map((key) => metricEntries.find(([name]) => name === key)?.[1])
      .map(recordValue)
      .find((elapsed) => elapsed !== undefined);
    const fallback = metricEntries
      .filter(([name]) => /llm/i.test(name) && /(ttfb|latency)/i.test(name))
      .map(([, record]) => recordValue(record))
      .find((elapsed) => elapsed !== undefined);
    const rawEventId = turn.source_event_id ?? turn.sourceEventId;
    const rawModel = turn.producing_llm ?? turn.producingLlm ?? turn.llm_override ?? turn.llmOverride;

    return [
      {
        eventId: typeof rawEventId === "number" ? rawEventId : undefined,
        modelResponseMs: exact ?? fallback,
        modelName: typeof rawModel === "string" ? rawModel : undefined,
      },
    ];
  });
};
