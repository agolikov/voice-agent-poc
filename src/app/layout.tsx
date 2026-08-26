import type { Metadata } from "next";

import "~/app/globals.css";

export const metadata: Metadata = {
  title: "CallMode",
  description: "Practise a real conversation in the language you are learning.",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body className="min-h-dvh font-sans antialiased">{children}</body>
  </html>
);

export default RootLayout;
