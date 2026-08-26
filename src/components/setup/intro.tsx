import { Card } from "~/components/ui";
import { useI18n } from "~/components/i18n-provider";

export const Intro = () => {
  const { t } = useI18n();
  const beats = [
    { title: t("introPickTitle"), body: t("introPickBody") },
    { title: t("introSpeakTitle"), body: t("introSpeakBody") },
    { title: t("introHelpTitle"), body: t("introHelpBody") },
    { title: t("introDebriefTitle"), body: t("introDebriefBody") },
  ];
  return (
  <div>
    <Card className="p-5">
      <ol className="grid gap-5 sm:grid-cols-2">
        {beats.map((beat, index) => (
          <li key={beat.title} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-rule text-xs text-ink-soft">
              {index + 1}
            </span>
            <div>
              <h3 className="font-serif text-base text-ink">{beat.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{beat.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>

    <p className="mt-4 text-xs text-ink-soft">
      {t("microphoneCost")}
    </p>
  </div>
  );
};
