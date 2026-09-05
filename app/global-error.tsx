"use client";

import { ravineErrorMessage } from "@/lib/ravine-error";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: "#090909", color: "#f1e9dc", fontFamily: "sans-serif" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "32px", boxSizing: "border-box" }}>
          <section style={{ width: "min(720px,100%)", padding: "28px", border: "1px solid rgba(241,233,220,.12)", borderRadius: "24px", background: "#151719", textAlign: "right" }}>
            <div style={{ color: "#c47a52", fontSize: "12px", fontWeight: 800, letterSpacing: ".08em", marginBottom: "12px" }}>RAVINE / خطأ</div>
            <h1 style={{ margin: "0 0 10px", fontSize: "34px" }}>حصل خطأ غير متوقع.</h1>
            <p style={{ margin: "0 0 20px", color: "#9a9690", lineHeight: 1.8 }}>{ravineErrorMessage(error, "ar")}</p>
            <button type="button" onClick={() => reset()} style={{ minHeight: "44px", padding: "0 18px", border: "1px solid #c47a52", borderRadius: "999px", background: "#c47a52", color: "#160f0b", fontWeight: 700, cursor: "pointer" }}>حاول مرة أخرى</button>
          </section>
        </main>
      </body>
    </html>
  );
}
