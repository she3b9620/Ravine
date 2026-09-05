import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type Community = {
  slug: string;
  type: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  privacy: string;
};

const copy = {
  ar: {
    eyebrow: "رَافِين / المجتمعات",
    title: "المجتمع هو الطبقة التي تبقي الإبداع حيًا.",
    body: "مساحات مستمرة حول الأعمال والموضوعات والمبدعين، مصممة للحوار والمشاركة والانتقال بين العمل والجلسات المباشرة والبرامج الصوتية.",
    general: "المجتمع العام",
    topics: "مجتمعات الموضوعات",
    creators: "مجتمعات المبدعين",
    groups: "مجموعات المستخدمين",
    elite: "مساحات النخبة",
    open: "فتح المجتمع",
    back: "العودة إلى الاكتشاف",
  },
  en: {
    eyebrow: "RAVINE / COMMUNITIES",
    title: "Community is the layer that keeps creativity alive.",
    body: "Persistent spaces around work, topics and creators, designed for conversation and participation across Work, Live and Podcast.",
    general: "General community",
    topics: "Topic communities",
    creators: "Creator communities",
    groups: "User groups",
    elite: "Elite spaces",
    open: "Open community",
    back: "Back to discovery",
  },
} as const;

function typeLabel(locale: Locale, type: string) {
  const labels: Record<string, [string, string]> = {
    platform: ["منصة", "Platform"],
    topic: ["موضوع", "Topic"],
    creator: ["مبدعون", "Creator"],
    user_created: ["مستخدمون", "User group"],
    elite: ["خاص", "Elite"],
  };
  return labels[type]?.[locale === "ar" ? 0 : 1] ?? type;
}

function sectionFor(type: string) {
  if (type === "platform") return 0;
  if (type === "topic") return 1;
  if (type === "creator") return 2;
  if (type === "user_created") return 3;
  return 4;
}

export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const raw = (await params).locale;
  const locale: Locale = raw === "en" ? "en" : "ar";
  const t = copy[locale];
  const supabase = await createClient();
  const { data } = await supabase
    .from("communities")
    .select("slug,type,name_en,name_ar,description_en,description_ar,privacy")
    .eq("is_active", true)
    .order("type", { ascending: true })
    .order("name_en", { ascending: true });

  const communities = ((data ?? []) as Community[]).sort((a, b) => {
    const sectionDiff = sectionFor(a.type) - sectionFor(b.type);
    return sectionDiff || a.name_en.localeCompare(b.name_en);
  });

  const sectionTitles = [t.general, t.topics, t.creators, t.groups, t.elite];

  return (
    <section className="section community-page">
      <div className="eyebrow">{t.eyebrow}</div>
      <h1>{t.title}</h1>
      <p className="section-note">{t.body}</p>

      <div className="community-system-list">
        {[0, 1, 2, 3, 4].map((sectionIndex) => {
          const items = communities.filter((item) => sectionFor(item.type) === sectionIndex);
          if (!items.length) return null;
          return (
            <section className="community-system-section" key={sectionIndex}>
              <div className="community-system-section-head">
                <span>{sectionTitles[sectionIndex]}</span>
              </div>
              <div className="community-space-grid">
                {items.map((community, index) => {
                  const name = locale === "ar" ? community.name_ar : community.name_en;
                  const description = locale === "ar" ? community.description_ar : community.description_en;
                  return (
                    <Link className="community-space-card" href={`/${locale}/community/${community.slug}`} key={community.slug}>
                      <span className="community-space-index" aria-label={`${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
                      <div className="community-space-meta">{typeLabel(locale, community.type)}</div>
                      <h2>{name}</h2>
                      <p>{description}</p>
                      <strong>{t.open}</strong>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="community-loop">{locale === "ar" ? "العمل ← المجتمع ← الحوار ← الجلسة المباشرة ← البرنامج الصوتي ← العودة إلى المجتمع" : "Work → Community → Conversation → Live → Podcast → Community"}</div>
      <Link className="button secondary" href={`/${locale}/discover`}>{t.back}</Link>
    </section>
  );
}
