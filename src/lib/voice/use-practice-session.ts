"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useConversation, useConversationClientTool } from "@elevenlabs/react";

import type { Scenario } from "~/lib/scenario/schema";
import {
  findRecommendedTerms,
  scenarioRecommendedTerms,
} from "~/lib/session/recommended-terms";
import type { SessionSettings } from "~/lib/session/settings";
import type {
  ActiveHint,
  LoggedMistake,
  OpenedSession,
  TranscriptEntry,
} from "~/lib/voice/types";

/**
 * The message the agent receives when the learner presses the help button or
 * the H key. It never goes through speech recognition, so unlike the spoken
 * trigger word it cannot be misheard.
 */
export const HELP_MESSAGE = "[HELP]";

type CallStatus = "idle" | "preparing" | "connecting" | "live" | "ended" | "error";

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Log an attempt without ever letting a failure reach the agent's turn. A lost
 * log line costs a row in the debrief; a thrown error inside a client tool
 * handler costs the learner their conversation.
 */
const postJson = (url: string, body: unknown): void => {
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
};

export const usePracticeSession = (scenario: Scenario, settings: SessionSettings) => {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [beatIndex, setBeatIndex] = useState(0);
  const [hint, setHint] = useState<ActiveHint | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [mistakes, setMistakes] = useState<LoggedMistake[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ outcome: string; summary: string } | null>(null);
  const [turnSubmitting, setTurnSubmitting] = useState(false);

  // Read inside client tool handlers, which must not re-register on every state
  // change: the SDK keeps the latest closure, but the id is needed synchronously.
  const sessionIdRef = useRef<string | null>(null);
  const beatIndexRef = useRef(0);
  const lastLearnerAtRef = useRef<number | null>(null);
  const turnSubmittingRef = useRef(false);
  const turnSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputControlsRef = useRef<{ setMuted: (muted: boolean) => void } | null>(null);
  const recommendations = scenarioRecommendedTerms(scenario);

  const conversation = useConversation({
    onConnect: () => setStatus("live"),
    onDisconnect: () => setStatus((current) => (current === "live" ? "ended" : current)),
    onError: (message) => {
      setError(typeof message === "string" ? message : "The call failed.");
      setStatus("error");
    },
    onModeChange: ({ mode }) => {
      if (mode !== "speaking" || !turnSubmittingRef.current) return;
      turnSubmittingRef.current = false;
      setTurnSubmitting(false);
      if (turnSafetyTimerRef.current) clearTimeout(turnSafetyTimerRef.current);
      turnSafetyTimerRef.current = null;
      inputControlsRef.current?.setMuted(false);
    },
    onMessage: ({ message, source, event_id: eventId }) => {
      const role = source === "ai" ? "agent" : "learner";
      const now = performance.now();
      const agentResponseMs =
        role === "agent" && lastLearnerAtRef.current !== null
          ? Math.max(0, Math.round(now - lastLearnerAtRef.current))
          : undefined;
      if (role === "learner") lastLearnerAtRef.current = now;

      const entry: TranscriptEntry = {
        id: newId(),
        eventId,
        role,
        text: message,
        recommendedTerms:
          role === "learner" ? findRecommendedTerms(message, recommendations) : [],
        agentResponseMs,
      };
      setTranscript((entries) => [...entries, entry]);
      if (sessionIdRef.current) {
        postJson(`/api/sessions/${sessionIdRef.current}/messages`, entry);
      }
    },
  });

  useConversationClientTool("showHint", (parameters) => {
    const { text, translation, beatId } = parameters as {
      text: string;
      translation: string;
      beatId: string;
    };
    setHint({ beatId, text, translation, outcome: "awaiting" });
    setHintCount((count) => count + 1);
    if (sessionIdRef.current) {
      postJson(`/api/sessions/${sessionIdRef.current}/attempts`, {
        beatId,
        kind: "hint",
        expected: text,
      });
    }
    return "shown";
  });

  useConversationClientTool("advanceBeat", (parameters) => {
    const { beatIndex: next } = parameters as { beatIndex: number; satisfied: boolean };
    const clamped = Math.max(0, Math.min(next, scenario.beats.length - 1));
    beatIndexRef.current = clamped;
    setBeatIndex(clamped);
    // Clear a hint only once the scene has left the beat it belonged to. An
    // awaiting hint is the line the learner is about to say, so taking it off
    // screen because the agent advanced early is the worst possible moment.
    setHint((current) => {
      if (!current) return null;
      return current.beatId === scenario.beats[clamped]?.id ? current : null;
    });
    return "ok";
  });

  useConversationClientTool("recordAttempt", (parameters) => {
    const attempt = parameters as {
      beatId: string;
      heard: string;
      expected: string;
      verdict: "answered" | "repeated" | "partial" | "missed";
      correction: string;
    };
    setHint((current) =>
      current && current.beatId === attempt.beatId && attempt.verdict !== "answered"
        ? { ...current, outcome: attempt.verdict }
        : current,
    );
    if (sessionIdRef.current) {
      postJson(`/api/sessions/${sessionIdRef.current}/attempts`, {
        ...attempt,
        kind: attempt.verdict === "repeated" || attempt.verdict === "missed" ? "repeat" : "answer",
      });
    }
    return "logged";
  });

  useConversationClientTool("logMistake", (parameters) => {
    const mistake = parameters as LoggedMistake;
    setMistakes((current) => [...current, mistake]);
    if (sessionIdRef.current) {
      postJson(`/api/sessions/${sessionIdRef.current}/attempts`, {
        beatId: scenario.beats[beatIndexRef.current]?.id ?? "unknown",
        kind: "mistake",
        heard: mistake.heard,
        correction: mistake.correction,
        category: mistake.category,
      });
    }
    return "logged";
  });

  useConversationClientTool("endScenario", (parameters) => {
    const ending = parameters as { outcome: string; summary: string };
    setOutcome(ending);
    setStatus("ended");
    if (sessionIdRef.current) {
      postJson(`/api/sessions/${sessionIdRef.current}/end`, ending);
    }
    conversation.endSession();
    return "ended";
  });

  const start = useCallback(async () => {
    setStatus("preparing");
    setError(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id, settings }),
      });
      const opened = (await response.json()) as OpenedSession | { error: string };
      if (!response.ok || "error" in opened) {
        throw new Error("error" in opened ? opened.error : "Could not open the session.");
      }

      sessionIdRef.current = opened.sessionId;
      setSessionId(opened.sessionId);

      const tokenResponse = await fetch("/api/conversation-token", { method: "POST" });
      const tokenBody = (await tokenResponse.json()) as { token?: string; error?: string };
      if (!tokenResponse.ok || !tokenBody.token) {
        throw new Error(tokenBody.error ?? "Could not mint a conversation token.");
      }

      setStatus("connecting");
      conversation.startSession({
        conversationToken: tokenBody.token,
        connectionType: "webrtc",
        dynamicVariables: opened.dynamicVariables,
        overrides: opened.overrides as never,
      });
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Something went wrong.");
      setStatus("error");
    }
  }, [conversation, scenario.id, settings]);

  /**
   * `useConversation` hands back a fresh object every render, so anything that
   * lists it as a dependency re-runs on every render. These two effects both
   * need to fire once, so they read the live handle through a ref instead.
   */
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;
  inputControlsRef.current = conversation;

  useEffect(
    () => () => {
      if (turnSafetyTimerRef.current) clearTimeout(turnSafetyTimerRef.current);
    },
    [],
  );

  /**
   * Audio is already streaming to ElevenLabs. Muting now supplies clean silence,
   * allowing its supported turn detector to close the turn without room noise
   * extending the wait. The SDK has no conversational-audio commit command.
   */
  const finishTurn = useCallback(() => {
    if (status !== "live" || conversationRef.current.isSpeaking || conversationRef.current.isMuted) {
      return;
    }
    turnSubmittingRef.current = true;
    setTurnSubmitting(true);
    conversationRef.current.setMuted(true);
    if (turnSafetyTimerRef.current) clearTimeout(turnSafetyTimerRef.current);
    turnSafetyTimerRef.current = setTimeout(() => {
      turnSubmittingRef.current = false;
      setTurnSubmitting(false);
      conversationRef.current.setMuted(false);
      turnSafetyTimerRef.current = null;
    }, 4_000);
  }, [status]);

  /** Bind the ElevenLabs conversation id so the post-call webhook can find us. */
  const boundConversationRef = useRef(false);
  useEffect(() => {
    if (status !== "live" || !sessionIdRef.current || boundConversationRef.current) return;
    const conversationId = conversationRef.current.getId();
    if (conversationId) {
      boundConversationRef.current = true;
      postJson(`/api/sessions/${sessionIdRef.current}/conversation`, { conversationId });
    }
  }, [status]);

  const askForHelp = useCallback(() => {
    if (status !== "live") return;
    conversationRef.current.sendUserMessage(HELP_MESSAGE);
  }, [status]);

  /** H asks for help. Ignored while the learner is typing into something. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "h" && event.key !== "H") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")) {
        return;
      }
      event.preventDefault();
      askForHelp();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [askForHelp]);

  const stop = useCallback(() => {
    conversationRef.current.endSession();
    setStatus("ended");
    if (sessionIdRef.current) {
      postJson(`/api/sessions/${sessionIdRef.current}/end`, {
        outcome: "abandoned",
        summary: "The learner ended the call.",
      });
    }
  }, []);

  /**
   * The cost and fatigue guard. The agent is told about the limit in its prompt
   * so it can steer to a close, but the timer here is what actually enforces it.
   */
  useEffect(() => {
    if (status !== "live") return;
    const timer = setTimeout(() => {
      conversationRef.current.endSession();
      setStatus("ended");
      if (sessionIdRef.current) {
        postJson(`/api/sessions/${sessionIdRef.current}/end`, {
          outcome: "out-of-time",
          summary: `The session reached its ${settings.maxDurationMinutes} minute limit.`,
        });
      }
    }, settings.maxDurationMinutes * 60_000);
    return () => clearTimeout(timer);
  }, [status, settings.maxDurationMinutes]);

  return {
    status,
    error,
    beatIndex,
    beat: scenario.beats[beatIndex],
    hint,
    hintCount,
    transcript,
    mistakes,
    sessionId,
    outcome,
    isSpeaking: conversation.isSpeaking,
    isMuted: conversation.isMuted,
    turnSubmitting,
    setMuted: conversation.setMuted,
    start,
    stop,
    askForHelp,
    finishTurn,
  };
};
