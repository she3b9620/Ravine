import Link from "next/link";
import { notFound } from "next/navigation";
import { RAVINE_OPEN_DECISIONS, RAVINE_PLATFORM_MODULES } from "@/lib/ravine-platform";

type Locale = "ar" | "en";

const labels = {
  ar: { back: "العودة إلى عالم RAVINE", foundation: "أساس المنصة", open: "قرار مفتوح", implemented: "مُنفّذ", note: "هذه الطبقة تحفظ قرار الميثاق: القرارات المفتوحة لا تتحول تلقائيًا إلى قرارات نهائية.", audience: "النطاق" },
  en: { back: "Back to RAVINE Universe", foundation: "Platform foundation", open: "Open decision", implemented: "Implemented", note: "This layer preserves the charter rule that open decisions do not become final decisions by implementation alone.", audience: "Scope" },
} as const;

export default async function UniverseModulePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ key?: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const { key } = await searchParams;
  const module = RAVINE_PLATFORM_MODULES.find((item) => item.key === key);
  if (!module) notFound();
  const t = labels[locale];
  const status = module.status === "implemented" ? t.implemented : module.status === "foundation" ? t.foundation : t.open;
  return (
    <section className="section" dir={locale === "ar" ? "rtl" : "ltr"}>
      <Link className="button" href={`/${locale}/universe`}>{t.back}</Link>
      <div className="eyebrow" style={{ marginTop: 28 }}>RAVINE / {module.family.toUpperCase()}</div>
      <h1>{module.title}</h1>
      <p className="section-note">{status} · {t.audience}: {module.audience}</p>
      <div className="empty-state" style={{ marginTop: 24 }}>
        <strong>{t.note}</strong>
        <span>{locale === "ar" ? `الوحدة ${module.title} مرتبطة بالنواة الحالية، بينما المزودات والسياسات والأوزان غير المقفلة تبقى قابلة للاستبدال.` : `${module.title} is connected to the current domain core while unfinalized providers, policies and weights remain replaceable.`}</span>
      </div>
      {module.status === "open" ? (
        <div className="section" style={{ paddingInline: 0, marginTop: 24 }}>
          <div className="eyebrow">OPEN DECISION</div>
          <ul>{RAVINE_OPEN_DECISIONS.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}
