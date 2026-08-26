import type { Metadata } from "next";

import "~/app/globals.css";
import { GlobalControls } from "~/components/global-controls";
import { I18nProvider } from "~/components/i18n-provider";
import { getServerLocale } from "~/lib/i18n/server";

export const metadata: Metadata = {
  title: "CallMode",
  description: "Practise a real conversation in the language you are learning.",
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const locale = await getServerLocale();
  return <html lang={locale} suppressHydrationWarning>
    <head>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("callmode-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme="light"}})()`,
        }}
      />
    </head>
    <body className="min-h-dvh font-sans antialiased">
      <I18nProvider locale={locale}>
        <GlobalControls />
        {children}
      </I18nProvider>
    </body>
  </html>
};

export default RootLayout;
