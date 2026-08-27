"use client";

import { useState } from "react";

import { useI18n } from "~/components/i18n-provider";
import { Button, Card } from "~/components/ui";
import type { Scenario } from "~/lib/scenario/schema";

/**
 * The whole scene, on demand, before the call.
 *
 * It is hidden by default and asks once before it opens, because it is a
 * spoiler in the strict sense: the scene works by putting the learner somewhere
 * they have to produce a line, and reading that line first replaces producing it
 * with recognising it. The help loop exists to hand out the same lines one at a
 * time, in the moment they are needed, which is when they stick.
 *
 * It is still here, and behind one click, because a learner who is anxious about
 * what is coming will otherwise not start the call at all.
 */
export const ScriptPreview = ({ scenario }: { scenario: Scenario }) => {
  const { t } = useI18n();
  const [stage, setStage] = useState<"hidden" | "confirming" | "shown">("hidden");

  if (stage === "confirming") {
    return (
      <Card className="border-warn bg-warn-soft p-5">
        <h2 className="font-serif text-base text-ink">{t("scriptWarnTitle")}</h2>
        <p className="mt-2 text-sm text-ink-soft">{t("scriptWarnBody")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => setStage("hidden")}>{t("keepHidden")}</Button>
          <Button variant="ghost" onClick={() => setStage("shown")}>
            {t("showAnyway")}
          </Button>
        </div>
      </Card>
    );
  }

  if (stage === "hidden") {
    return (
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-base text-ink">{t("seeScript")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("seeScriptBlurb")}</p>
          </div>
          <Button
            variant="ghost"
            className="shrink-0"
            onClick={() => setStage("confirming")}
          >
            {t("showScript")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-base text-ink">{t("theScript")}</h2>
        <Button variant="ghost" className="shrink-0" onClick={() => setStage("hidden")}>
          {t("hideScript")}
        </Button>
      </div>

      <ol className="mt-4 space-y-4">
        {scenario.beats.map((beat) => (
          <li key={beat.id} className="border-t border-rule pt-3 first:border-t-0 first:pt-0">
            <p className="text-xs tracking-wide text-ink-soft uppercase">
              {t("beatLabel", { number: beat.index + 1 })} — {beat.intent}
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              <span className="text-xs tracking-wide uppercase">{t("scriptOpens")}</span>{" "}
              <span className="text-ink italic">{beat.agentCue}</span>
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">
              <span className="text-xs tracking-wide uppercase">{t("scriptYouSay")}</span>{" "}
              <span className="font-serif text-base text-ink">{beat.modelAnswer}</span>
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">{beat.modelAnswerTranslation}</p>
          </li>
        ))}
      </ol>

      <p className="mt-4 border-t border-rule pt-3 text-sm text-ink-soft">
        <span className="text-xs tracking-wide uppercase">{t("scriptCloses")}</span>{" "}
        {scenario.closing}
      </p>
    </Card>
  );
};
