import "./globals.css";
import "./typography.css";
import "./motion.css";
import "./ravine-polish.css";
import "./ravine-arabic-smoothing.css";
import "./ravine-contrast-fixes.css";
import "../components/SearchLauncher.css";
import "./ravine-ui-refinement.css";
import "./ravine-brand-refinement.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
