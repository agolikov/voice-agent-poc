import { describe, expect, it } from "vitest";

import { postCallAgentTurns } from "~/lib/session/post-call-transcript";

describe("post-call transcript timing", () => {
  it("reads snake-case webhook metrics", () => {
    expect(
      postCallAgentTurns([
        { role: "user", message: "hello" },
        {
          role: "agent",
          source_event_id: 7,
          producing_llm: "gemini-2.0-flash",
          conversation_turn_metrics: {
            metrics: { convai_llm_service_ttfb: { elapsed_time: 0.432 } },
          },
        },
      ]),
    ).toEqual([{ eventId: 7, modelResponseMs: 432, modelName: "gemini-2.0-flash" }]);
  });

  it("reads camel-case SDK responses and leaves absent metrics absent", () => {
    expect(postCallAgentTurns([{ role: "agent", sourceEventId: 9 }])).toEqual([
      { eventId: 9, modelResponseMs: undefined, modelName: undefined },
    ]);
  });
});
