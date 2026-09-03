import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import "./globals.css";
import "./typography-overrides.css";
import LocaleTypography from "../components/LocaleTypography";

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
      </body>
    </html>
  );
}