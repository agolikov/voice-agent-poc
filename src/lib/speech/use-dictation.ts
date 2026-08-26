"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { speechLocale, type UiLocale } from "~/lib/i18n/locale";
import { mergeDictation } from "~/lib/speech/dictation";

type RecognitionError = "not-allowed" | "service-not-allowed" | "no-speech" | string;
type RecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: RecognitionError }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionConstructor = new () => Recognition;

const constructor = (): RecognitionConstructor | undefined => {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
};

export type DictationError = "denied" | "no-speech" | "failed" | null;

export const useDictation = ({
  locale,
  value,
  onChange,
}: {
  locale: UiLocale;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<DictationError>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const baseRef = useRef("");

  useEffect(() => setSupported(Boolean(constructor())), []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    const Recognition = constructor();
    if (!Recognition) {
      setSupported(false);
      return;
    }
    recognitionRef.current?.stop();
    const recognition = new Recognition();
    recognition.lang = speechLocale[locale];
    recognition.continuous = true;
    recognition.interimResults = true;
    baseRef.current = value;
    setError(null);

    recognition.onresult = (event) => {
      const spoken = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ");
      onChange(mergeDictation(baseRef.current, spoken));
    };
    recognition.onerror = ({ error: recognitionError }) => {
      setError(
        recognitionError === "not-allowed" || recognitionError === "service-not-allowed"
          ? "denied"
          : recognitionError === "no-speech"
            ? "no-speech"
            : "failed",
      );
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      setError("failed");
    }
  }, [locale, onChange, value]);

  return { supported, listening, error, start, stop };
};
