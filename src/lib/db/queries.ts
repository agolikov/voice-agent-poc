import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "~/lib/db/client";
import { realizationKey } from "~/lib/scenario/generate";
import {
  scenarioSchema,
  scenarioTemplateSchema,
  type Scenario,
  type ScenarioTemplate,
} from "~/lib/scenario/schema";
import { sessionSettingsSchema, type SessionSettings } from "~/lib/session/settings";
import { similarity } from "~/lib/session/similarity";

/** A cached realization for this template at this language and level, if any. */
export const findCachedScenario = async (
  template: ScenarioTemplate,
  settings: SessionSettings,
): Promise<Scenario | null> => {
  const key = realizationKey(template, settings);
  const [row] = await db
    .select()
    .from(schema.scenario)
    .where(eq(schema.scenario.realizationKey, key))
    .limit(1);

  if (!row) return null;

  const parsed = scenarioSchema.safeParse(row.payload);
  // A payload that no longer matches the schema is stale cache, not an error:
  // drop through and realize it again rather than failing the learner's click.
  return parsed.success ? parsed.data : null;
};

export const saveScenario = async (
  scenario: Scenario,
  template: ScenarioTemplate,
  settings: SessionSettings,
): Promise<Scenario> => {
  await db
    .insert(schema.scenario)
    .values({
      id: scenario.id,
      realizationKey: realizationKey(template, settings),
      templateSlug: template.slug,
      source: scenario.source,
      targetLanguage: scenario.targetLanguage,
      cefrLevel: scenario.cefrLevel,
      title: scenario.title,
      payload: scenario,
    })
    .onConflictDoNothing();
  return scenario;
};

export const getScenario = async (id: string): Promise<Scenario | null> => {
  const [row] = await db.select().from(schema.scenario).where(eq(schema.scenario.id, id)).limit(1);
  if (!row) return null;
  const parsed = scenarioSchema.safeParse(row.payload);
  return parsed.success ? parsed.data : null;
};

export const saveTemplate = async (value: ScenarioTemplate): Promise<void> => {
  await db
    .insert(schema.template)
    .values({ slug: value.slug, title: value.title, payload: value })
    .onConflictDoUpdate({
      target: schema.template.slug,
      set: { title: value.title, payload: value },
    });
};

/** A user-authored situation, addressed by its stable slug. */
export const getSavedTemplate = async (slug: string): Promise<ScenarioTemplate | null> => {
  const [row] = await db
    .select()
    .from(schema.template)
    .where(eq(schema.template.slug, slug))
    .limit(1);
  if (!row) return null;

  const parsed = scenarioTemplateSchema.safeParse(row.payload);
  return parsed.success ? parsed.data : null;
};

export const listSavedTemplates = async (): Promise<ScenarioTemplate[]> => {
  const rows = await db.select().from(schema.template).orderBy(desc(schema.template.createdAt));
  return rows.flatMap((row) => {
    const parsed = scenarioTemplateSchema.safeParse(row.payload);
    return parsed.success ? [parsed.data] : [];
  });
};

export const createSession = async (
  scenarioId: string,
  settings: SessionSettings,
): Promise<string> => {
  const id = randomUUID();
  await db.insert(schema.session).values({ id, scenarioId, settings });
  return id;
};

export const attachConversationId = async (
  sessionId: string,
  conversationId: string,
): Promise<void> => {
  await db
    .update(schema.session)
    .set({ conversationId })
    .where(eq(schema.session.id, sessionId));
};

export type AttemptInput = {
  sessionId: string;
  beatId: string;
  kind: "answer" | "hint" | "repeat" | "mistake";
  heard?: string;
  expected?: string;
  verdict?: "answered" | "repeated" | "partial" | "missed";
  correction?: string;
  category?: string;
};

/**
 * Score is stored as an integer percentage: SQLite has no decimal type worth
 * using here, and a float column would invite comparisons that read as exact.
 */
export const recordAttempt = async (input: AttemptInput): Promise<void> => {
  const heard = input.heard ?? "";
  const expected = input.expected ?? "";
  await db.insert(schema.attempt).values({
    id: randomUUID(),
    sessionId: input.sessionId,
    beatId: input.beatId,
    kind: input.kind,
    heard,
    expected,
    verdict: input.verdict,
    correction: input.correction ?? "",
    category: input.category,
    score: heard && expected ? Math.round(similarity(heard, expected) * 100) : null,
  });
};

export const endSession = async (
  sessionId: string,
  outcome: "goal-achieved" | "partial" | "abandoned" | "out-of-time",
  summary: string,
): Promise<void> => {
  await db
    .update(schema.session)
    .set({ endedAt: new Date(), outcome, summary })
    .where(eq(schema.session.id, sessionId));
};

export type SessionDebrief = {
  session: typeof schema.session.$inferSelect;
  settings: SessionSettings;
  scenario: Scenario | null;
  attempts: (typeof schema.attempt.$inferSelect)[];
};

export const getDebrief = async (sessionId: string): Promise<SessionDebrief | null> => {
  const [row] = await db.select().from(schema.session).where(eq(schema.session.id, sessionId)).limit(1);
  if (!row) return null;

  const attempts = await db
    .select()
    .from(schema.attempt)
    .where(eq(schema.attempt.sessionId, sessionId))
    .orderBy(schema.attempt.createdAt);

  const settings = sessionSettingsSchema.safeParse(row.settings);

  return {
    session: row,
    settings: settings.success ? settings.data : ({} as SessionSettings),
    scenario: await getScenario(row.scenarioId),
    attempts,
  };
};

/** Attach post-call analysis to the session the webhook refers to. */
export const attachAnalysis = async (
  conversationId: string,
  analysis: unknown,
  transcript: unknown,
): Promise<boolean> => {
  const result = await db
    .update(schema.session)
    .set({ analysis, transcript })
    .where(and(eq(schema.session.conversationId, conversationId)));
  return result.rowsAffected > 0;
};

export const listRecentSessions = async (limit = 20) =>
  db
    .select({
      id: schema.session.id,
      scenarioId: schema.session.scenarioId,
      startedAt: schema.session.startedAt,
      endedAt: schema.session.endedAt,
      outcome: schema.session.outcome,
      summary: schema.session.summary,
    })
    .from(schema.session)
    .orderBy(desc(schema.session.startedAt))
    .limit(limit);
