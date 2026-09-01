import { randomUUID } from "node:crypto";

import { and, asc, desc, eq } from "drizzle-orm";

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
import { postCallAgentTurns } from "~/lib/session/post-call-transcript";
import type { TranscriptEntry } from "~/lib/voice/types";

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
 * Score is stored as an integer percentage rather than a fraction: a float
 * column would invite comparisons that read as exact, and nothing downstream
 * needs more resolution than a whole percent.
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

export type MessageInput = Omit<TranscriptEntry, "createdAt"> & { sessionId: string };

/** Persist one SDK transcript event. A stable client id makes retries harmless. */
export const recordMessage = async (input: MessageInput): Promise<void> => {
  await db
    .insert(schema.message)
    .values({
      id: input.id,
      sessionId: input.sessionId,
      eventId: input.eventId,
      role: input.role,
      body: input.text,
      recommendedTerms: input.recommendedTerms,
      agentResponseMs: input.agentResponseMs,
      modelResponseMs: input.modelResponseMs,
      modelName: input.modelName,
    })
    .onConflictDoUpdate({
      target: schema.message.id,
      set: {
        eventId: input.eventId,
        body: input.text,
        recommendedTerms: input.recommendedTerms,
        agentResponseMs: input.agentResponseMs,
        modelResponseMs: input.modelResponseMs,
        modelName: input.modelName,
      },
    });
};

export const listSessionMessages = async (sessionId: string) =>
  db
    .select()
    .from(schema.message)
    .where(eq(schema.message.sessionId, sessionId))
    .orderBy(asc(schema.message.createdAt));

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
  messages: (typeof schema.message.$inferSelect)[];
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
  const messages = await listSessionMessages(sessionId);

  return {
    session: row,
    settings: settings.success ? settings.data : ({} as SessionSettings),
    scenario: await getScenario(row.scenarioId),
    attempts,
    messages,
  };
};

/** Attach post-call analysis to the session the webhook refers to. */
export const attachAnalysis = async (
  conversationId: string,
  analysis: unknown,
  transcript: unknown,
): Promise<boolean> => {
  const [sessionRow] = await db
    .select({ id: schema.session.id })
    .from(schema.session)
    .where(eq(schema.session.conversationId, conversationId))
    .limit(1);
  if (!sessionRow) return false;

  await db
    .update(schema.session)
    .set({ analysis, transcript })
    .where(eq(schema.session.id, sessionRow.id));

  const storedAgentTurns = (await listSessionMessages(sessionRow.id)).filter(
    (entry) => entry.role === "agent",
  );
  const enrichedTurns = postCallAgentTurns(transcript);
  for (const [index, enriched] of enrichedTurns.entries()) {
    const target =
      storedAgentTurns.find(
        (entry) => enriched.eventId !== undefined && entry.eventId === enriched.eventId,
      ) ?? storedAgentTurns[index];
    if (!target) continue;
    await db
      .update(schema.message)
      .set({
        modelResponseMs: enriched.modelResponseMs,
        modelName: enriched.modelName,
      })
      .where(and(eq(schema.message.sessionId, sessionRow.id), eq(schema.message.id, target.id)));
  }
  return true;
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
      title: schema.scenario.title,
      conversationId: schema.session.conversationId,
    })
    .from(schema.session)
    .leftJoin(schema.scenario, eq(schema.session.scenarioId, schema.scenario.id))
    .orderBy(desc(schema.session.startedAt))
    .limit(limit);

/**
 * Remove one run and everything logged against it.
 *
 * The scenario is deliberately left behind: it is a cached realization shared
 * by every run of that situation, so dropping it here would throw away a scene
 * other sessions still point at and make the next run pay for it again.
 *
 * Nothing declares a foreign key, so the children are deleted explicitly and in
 * one transaction — a partial delete would leave attempts and messages pointing
 * at a session that no longer exists, and the debrief reads them by session id.
 */
export const deleteSession = async (sessionId: string): Promise<boolean> =>
  db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: schema.session.id })
      .from(schema.session)
      .where(eq(schema.session.id, sessionId))
      .limit(1);
    if (!row) return false;

    await tx.delete(schema.message).where(eq(schema.message.sessionId, sessionId));
    await tx.delete(schema.attempt).where(eq(schema.attempt.sessionId, sessionId));
    await tx.delete(schema.session).where(eq(schema.session.id, sessionId));
    return true;
  });

export const getSessionRecord = async (sessionId: string) => {
  const [row] = await db
    .select()
    .from(schema.session)
    .where(eq(schema.session.id, sessionId))
    .limit(1);
  return row ?? null;
};
