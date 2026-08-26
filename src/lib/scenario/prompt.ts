import type { ScenarioTemplate } from "~/lib/scenario/schema";
import type { SessionSettings } from "~/lib/session/settings";
import { beatCountRange } from "~/lib/session/settings";

const languageName = (tag: string): string => {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
};

/**
 * What a `modelAnswer` may look like at each level. The hint is the one line the
 * learner has to say back, so pitching it wrong wastes the whole exchange: too
 * long and they cannot hold it in memory, too easy and it teaches nothing.
 */
const levelGuidance: Record<SessionSettings["cefrLevel"], string> = {
  A1: "3 to 6 words. Present tense only. The 500 most common words. No subordinate clauses.",
  A2: "5 to 10 words. Present and past. Everyday vocabulary. At most one clause.",
  B1: "8 to 14 words. Any common tense. One subordinate clause is fine.",
  B2: "10 to 18 words. Idiomatic where a native speaker would be. Hedging and politeness strategies.",
  C1: "12 to 22 words. Nuanced register, idiom, and precise word choice.",
  C2: "Whatever a fluent native speaker would actually say, including elision and irony.",
};

export const REALIZATION_SYSTEM_PROMPT = `You write role-play material for language learners.

You are given a situation template and a target language. Turn it into speakable
material for that language and that learner level.

Rules that matter:
- Everything in the target language must be what a native speaker would actually
  say in that place, not a translation of the English. Localise names, currency,
  institutions and politeness conventions.
- modelAnswer is the line the learner will be asked to repeat out loud from
  memory. Make it a single natural utterance they can hold in their head.
- modelAnswerTranslation is for the learner's screen. Translate the meaning, not
  the words.
- keyPhrases are the two or three chunks from modelAnswer worth boosting in
  speech recognition. Pick content words, never articles or pronouns.
- Keep the beat ids exactly as given. Do not add, remove or reorder beats.`;

export const buildRealizationPrompt = (
  template: ScenarioTemplate,
  settings: SessionSettings,
): string => {
  const target = languageName(settings.targetLanguage);
  const native = languageName(settings.nativeLanguage);

  return `Target language: ${target} (${settings.targetLanguage})
Learner's native language: ${native} (${settings.nativeLanguage})
Learner level: ${settings.cefrLevel} — ${levelGuidance[settings.cefrLevel]}

SITUATION
Title: ${template.title}
Setting: ${template.setting}
The character you are writing for: ${template.agentRole.name}, ${template.agentRole.role}. ${template.agentRole.persona}
The learner plays: ${template.userRole.role}
Their goal: ${template.userRole.goal}

BEATS (keep these ids, in this order)
${template.beats
  .map((beat, index) => `${index + 1}. id "${beat.id}" — ${beat.intent}\n   Done when: ${beat.successCriteria}`)
  .join("\n")}

VOCABULARY CONCEPTS to render in ${target}
${template.vocabularyConcepts.join(", ")}

Produce, in ${target} unless stated otherwise:
- setting: the setting line above, rewritten for a ${target}-speaking place, in English (it is stage direction, not dialogue).
- agentName: what this character would be called here. In English if it is a role rather than a name.
- closing: how the character wraps the scene up — stage direction, in English.
- beats: for each id above, an agentCue (${target}), a modelAnswer (${target}, ${levelGuidance[settings.cefrLevel]}), a modelAnswerTranslation (${native}), and keyPhrases (${target}).
- vocabulary: each concept as term (${target}), translation (${native}), and a short note where the usage is not obvious.`;
};

/**
 * Turn a free-text request from the learner into a template. The model invents
 * the situation; realization then gives it a language, exactly as it does for a
 * curated one.
 */
export const TEMPLATE_SYSTEM_PROMPT = `You design role-play situations for language learners.

Given a learner's description of what they want to practise, design the scene.

What makes these work:
- The other character wants something too, and does not simply serve the learner.
- Something goes mildly wrong, or is refused once, so the learner has to react
  rather than recite.
- Each beat forces one specific speech act: asking, refusing, explaining,
  correcting, negotiating, closing.
- The character never fills the learner's silences. Say so in the persona.

Write the template in English. It is authoring material, not dialogue — the
target-language lines are written in a later step.`;

export const buildTemplatePrompt = (description: string, settings: SessionSettings): string => {
  const { min, max } = beatCountRange[settings.beatCount];
  return `The learner wants to practise: "${description}"

Their level is ${settings.cefrLevel}. Design a scene with between ${min} and ${max} beats.

Give each beat a short kebab-case id that describes what happens in it.
Give between 8 and 12 vocabularyConcepts — the English concepts this scene needs.
Set suggestedLevel to the level this scene really suits.`;
};
