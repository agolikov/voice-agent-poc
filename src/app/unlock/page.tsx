import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { UnlockForm } from "~/app/unlock/unlock-form";
import { Card } from "~/components/ui";
import { safeNextPath } from "~/lib/auth/decide";
import { accessCookieName, isAccessTokenValid, readPasscode } from "~/lib/auth/gate";
import { translate } from "~/lib/i18n/messages";
import { getServerLocale } from "~/lib/i18n/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string | string[] }> };

const UnlockPage = async ({ searchParams }: Props) => {
  const { next: raw } = await searchParams;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw);

  // Nothing to unlock if the gate is off, and nothing to ask if this visitor
  // already holds a valid token — either way, send them where they were going.
  const passcode = readPasscode();
  if (!passcode) redirect(next);
  const cookie = (await cookies()).get(accessCookieName)?.value;
  if (isAccessTokenValid(cookie, passcode, Math.floor(Date.now() / 1000))) redirect(next);

  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-5 py-12">
      <Card className="w-full p-6">
        <h1 className="font-serif text-2xl text-ink">{t("unlockTitle")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("unlockBlurb")}</p>
        <UnlockForm next={next} />
      </Card>
    </main>
  );
};

export default UnlockPage;
