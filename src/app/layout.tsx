import type { Metadata } from "next";

import "~/app/globals.css";
import { ThemeToggle } from "~/components/theme-toggle";

export const metadata: Metadata = {
  title: "CallMode",
  description: "Practise a real conversation in the language you are learning.",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("callmode-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme="light"}})()`,
        }}
      />
    </head>
    <body className="min-h-dvh font-sans antialiased">
      <ThemeToggle />
      {children}
    </body>
  </html>
);

export default RootLayout;
