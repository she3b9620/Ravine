import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import "./globals.css";
import "./typography-overrides.css";
import "./ravine-motion.css";
import "./ravine-motion-overrides.css";
import "./guest-home-overrides.css";
import "./ravine-design-system.css";
import LocaleTypography from "../components/LocaleTypography";
import VideoHoverPreview from "../components/VideoHoverPreview";
import GuestMenuMotion from "../components/GuestMenuMotion";

export const metadata: Metadata = {
  title: "RAVINE — Platform",
  description: "A global home for original voices.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <body>
        <LocaleTypography />
        {children}
        <VideoHoverPreview />
        <GuestMenuMotion />
      </body>
    </html>
  );
}
