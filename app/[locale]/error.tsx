"use client";

import { useParams } from "next/navigation";
import { ravineErrorMessage } from "@/lib/ravine-error";

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale === "en" ? "en" : "ar";
  const ar = locale === "ar";

  return (
    <main className="section" dir={ar ? "rtl" : "ltr"}>
      <div className="empty-state">
        <strong>{ar ? "حصل خطأ غير متوقع." : "Something went wrong."}</strong>
        <span>{ravineErrorMessage(error, locale)}</span>
        <button type="button" className="button secondary" onClick={() => reset()}>
          {ar ? "حاول مرة أخرى" : "Try again"}
        </button>
      </div>
    </main>
  );
}
