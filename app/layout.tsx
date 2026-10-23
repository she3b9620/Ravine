import "./globals.css";
import "./typography.css";
import "./motion.css";
import "./ravine-polish.css";
import "./ravine-arabic-smoothing.css";
import "./ravine-contrast-fixes.css";
import "../components/SearchLauncher.css";
import "./ravine-ui-refinement.css";
import "./ravine-brand-refinement.css";
import "./ravine-dashboard.css";
import "./ravine-final-visual-fixes.css";
import "./home-feed-density.css";
import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
