"use client";

import Link from "next/link";
import { RAVINE_PLATFORM_MODULES } from "@/lib/ravine-platform";

type Props = { locale: "ar" | "en" };

const copy = {
  ar: {
    eyebrow: "RAVINE / CREATIVE DIGITAL UNIVERSE",
    title: "عالم إبداعي واحد، متصل من العمل إلى الإنسان إلى المجتمع.",
    intro: "طبقة موحّدة تربط تجربة المشاهدة بهوية المبدع والمجتمع والبث والاكتشاف والثقة والذكاء والاقتصاد.",
    implemented: "مُنفّذ",
    foundation: "أساس جاهز",
    open: "قرار مفتوح",
  },
  en: {
    eyebrow: "RAVINE / CREATIVE DIGITAL UNIVERSE",
    title: "One creative world, connected from work to people to community.",
    intro: "A unified layer connecting viewing with Creator identity, Community, Live, Discovery, Trust, Intelligence and Economy.",
    implemented: "Implemented",
    foundation: "Foundation",
    open: "Open decision",
  },
} as const;

export default function RAVINEUniverseHub({ locale }: Props) {
  const t = copy[locale];
  return (
    <section className="section ravine-universe-hub" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="eyebrow">{t.eyebrow}</div>
      <h1>{t.title}</h1>
      <p className="section-note">{t.intro}</p>
      <div className="video-grid" style={{ marginTop: 28 }}>
        {RAVINE_PLATFORM_MODULES.map((module) => {
          const label = module.status === "implemented" ? t.implemented : module.status === "foundation" ? t.foundation : t.open;
          return (
            <Link key={module.key} href={`/${locale}/universe/module?key=${encodeURIComponent(module.key)}`} className="video-card" data-ravine-module={module.key}>
              <div className="video-meta">
                <div className="video-kicker">{module.family.toUpperCase()} · {label}</div>
                <h2>{module.title}</h2>
                <p>{module.audience === "guest" ? "Public entry / مدخل عام" : module.audience === "creator" ? "Creator workspace / مساحة المبدع" : module.audience === "admin" ? "Protected operations / عمليات محمية" : "Authenticated experience / تجربة مسجلة"}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
