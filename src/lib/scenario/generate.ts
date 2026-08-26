import { createHash, randomUUID } from "node:crypto";

import { generateObject } from "ai";

import { getModel } from "~/lib/scenario/provider";
import type { UiLocale } from "~/lib/i18n/locale";
import {
  buildRealizationPrompt,
  buildTemplatePrompt,
  REALIZATION_SYSTEM_PROMPT,
  templateSystemPrompt,
} from "~/lib/scenario/prompt";
import {
  normalizeBeats,
  realizationSchema,
  scenarioTemplateSchema,
  type Beat,
  type Realization,
  type Scenario,
  type ScenarioTemplate,
} from "~/lib/scenario/schema";
import type { SessionSettings } from "~/lib/session/settings";

/**
 * A realization is expensive and deterministic enough to cache. The key covers
 * everything that changes the output, so switching level or language produces a
 * new scene rather than serving the old one.
 */
export const realizationKey = (template: ScenarioTemplate, settings: SessionSettings): string =>
  createHash("sha256")
    .update(
      JSON.stringify([
        template,
        settings.targetLanguage,
        settings.nativeLanguage,
        settings.cefrLevel,
      ]),
    )
    .digest("hex")
    .slice(0, 32);

const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "situation";

/** Design a template from the learner's own description of a situation. */
export const generateTemplate = async (
  description: string,
  settings: SessionSettings,
  uiLocale: UiLocale = "en",
): Promise<ScenarioTemplate> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: scenarioTemplateSchema.omit({ slug: true, source: true }),
    system: templateSystemPrompt(uiLocale),
    prompt: buildTemplatePrompt(description, settings, uiLocale),
  });

  return scenarioTemplateSchema.parse({
    ...object,
    slug: (() => {
      const slug = slugify(object.title);
      return slug === "situation" ? `situation-${randomUUID().slice(0, 8)}` : slug;
    })(),
    source: "generated",
  });
};

/**
 * Join a template to what the model wrote for it.
 *
 * Beats the model failed to return are dropped rather than faked: a beat with
 * no model answer would break the help protocol, which is the one thing that
 * must always work. Structure and identifiers come from the template, so the
 * model cannot quietly reshape the situation the learner chose.
 */
export const mergeRealization = (
  template: ScenarioTemplate,
  realization: Realization,
  settings: SessionSettings,
  id: string,
): Scenario => {
  const realizedById = new Map(realization.beats.map((beat) => [beat.id, beat]));

  const beats: Beat[] = template.beats.flatMap((beat, index) => {
    const realized = realizedById.get(beat.id);
    if (!realized) return [];
    return [
      {
        id: beat.id,
        index,
        intent: beat.intent,
        successCriteria: beat.successCriteria,
        agentCue: realized.agentCue,
        modelAnswer: realized.modelAnswer,
        modelAnswerTranslation: realized.modelAnswerTranslation,
        keyPhrases: realized.keyPhrases,
      },
    ];
  });

  if (beats.length === 0) {
    throw new Error(`Realization returned no usable beats for template "${template.slug}".`);
  }

  return {
    id,
    slug: template.slug,
    title: template.title,
    source: template.source,
    targetLanguage: settings.targetLanguage,
    cefrLevel: settings.cefrLevel,
    setting: realization.setting,
    agentRole: { ...template.agentRole, name: realization.agentName },
    userRole: template.userRole,
    beats: normalizeBeats(beats),
    vocabulary: realization.vocabulary,
    closing: realization.closing,
    successCriteria: template.successCriteria,
  };
};

/** Give a template a language. The model supplies only the words. */
export const realizeScenario = async (
  template: ScenarioTemplate,
  settings: SessionSettings,
): Promise<Scenario> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: realizationSchema,
    system: REALIZATION_SYSTEM_PROMPT,
    prompt: buildRealizationPrompt(template, settings),
  });

  return mergeRealization(template, object, settings, randomUUID());
};
