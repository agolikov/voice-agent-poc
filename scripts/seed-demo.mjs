#!/usr/bin/env node
/**
 * Seeds one hand-written scene and one finished session.
 *
 * Realizing a scene normally costs a model call and running one costs voice
 * minutes, so this exists to make the practice and debrief screens inspectable
 * with no keys configured at all.
 */
import { randomUUID } from "node:crypto";

import { createClient } from "@libsql/client";

const db = createClient({ url: process.env.DATABASE_URL ?? "file:./data/practice.db" });

const scenarioId = "demo-pharmacy-es";
const sessionId = "demo-session";
const templateSlug = "late-parcel-demo";

const savedTemplate = {
  slug: templateSlug,
  title: "Chasing a late parcel",
  source: "generated",
  summary: "Call a delivery company and find out why an overdue parcel has not arrived.",
  setting: "A phone call to a delivery company on a weekday afternoon",
  agentRole: {
    name: "Alex",
    role: "a delivery company support agent",
    persona: "Efficient and polite, but needs precise details before offering a solution.",
  },
  userRole: {
    role: "the recipient of an overdue parcel",
    goal: "Find the parcel and get a firm new delivery date",
  },
  beats: [
    {
      id: "explain-delay",
      intent: "Explain that the parcel is late",
      successCriteria: "The learner states the expected delivery date",
    },
    {
      id: "give-reference",
      intent: "Give the tracking reference and confirm their details",
      successCriteria: "The agent has enough information to look up the parcel",
    },
    {
      id: "ask-location",
      intent: "Ask where the parcel is now and what caused the delay",
      successCriteria: "The learner gets a location and an explanation",
    },
    {
      id: "agree-solution",
      intent: "Request and agree a concrete delivery plan",
      successCriteria: "A new delivery date or collection plan is confirmed",
    },
  ],
  vocabularyConcepts: ["tracking number", "delivery window", "distribution centre"],
  closing: "Confirm the agreed next step and end the call politely",
  successCriteria: [
    "The learner clearly explained the problem",
    "They finished with a concrete next step",
  ],
  suggestedLevel: "B1",
};

const scenario = {
  id: scenarioId,
  slug: "pharmacy",
  title: "At the pharmacy",
  source: "library",
  targetLanguage: "es",
  cefrLevel: "A2",
  setting: "A neighbourhood pharmacy in Seville, ten minutes before closing",
  agentRole: {
    name: "Rosa",
    role: "a pharmacist on the evening shift",
    persona: "Brisk but kind. Asks one question at a time and does not fill your silences.",
  },
  userRole: {
    role: "a customer with a sore throat and a headache",
    goal: "Explain the symptoms and leave with something to take",
  },
  beats: [
    {
      id: "greeting",
      index: 0,
      intent: "Greet and say why you are there",
      agentCue: "Buenas tardes. ¿En qué puedo ayudarle?",
      modelAnswer: "Buenas tardes, me duele la garganta.",
      modelAnswerTranslation: "Good evening, my throat hurts.",
      keyPhrases: ["me duele la garganta"],
      successCriteria: "A symptom has been named",
    },
    {
      id: "symptoms",
      index: 1,
      intent: "Say how long it has lasted and how bad it is",
      agentCue: "¿Desde cuándo le duele?",
      modelAnswer: "Desde hace tres días, y también tengo dolor de cabeza.",
      modelAnswerTranslation: "For three days, and I have a headache too.",
      keyPhrases: ["desde hace tres días", "dolor de cabeza"],
      successCriteria: "A duration and a severity have been given",
    },
    {
      id: "allergies",
      index: 2,
      intent: "Answer the allergy question with a real answer",
      agentCue: "¿Es alérgico a algún medicamento?",
      modelAnswer: "No, no soy alérgico a nada.",
      modelAnswerTranslation: "No, I am not allergic to anything.",
      keyPhrases: ["alérgico"],
      successCriteria: "Answered yes or no with a detail",
    },
    {
      id: "recommendation",
      index: 3,
      intent: "Choose between two options and ask about the dose",
      agentCue: "Tengo pastillas o un jarabe. ¿Qué prefiere?",
      modelAnswer: "Prefiero el jarabe. ¿Cuántas veces al día lo tomo?",
      modelAnswerTranslation: "I prefer the syrup. How many times a day do I take it?",
      keyPhrases: ["el jarabe", "cuántas veces al día"],
      successCriteria: "Picked one and asked about the dose",
    },
    {
      id: "paying",
      index: 4,
      intent: "Pay and ask for one more thing",
      agentCue: "Son ocho euros con cincuenta.",
      modelAnswer: "Aquí tiene. ¿Me da el ticket, por favor?",
      modelAnswerTranslation: "Here you are. Could I have the receipt, please?",
      keyPhrases: ["el ticket"],
      successCriteria: "Paid and asked for something extra",
    },
    {
      id: "farewell",
      index: 5,
      intent: "Close politely",
      agentCue: "Que se mejore. ¡Hasta luego!",
      modelAnswer: "Muchas gracias, hasta luego.",
      modelAnswerTranslation: "Thank you very much, goodbye.",
      keyPhrases: ["hasta luego"],
      successCriteria: "Said goodbye appropriately",
    },
  ],
  vocabulary: [
    { term: "la garganta", translation: "throat", note: "" },
    { term: "el dolor de cabeza", translation: "headache", note: "" },
    { term: "el jarabe", translation: "syrup", note: "" },
    { term: "las pastillas", translation: "tablets", note: "" },
    { term: "alérgico", translation: "allergic", note: "agrees with the speaker: alérgica" },
    { term: "el ticket", translation: "receipt", note: "el recibo also works" },
  ],
  closing: "Wish them well, tell them to come back if it does not improve, and say goodbye",
  successCriteria: [
    "The learner described their symptoms without switching languages",
    "They answered the allergy question with a real answer",
  ],
};

const settings = {
  targetLanguage: "es",
  nativeLanguage: "en",
  cefrLevel: "A2",
  helpTrigger: "help me",
  hintMode: "target-plus-translation",
  hintLength: "short",
  repeatPolicy: "two-tries",
  repeatTolerance: "normal",
  correctionStyle: "in-flow",
  agentSpeechRate: "normal",
  beatCount: "standard",
  allowNativeLanguage: false,
  maxDurationMinutes: 10,
};

const attempts = [
  ["greeting", "answer", "Buenas tardes, me duele la garganta.", "Buenas tardes, me duele la garganta.", "answered", "", null, 100],
  ["symptoms", "hint", "", "Desde hace tres días, y también tengo dolor de cabeza.", null, "", null, null],
  ["symptoms", "repeat", "Desde hace tres días y tengo dolor de cabeza.", "Desde hace tres días, y también tengo dolor de cabeza.", "repeated", "", null, 89],
  ["allergies", "answer", "No, no soy alérgica a nada.", "No, no soy alérgico a nada.", "answered", "", null, 88],
  ["recommendation", "hint", "", "Prefiero el jarabe. ¿Cuántas veces al día lo tomo?", null, "", null, null],
  ["recommendation", "repeat", "Prefiero el jarabe. ¿Cuántas veces tomo?", "Prefiero el jarabe. ¿Cuántas veces al día lo tomo?", "missed", "¿Cuántas veces al día lo tomo?", null, 67],
  ["recommendation", "mistake", "cuántas veces tomo", "cuántas veces al día lo tomo", null, "cuántas veces al día lo tomo", "grammar", null],
  ["paying", "answer", "Aquí tiene. ¿Me da ticket?", "Aquí tiene. ¿Me da el ticket, por favor?", "partial", "¿Me da el ticket, por favor?", null, 71],
  ["paying", "mistake", "¿Me da ticket?", "¿Me da el ticket?", null, "¿Me da el ticket?", "grammar", null],
  ["farewell", "answer", "Muchas gracias, hasta luego.", "Muchas gracias, hasta luego.", "answered", "", null, 100],
];

const messages = [
  ["agent", "Buenas tardes. ¿En qué puedo ayudarle?", [], null, 510, "gemini-2.0-flash"],
  ["learner", "Buenas tardes, me duele la garganta.", ["la garganta", "me duele la garganta"], null, null, null],
  ["agent", "¿Desde cuándo le duele?", [], 820, 370, "gemini-2.0-flash"],
  ["learner", "Desde hace tres días y tengo dolor de cabeza.", ["desde hace tres días", "dolor de cabeza"], null, null, null],
  ["agent", "¿Es alérgica a algún medicamento?", [], 1760, 910, "gemini-2.0-flash"],
  ["learner", "No, no soy alérgica a nada.", ["alérgico"], null, null, null],
  ["agent", "Tengo pastillas o un jarabe. ¿Qué prefiere?", [], 3380, 1680, "gemini-2.0-flash"],
  ["learner", "Prefiero el jarabe. ¿Cuántas veces al día?", ["el jarabe", "cuántas veces al día"], null, null, null],
];

const now = Math.floor(Date.now() / 1000);

await db.batch(
  [
    { sql: "delete from message where session_id = ?", args: [sessionId] },
    { sql: "delete from attempt where session_id = ?", args: [sessionId] },
    { sql: "delete from session where id = ?", args: [sessionId] },
    { sql: "delete from scenario where id = ?", args: [scenarioId] },
    {
      sql: `insert into template (slug, title, payload, created_at)
            values (?, ?, ?, ?)
            on conflict (slug) do update set title = excluded.title, payload = excluded.payload`,
      args: [templateSlug, savedTemplate.title, JSON.stringify(savedTemplate), now],
    },
    {
      sql: `insert into scenario (id, realization_key, template_slug, source, target_language, cefr_level, title, payload, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [scenarioId, "demo", "pharmacy", "library", "es", "A2", scenario.title, JSON.stringify(scenario), now],
    },
    {
      sql: `insert into session (id, scenario_id, settings, conversation_id, started_at, ended_at, outcome, summary)
            values (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sessionId,
        scenarioId,
        JSON.stringify(settings),
        null,
        now - 400,
        now,
        "goal-achieved",
        "You got the syrup and the receipt. Watch the article before ticket.",
      ],
    },
    ...attempts.map(([beatId, kind, heard, expected, verdict, correction, category, score], index) => ({
      sql: `insert into attempt (id, session_id, beat_id, kind, heard, expected, verdict, correction, category, score, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), sessionId, beatId, kind, heard, expected, verdict, correction, category, score, now - 400 + index * 30],
    })),
    ...messages.map(([role, body, recommendedTerms, agentResponseMs, modelResponseMs, modelName], index) => ({
      sql: `insert into message (id, session_id, event_id, role, body, recommended_terms, agent_response_ms, model_response_ms, model_name, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        sessionId,
        index + 1,
        role,
        body,
        JSON.stringify(recommendedTerms),
        agentResponseMs,
        modelResponseMs,
        modelName,
        now - 390 + index * 12,
      ],
    })),
  ],
  "write",
);

console.log(`Seeded scenario ${scenarioId} and session ${sessionId}.`);
console.log(`  saved editor:  / (Situation → ${savedTemplate.title} → Edit situation)`);
console.log(`  brief + call: /practice/${scenarioId}`);
console.log(`  debrief:      /debrief/${sessionId}`);
