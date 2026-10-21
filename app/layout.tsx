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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html id="ravine-font-authority" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
