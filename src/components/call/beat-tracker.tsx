"use client";

import type { Beat } from "~/lib/scenario/schema";

type Props = { beats: Beat[]; current: number };

export const BeatTracker = ({ beats, current }: Props) => (
  <ol className="flex flex-wrap gap-1.5">
    {beats.map((beat) => {
      const state = beat.index < current ? "done" : beat.index === current ? "now" : "todo";
      return (
        <li
          key={beat.id}
          title={beat.intent}
          className={`h-1.5 flex-1 min-w-6 rounded-full ${
            state === "done" ? "bg-accent" : state === "now" ? "bg-warn" : "bg-rule"
          }`}
        />
      );
    })}
  </ol>
);
