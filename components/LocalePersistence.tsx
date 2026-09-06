"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { persistRavineLocale, type RavineLocale } from "@/lib/locale-preference";

export default function LocalePersistence({ locale }: { locale: RavineLocale }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // The URL is authoritative. Never redirect /en to /ar (or vice versa)
    // because an older persisted preference exists in localStorage.
    persistRavineLocale(locale);
  }, [locale, pathname, router]);

  return null;
}
