import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
};

/**
 * A template realized into one language and level. Keyed by `realizationKey`,
 * so picking "At the pharmacy" in Spanish at B1 a second time replays the same
 * scene rather than paying for a new one.
 */
export const scenario = sqliteTable(
  "scenario",
  {
    id: text().primaryKey(),
    realizationKey: text().notNull(),
    templateSlug: text().notNull(),
    source: text({ enum: ["library", "generated"] }).notNull(),
    targetLanguage: text().notNull(),
    cefrLevel: text().notNull(),
    title: text().notNull(),
    /** The full validated Scenario, as JSON. */
    payload: text({ mode: "json" }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("scenario_realization_key_idx").on(table.realizationKey),
    index("scenario_template_slug_idx").on(table.templateSlug),
  ],
);

/** A user-authored template, kept so a generated situation can be replayed. */
export const template = sqliteTable("template", {
  slug: text().primaryKey(),
  title: text().notNull(),
  /** The full validated ScenarioTemplate, as JSON. */
  payload: text({ mode: "json" }).notNull(),
  ...timestamps,
});

/**
 * One run of one scenario.
 *
 * `outcome` and the analysis columns stay null until the scene ends, and the
 * ElevenLabs columns stay null until the post-call webhook lands — which may
 * never happen in local development. Nothing downstream may depend on them.
 */
export const session = sqliteTable(
  "session",
  {
    id: text().primaryKey(),
    scenarioId: text().notNull(),
    /** The SessionSettings this run used, as JSON. */
    settings: text({ mode: "json" }).notNull(),
    conversationId: text(),
    startedAt: integer({ mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    endedAt: integer({ mode: "timestamp" }),
    outcome: text({ enum: ["goal-achieved", "partial", "abandoned", "out-of-time"] }),
    summary: text(),
    /** Post-call analysis from the webhook, as JSON. Null until it arrives. */
    analysis: text({ mode: "json" }),
    transcript: text({ mode: "json" }),
  },
  (table) => [
    index("session_scenario_id_idx").on(table.scenarioId),
    index("session_conversation_id_idx").on(table.conversationId),
  ],
);

/**
 * Every learner turn the agent judged, and every hint it gave. This is what the
 * debrief is built from: it arrives live over client tools, so the debrief works
 * with no webhook, no public URL and no network round trip.
 */
export const attempt = sqliteTable(
  "attempt",
  {
    id: text().primaryKey(),
    sessionId: text().notNull(),
    beatId: text().notNull(),
    kind: text({ enum: ["answer", "hint", "repeat", "mistake"] }).notNull(),
    heard: text().notNull().default(""),
    expected: text().notNull().default(""),
    verdict: text({ enum: ["answered", "repeated", "partial", "missed"] }),
    correction: text().notNull().default(""),
    category: text(),
    /** Token similarity of `heard` to `expected`, for the debrief. */
    score: integer(),
    ...timestamps,
  },
  (table) => [index("attempt_session_id_idx").on(table.sessionId)],
);

/**
 * A durable, ordered copy of every line heard during a practice call.
 *
 * The post-call webhook is useful enrichment, but it can be delayed or absent
 * in local development. Messages are therefore written live as the SDK emits
 * them. Agent/model timing fields are nullable because ElevenLabs only reports
 * model-only timing after a completed turn has been processed.
 */
export const message = sqliteTable(
  "message",
  {
    id: text().primaryKey(),
    sessionId: text().notNull(),
    eventId: integer(),
    role: text({ enum: ["agent", "learner"] }).notNull(),
    body: text().notNull(),
    recommendedTerms: text({ mode: "json" }).$type<string[]>().notNull().default([]),
    /** Learner transcript received → agent response received, in milliseconds. */
    agentResponseMs: integer(),
    /** ElevenLabs' completed-turn LLM TTFB, in milliseconds. */
    modelResponseMs: integer(),
    modelName: text(),
    ...timestamps,
  },
  (table) => [index("message_session_id_idx").on(table.sessionId)],
);

export type SelectScenario = typeof scenario.$inferSelect;
export type SelectSession = typeof session.$inferSelect;
export type SelectAttempt = typeof attempt.$inferSelect;
export type SelectTemplate = typeof template.$inferSelect;
export type SelectMessage = typeof message.$inferSelect;
