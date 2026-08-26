"use client";

import { useEffect, useRef } from "react";

import type { TranscriptEntry } from "~/lib/voice/types";

export const Transcript = ({ entries }: { entries: TranscriptEntry[] }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries.length]);

  return (
    <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
      {entries.map((entry) => (
        <p
          key={entry.id}
          className={`text-sm leading-relaxed ${
            entry.role === "agent" ? "text-ink" : "text-ink-soft"
          }`}
        >
          <span className="mr-2 text-[10px] tracking-wide uppercase opacity-60">
            {entry.role === "agent" ? "them" : "you"}
          </span>
          {entry.text}
        </p>
      ))}
      {entries.length === 0 ? (
        <p className="text-sm text-ink-soft">The conversation will appear here.</p>
      ) : null}
      <div ref={endRef} />
    </div>
  );
};
