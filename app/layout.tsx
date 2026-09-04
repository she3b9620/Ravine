import "./globals.css";
import "./typography.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@dawod/thmanyah-font-web@1.0.0/index.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
