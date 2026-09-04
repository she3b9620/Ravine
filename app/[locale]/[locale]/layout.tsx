import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const locales = ["ar", "en"] as const;
type Locale = (typeof locales)[number];

export function generateStaticParams() { return locales.map((locale) => ({ locale })); }

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const isArabic = locale === "ar";
  const alternate = isArabic ? "en" : "ar";
  return (
    <div dir={isArabic ? "rtl" : "ltr"}>
      <header className="site-header">
        <Link href={`/${locale}`} className="brand" aria-label="RAVINE home">RAVINE<span>.</span></Link>
        <nav aria-label="Primary navigation">
          <Link href={`/${locale}/discover`}>{isArabic ? "اكتشف" : "Discover"}</Link>
          <Link href={`/${locale}/creators`}>{isArabic ? "المبدعون" : "Creators"}</Link>
          <Link href={`/${alternate}`} className="locale-switch">{isArabic ? "EN" : "عربي"}</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <span>RAVINE — {isArabic ? "عالم الإبداع" : "A world of creative work"}</span>
        <span>{isArabic ? "لا شيء زخرفي بلا معنى" : "Nothing Decorative Without Meaning"}</span>
      </footer>
    </div>
  );
}
