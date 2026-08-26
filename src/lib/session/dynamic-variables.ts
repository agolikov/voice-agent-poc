import type { Scenario } from "~/lib/scenario/schema";
import { beatCountRange, speechRateValue, type SessionSettings } from "~/lib/session/settings";

/**
 * ElevenLabs dynamic variables are primitives. Anything structured has to be
 * rendered to a string here rather than passed as an object.
 */
export type DynamicVariables = Record<string, string | number | boolean>;

const languageName = (tag: string): string => {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
};

/**
 * The beats, as a block the model reads top to bottom. Rendered rather than
 * passed as JSON because the agent follows prose instructions more reliably
 * than it follows a nested object, and `modelAnswer` needs to stand out as the
 * one line it is allowed to hand over.
 */
export const renderBeats = (scenario: Scenario): string =>
  scenario.beats
    .map((beat) =>
      [
        `BEAT ${beat.index + 1} (id: ${beat.id})`,
        `  Goal: ${beat.intent}`,
        `  You might open with: "${beat.agentCue}"`,
        `  MODEL ANSWER (this is what you give if they ask for help): "${beat.modelAnswer}"`,
        `  Its meaning: ${beat.modelAnswerTranslation}`,
        beat.keyPhrases.length > 0 ? `  Key phrases: ${beat.keyPhrases.join(", ")}` : null,
        `  Move on when: ${beat.successCriteria}`,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    )
    .join("\n\n");

export const renderVocabulary = (scenario: Scenario): string =>
  scenario.vocabulary.length === 0
    ? "(none)"
    : scenario.vocabulary
        .map((entry) => `- ${entry.term} — ${entry.translation}${entry.note ? ` (${entry.note})` : ""}`)
        .join("\n");

export const hintInstruction = (settings: SessionSettings): string => {
  const target = languageName(settings.targetLanguage);
  const native = languageName(settings.nativeLanguage);
  const length =
    settings.hintLength === "short"
      ? "Keep it to the shortest natural line that does the job."
      : "Give a full, complete sentence.";

  switch (settings.hintMode) {
    case "target-only":
      return `Say the model answer once, in ${target} only. Do not translate it, do not explain it, and do not use ${native}. ${length}`;
    case "target-plus-translation":
      return `Say the model answer once, in ${target} only. Its ${native} translation is already on the learner's screen — never speak the translation aloud. ${length}`;
    case "native-cue-first":
      return `First say ONE short sentence in ${native} telling the learner what they need to express. Then say the model answer once in ${target}. ${length}`;
  }
};

export const repeatPolicyInstruction = (settings: SessionSettings): string => {
  switch (settings.repeatPolicy) {
    case "two-tries":
      return 'If the first repetition is not acceptable, correct the specific part that was wrong, say the line once more, and ask again. If the second attempt is still not acceptable, call recordAttempt with verdict "missed", stay in character, and move the scene on anyway. Never let the conversation stall.';
    case "hard-gate":
      return "Do not move the scene on until the learner repeats the line acceptably. Keep correcting and offering the line, as many times as it takes, staying warm about it.";
    case "one-try":
      return 'Take whatever the learner produces on their first attempt. Call recordAttempt with the honest verdict, then move the scene on regardless.';
  }
};

export const repeatToleranceInstruction = (settings: SessionSettings): string => {
  switch (settings.repeatTolerance) {
    case "strict":
      return "Accept only a near-verbatim repetition: every content word present, in the right order, with correct endings.";
    case "normal":
      return "Accept a repetition that carries every content word, even if articles, inflections or small filler words differ.";
    case "lenient":
      return "Accept any attempt that conveys the same meaning and lands most of the key phrases.";
  }
};

export const correctionStyleInstruction = (settings: SessionSettings): string =>
  settings.correctionStyle === "in-flow"
    ? "When the learner makes a mistake, correct it briefly and in character — recast their line correctly and carry on. Never lecture."
    : "Never break character to correct the learner. Log every mistake with logMistake and let the debrief deliver the feedback.";

export const languagePolicyInstruction = (settings: SessionSettings): string => {
  const target = languageName(settings.targetLanguage);
  const native = languageName(settings.nativeLanguage);
  if (settings.allowNativeLanguage) {
    return `Speak ${target} by default. You may drop into ${native} for one sentence when the learner is genuinely stuck, then return to ${target} immediately.`;
  }
  return settings.hintMode === "native-cue-first"
    ? `Speak ${target} at all times, with one exception: the single ${native} cue sentence the help protocol allows. Nothing else may be in ${native}.`
    : `Speak ${target} at all times. Never use ${native}, even if the learner does.`;
};

/**
 * Everything the agent needs for one run. The prompt in
 * `agent/agent_configs/roleplay-tutor.json` reads these by name, so a change
 * here without a matching change there leaves an unresolved `{{placeholder}}`
 * in the agent's context.
 */
export const buildDynamicVariables = (
  scenario: Scenario,
  settings: SessionSettings,
): DynamicVariables => ({
  agent_name: scenario.agentRole.name,
  agent_role: scenario.agentRole.role,
  agent_persona: scenario.agentRole.persona,
  setting: scenario.setting,
  scenario_title: scenario.title,
  user_role: scenario.userRole.role,
  user_goal: scenario.userRole.goal,
  closing: scenario.closing,
  beats_block: renderBeats(scenario),
  beat_count: scenario.beats.length,
  vocabulary_block: renderVocabulary(scenario),
  success_criteria: scenario.successCriteria.join("; ") || "(none)",

  target_language: languageName(settings.targetLanguage),
  native_language: languageName(settings.nativeLanguage),
  cefr_level: settings.cefrLevel,
  help_trigger: settings.helpTrigger,
  hint_instruction: hintInstruction(settings),
  repeat_policy_instruction: repeatPolicyInstruction(settings),
  repeat_tolerance_instruction: repeatToleranceInstruction(settings),
  correction_style_instruction: correctionStyleInstruction(settings),
  language_policy_instruction: languagePolicyInstruction(settings),
  max_duration_minutes: settings.maxDurationMinutes,
});

/**
 * Per-conversation overrides. These are ignored unless the matching field is
 * enabled under the agent's Security -> overrides settings, which is mirrored in
 * `platform_settings.overrides.conversation_config_override` in the agent config.
 *
 * ASR keywords are the cheapest accuracy win available: the scene's own
 * vocabulary and the spoken help trigger are exactly the words that must not be
 * misheard. The platform caps them at 50.
 */
export const ASR_KEYWORD_LIMIT = 50;

export const buildAsrKeywords = (scenario: Scenario, settings: SessionSettings): string[] => {
  const words = [
    ...settings.helpTrigger.split(/\s+/).filter(Boolean),
    ...scenario.vocabulary.map((entry) => entry.term),
    ...scenario.beats.flatMap((beat) => beat.keyPhrases),
  ];
  return [...new Set(words.map((word) => word.trim()).filter(Boolean))].slice(0, ASR_KEYWORD_LIMIT);
};

export const buildOverrides = (scenario: Scenario, settings: SessionSettings) => {
  const voiceId = settings.voiceId ?? scenario.agentRole.voiceId;
  return {
    agent: {
      language: settings.targetLanguage.split("-")[0],
      firstMessage: scenario.beats[0]?.agentCue,
    },
    tts: {
      ...(voiceId ? { voiceId } : {}),
      speed: speechRateValue[settings.agentSpeechRate],
    },
    asr: {
      keywords: buildAsrKeywords(scenario, settings),
    },
  };
};

/** Beat count the generator should aim for, given the chosen preset. */
export const beatCountInstruction = (settings: SessionSettings): string => {
  const { min, max } = beatCountRange[settings.beatCount];
  return `between ${min} and ${max} beats`;
};
