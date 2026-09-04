import Link from "next/link";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

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
    generalBody: "المساحة الجامعة لرؤية ما يحدث داخل رَافِين والتعرف على الاتجاهات والنقاشات الرئيسية.",
    topicsBody: "مساحات مثل السينما، التصوير، المونتاج، الحركة، المؤثرات البصرية، الوثائقي، الموسيقى، البرامج الصوتية والألعاب.",
    creatorsBody: "لكل مبدع مجتمع مستقل عن تعليقات الأعمال، مع إعدادات وصول وخصوصية قابلة للضبط.",
    groupsBody: "مجموعات ينشئها المستخدمون حول اهتماماتهم ومشاريعهم وممارساتهم الإبداعية، وفق قواعد الأهلية التي ستُحسم لاحقًا.",
    eliteBody: "مساحات نادرة ذات طابع خاص، تُفعّل لاحقًا وفق معايير واضحة وليست مفتوحة تلقائيًا للجميع.",
    loop: "العمل ← المجتمع ← الحوار ← الجلسة المباشرة ← البرنامج الصوتي ← العودة إلى المجتمع",
    note: "هذه البنية تعرض اتجاه المنتج فقط؛ قواعد الأهلية الدقيقة للمجموعات، وسياسات الإشراف والتصعيد، ما زالت قرارات مفتوحة في المواصفة.",
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
    generalBody: "The shared platform space for what is happening across RAVINE and the conversations shaping discovery.",
    topicsBody: "Spaces for film, photography, editing, motion, VFX, documentary, music, podcasts and gaming.",
    creatorsBody: "Every Creator can have a community separate from work comments, with configurable access and privacy.",
    groupsBody: "User-created groups around interests, projects and creative practices, under eligibility rules that remain to be finalized.",
    eliteBody: "Rare, special spaces activated later under explicit criteria rather than being automatically open to everyone.",
    loop: "Work → Community → Conversation → Live → Podcast → Community",
    note: "This page represents the agreed product direction only. Exact group eligibility, moderation and escalation rules remain open decisions in the specification.",
    back: "Back to discovery",
  },
} as const;

export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const raw = (await params).locale;
  const locale: Locale = raw === "en" ? "en" : "ar";
  const t = copy[locale];

  const spaces = [
    [t.general, t.generalBody],
    [t.topics, t.topicsBody],
    [t.creators, t.creatorsBody],
    [t.groups, t.groupsBody],
    [t.elite, t.eliteBody],
  ];

  return (
    <section className="section community-page">
      <div className="eyebrow">{t.eyebrow}</div>
      <h1>{t.title}</h1>
      <p className="section-note">{t.body}</p>

      <div className="community-space-grid">
        {spaces.map(([name, description], index) => (
          <article className="community-space-card" key={name}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{name}</h2>
            <p>{description}</p>
          </article>
        ))}
      </div>

      <div className="community-loop">{t.loop}</div>
      <p className="community-open-note">{t.note}</p>
      <Link className="button secondary" href={`/${locale}/discover`}>{t.back}</Link>
    </section>
  );
}
