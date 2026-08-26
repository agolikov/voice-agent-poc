#!/usr/bin/env node
/**
 * Generates agent/agent_configs/roleplay-tutor.json from the markdown prompt.
 *
 * The prompt is the thing that gets reviewed and argued over, so it lives as
 * markdown rather than as a JSON string with escaped newlines. This script is
 * the only writer of the generated config — edit the .md, not the .json.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const prompt = readFileSync(join(here, "prompts/roleplay-tutor.md"), "utf8").trim();

const toolNames = readdirSync(join(here, "tool_configs"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/, ""))
  .sort();

const toolsRegistryPath = resolve(here, "..", "tools.json");
const toolsRegistry = JSON.parse(readFileSync(toolsRegistryPath, "utf8"));
const toolIds = toolNames.map((name) => {
  const tool = toolsRegistry.tools?.find((candidate) => candidate.name === name);
  if (!tool?.id) {
    throw new Error(
      `No ElevenLabs ID found for client tool '${name}'. Run 'npx @elevenlabs/cli tools push' before building the agent config.`,
    );
  }
  return tool.id;
});

const config = {
  name: "CallMode role-play tutor",
  conversation_config: {
    asr: {
      quality: "high",
      provider: "scribe_realtime",
      user_input_audio_format: "pcm_16000",
      // Replaced per conversation with the scene's own vocabulary.
      keywords: [],
    },
    turn: {
      // Learners pause mid-sentence while they assemble one. Cutting them off
      // at the default is the single most common way this kind of agent fails.
      turn_timeout: 12.0,
      silence_end_call_timeout: -1.0,
      mode: "turn",
    },
    tts: {
      // The app overrides language per conversation, so the base must use a
      // multilingual model rather than the English-only Flash v2.
      model_id: "eleven_flash_v2_5",
      voice_id: "cjVigY5qzO86Huf0OWal",
      supported_voices: [],
      agent_output_audio_format: "pcm_16000",
      optimize_streaming_latency: 3,
      stability: 0.5,
      speed: 1.0,
      similarity_boost: 0.8,
      pronunciation_dictionary_locators: [],
    },
    conversation: {
      text_only: false,
      max_duration_seconds: 3600,
      // Setting this list at all replaces the platform's defaults, so anything
      // the app depends on has to be named here. client_tool_call is the one
      // that matters most: without it the hint never reaches the screen.
      client_events: [
        "conversation_initiation_metadata",
        "ping",
        "audio",
        "interruption",
        "user_transcript",
        "agent_response",
        "agent_response_correction",
        "client_tool_call",
        "vad_score",
      ],
    },
    language_presets: {},
    agent: {
      first_message: "",
      // Spanish matches the app's default target language. Using English here
      // makes the API reject the multilingual TTS model during agent creation.
      language: "es",
      dynamic_variables: { dynamic_variable_placeholders: {} },
      prompt: {
        prompt,
        llm: "gemini-2.5-flash",
        temperature: 0.3,
        max_tokens: -1,
        tool_ids: toolIds,
        mcp_server_ids: [],
        native_mcp_server_ids: [],
        knowledge_base: [],
        ignore_default_personality: true,
        rag: { enabled: false },
        custom_llm: null,
      },
    },
  },
  platform_settings: {
    auth: { enable_auth: false, allowlist: [], shareable_token: null },
    evaluation: {
      criteria: [
        {
          id: "goal_achieved",
          name: "Goal achieved",
          type: "prompt",
          conversation_goal_prompt:
            "Did the learner accomplish the goal stated for their role in this scene?",
        },
        {
          id: "stayed_in_target_language",
          name: "Stayed in the target language",
          type: "prompt",
          conversation_goal_prompt:
            "Did the agent stay in the target language throughout, apart from any native-language cue the help protocol explicitly allows?",
        },
        {
          id: "all_beats_covered",
          name: "All beats covered",
          type: "prompt",
          conversation_goal_prompt:
            "Was every beat of the scenario reached, in order, with the learner given a turn on each?",
        },
      ],
    },
    data_collection: {
      hint_count: {
        type: "number",
        description: "How many times the learner asked for help during the session.",
      },
      beats_completed: {
        type: "number",
        description: "How many beats the learner completed.",
      },
      mistakes: {
        type: "string",
        description:
          "A JSON array of {heard, correction, category} for every mistake the learner made.",
      },
      learner_level_estimate: {
        type: "string",
        description:
          "The CEFR level (A1-C2) this performance actually suggests, regardless of the level configured.",
      },
    },
    overrides: {
      conversation_config_override: {
        tts: { voice_id: true, speed: true },
        // The scene's own vocabulary, boosted per conversation. If the platform
        // rejects this key on push, drop it — the app degrades to unboosted
        // recognition rather than failing.
        asr: { keywords: true },
        conversation: { text_only: true },
        agent: {
          first_message: true,
          language: true,
          prompt: { prompt: false },
        },
      },
      custom_llm_extra_body: false,
      enable_conversation_initiation_client_data_from_webhook: false,
    },
    call_limits: { agent_concurrency_limit: -1, daily_limit: 100000, bursting_enabled: true },
    privacy: {
      record_voice: true,
      retention_days: -1,
      delete_transcript_and_pii: false,
      delete_audio: false,
      apply_to_existing_conversations: false,
      zero_retention_mode: false,
    },
    workspace_overrides: {
      webhooks: { post_call_webhook_id: null },
      conversation_initiation_client_data_webhook: null,
    },
    safety: { is_blocked_ivc: false, is_blocked_non_ivc: false, ignore_safety_evaluation: false },
    testing: { attached_tests: [] },
    ban: null,
  },
  tags: ["callmode", "language-learning"],
};

const outPath = resolve(here, "agent_configs/roleplay-tutor.json");
writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`);

const placeholders = [...new Set([...prompt.matchAll(/\{\{([a-z_]+)\}\}/g)].map((m) => m[1]))];
console.log(`Wrote ${outPath}`);
console.log(`  prompt: ${prompt.length} chars, ${placeholders.length} dynamic variables`);
console.log(`  client tools attached: ${toolNames.join(", ")}`);
