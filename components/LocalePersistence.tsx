"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  getPersistedRavineLocale,
  persistRavineLocale,
  type RavineLocale,
} from "@/lib/locale-preference";

function replaceLocaleInPath(pathname: string, locale: RavineLocale) {
  const segments = pathname.split("/");
  if (segments[1] === "ar" || segments[1] === "en") {
    segments[1] = locale;
  } else {
    segments.splice(1, 0, locale);
  }
  return segments.join("/");
}

export default function LocalePersistence({ locale }: { locale: RavineLocale }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const persisted = getPersistedRavineLocale();

    if (!persisted) {
      persistRavineLocale(locale);
      return;
    }

    if (persisted === locale) return;

    const nextPath = replaceLocaleInPath(pathname, persisted);
    const search = window.location.search;
    router.replace(`${nextPath}${search}`);
  }, [locale, pathname, router]);

  return null;
}
