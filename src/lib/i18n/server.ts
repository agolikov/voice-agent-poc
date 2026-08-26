import { cookies } from "next/headers";

import { isUiLocale, uiLocaleCookie, type UiLocale } from "~/lib/i18n/locale";

export const getServerLocale = async (): Promise<UiLocale> => {
  const value = (await cookies()).get(uiLocaleCookie)?.value;
  return isUiLocale(value) ? value : "en";
};
