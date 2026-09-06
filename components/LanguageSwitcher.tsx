"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { persistRavineLocale, type RavineLocale } from "@/lib/locale-preference";

type Locale = RavineLocale;
type FlagCode = "eg" | "sa" | "ps" | "gb" | "us" | "ca" | "au";
type LanguageOption = { locale: Locale; label: string; nativeLabel: string; flags: FlagCode[] };

const OPTIONS: Record<Locale, LanguageOption> = {
  ar: { locale: "ar", label: "العربية", nativeLabel: "Arabic", flags: ["eg", "sa", "ps"] },
  en: { locale: "en", label: "English", nativeLabel: "English", flags: ["gb", "us", "ca", "au"] },
};

function replaceLocaleInPath(pathname: string, locale: Locale) {
  const segments = pathname.split("/");
  if (segments[1] === "ar" || segments[1] === "en") segments[1] = locale;
  else segments.splice(1, 0, locale);
  return segments.join("/");
}

function FlagIcon({ code }: { code: FlagCode }) { return <span className={`ravine-flag ravine-flag-${code}`} aria-hidden="true" />; }

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [switching, setSwitching] = useState(false);
  const current = OPTIONS[locale];
  const alternateLocale: Locale = locale === "ar" ? "en" : "ar";
  const alternate = OPTIONS[alternateLocale];

  const buildHref = (nextLocale: Locale) => {
    const query = searchParams.toString();
    const path = replaceLocaleInPath(pathname, nextLocale);
    return `${path}${query ? `?${query}` : ""}`;
  };

  useEffect(() => {
    const root = document.documentElement;
    if (switching) root.dataset.ravineLocaleTransition = "switching";
    return () => {
      delete root.dataset.ravineLocaleTransition;
    };
  }, [switching]);

  function handleLanguageChange(nextLocale: Locale, event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (nextLocale === locale || switching) return;
    const destination = buildHref(nextLocale);
    persistRavineLocale(nextLocale);
    setSwitching(true);
    window.setTimeout(() => {
      startTransition(() => router.replace(destination, { scroll: false }));
    }, 160);
    window.setTimeout(() => setSwitching(false), 520);
  }

  return (
    <details className="ravine-language-menu">
      <summary className="ravine-language" aria-label={locale === "ar" ? "اختيار اللغة" : "Choose language"}>
        <span className="ravine-language-current-flags" aria-hidden="true">{current.flags.map((flag) => <FlagIcon code={flag} key={flag} />)}</span>
        <span className="ravine-language-copy"><span className="ravine-language-label">{current.label}</span><span className="ravine-language-chevron" aria-hidden="true">⌄</span></span>
      </summary>
      <div className="ravine-language-panel" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="ravine-language-panel-title">{locale === "ar" ? "لغة RAVINE" : "RAVINE language"}</div>
        <Link href={buildHref(current.locale)} className={`ravine-language-option ${current.locale === "ar" ? "is-arabic" : "is-english"} is-current`} aria-current="page" onClick={(event) => handleLanguageChange(current.locale, event)}>
          <span className="ravine-language-option-flags">{current.flags.map((flag) => <FlagIcon code={flag} key={flag} />)}</span>
          <span className="ravine-language-option-copy"><strong>{current.label}</strong><small>{current.nativeLabel}</small></span>
          <span className="ravine-language-check">✓</span>
        </Link>
        <Link href={buildHref(alternate.locale)} className={`ravine-language-option ${alternate.locale === "ar" ? "is-arabic" : "is-english"}${switching ? " is-switching" : ""}`} onClick={(event) => handleLanguageChange(alternate.locale, event)}>
          <span className="ravine-language-option-flags">{alternate.flags.map((flag) => <FlagIcon code={flag} key={flag} />)}</span>
          <span className="ravine-language-option-copy"><strong>{alternate.label}</strong><small>{alternate.nativeLabel}</small></span>
          <span className="ravine-language-open">↗</span>
        </Link>
        <div className="ravine-language-note">{locale === "ar" ? "اختيارك يظل ثابتًا أثناء التنقل." : "Your choice stays with you while you browse."}</div>
      </div>
    </details>
  );
}
