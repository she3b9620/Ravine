import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Check, LockKeyhole, Sparkles } from "lucide-react";
import { RAVINE_PLATFORM_MODULES } from "@/lib/ravine-platform";

type Locale = "ar" | "en";
type SurfaceKey = "messages" | "collections" | "events" | "spaces" | "opportunities" | "intelligence" | "trust" | "admin" | "universe";

type Copy = { title: string; intro: string; status: string; ready: string; foundation: string; open: string; back: string };
const copy: Record<Locale, Copy> = {
  ar: { title: "عالم RAVINE", intro: "طبقة واحدة تربط الهوية والعمل والمجتمع والاكتشاف والذكاء دون تحويل RAVINE إلى لوحة تحكم عامة.", status: "الحالة", ready: "مطبق", foundation: "أساس جاهز للتوصيل", open: "قرار مفتوح", back: "استكشف RAVINE" },
  en: { title: "RAVINE Universe", intro: "One connected layer for identity, work, community, discovery, and intelligence—without turning RAVINE into a generic dashboard.", status: "Status", ready: "Implemented", foundation: "Foundation", open: "Open decision", back: "Explore RAVINE" },
};
const titles: Record<Locale, Record<SurfaceKey, string>> = {
  ar: { messages: "الرسائل", collections: "المجموعات واللوحات", events: "الأحداث والبريمير", spaces: "Spaces", opportunities: "الفرص", intelligence: "RAVINE Intelligence", trust: "الثقة والحقوق", admin: "الإدارة", universe: "المنظومة" },
  en: { messages: "Messages", collections: "Collections & Boards", events: "Events & Premieres", spaces: "Spaces", opportunities: "Opportunities", intelligence: "RAVINE Intelligence", trust: "Trust & Rights", admin: "Administration", universe: "Universe" },
};

export function RAVINEUniverseSurface({ locale, surface, children }: { locale: Locale; surface: SurfaceKey; children?: ReactNode }) {
  const ar = locale === "ar";
  const text = copy[locale];
  const heading = titles[locale][surface];
  const visible = surface === "universe" ? RAVINE_PLATFORM_MODULES : RAVINE_PLATFORM_MODULES.filter((module) => module.key === surface);
  return (
    <main className="section" dir={ar ? "rtl" : "ltr"} style={{ maxWidth: 1240, margin: "0 auto", paddingBlock: 40 }}>
      <header style={{ display: "grid", gap: 12, marginBottom: 28 }}>
        <div style={{ fontSize: 12, letterSpacing: ".18em", opacity: .68 }}>RAVINE / {heading.toUpperCase()}</div>
        <h1 style={{ margin: 0, fontSize: "clamp(32px,5vw,62px)", lineHeight: 1.02 }}>{surface === "universe" ? text.title : heading}</h1>
        <p style={{ margin: 0, maxWidth: 760, fontSize: 17, lineHeight: 1.7, opacity: .78 }}>{text.intro}</p>
      </header>
      {children}
      <section style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
        {visible.map((module) => {
          const status = module.status === "implemented" ? text.ready : module.status === "foundation" ? text.foundation : text.open;
          const Icon = module.status === "implemented" ? Check : module.status === "foundation" ? Sparkles : LockKeyhole;
          return (
            <Link key={module.key} href={`/${locale}${module.href}`} style={{ textDecoration: "none", color: "inherit", border: "1px solid color-mix(in srgb,currentColor 12%,transparent)", borderRadius: 20, padding: 20, display: "grid", gap: 14, minHeight: 150 }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 11, letterSpacing: ".14em", opacity: .6 }}>{module.family.toUpperCase()}</span><Icon size={16} /></span>
              <strong style={{ fontSize: 20 }}>{module.title}</strong>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", fontSize: 13, opacity: .75 }}><span>{text.status}: {status}</span><ArrowUpRight size={15} /></span>
            </Link>
          );
        })}
      </section>
      {surface !== "universe" ? <Link href={`/${locale}/universe`} style={{ display: "inline-flex", gap: 8, marginTop: 28, alignItems: "center", textDecoration: "none", color: "inherit", opacity: .78 }}>{text.back}<ArrowUpRight size={15} /></Link> : null}
    </main>
  );
}
