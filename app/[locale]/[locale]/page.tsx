import Link from "next/link";

const copy = {
  ar: { eyebrow: "RAVINE / 01", title: "ادخل عالمًا من الأعمال التي تستحق أن تُرى.", body: "منصة إبداعية سينمائية تضع العمل وسياقه وصانعيه في المركز — لا الضجيج ولا الشعبية وحدهما.", discover: "اكتشف الأعمال", creators: "تعرف على المبدعين", works: ["سرد بصري", "قصص من الواقع", "تجارب في الحركة"] },
  en: { eyebrow: "RAVINE / 01", title: "Enter a world of work worth seeing.", body: "A cinematic creative platform built around the work, its context, and the people behind it — not noise or popularity alone.", discover: "Discover work", creators: "Meet creators", works: ["Visual essays", "Stories from reality", "Experiments in motion"] }
} as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = locale === "ar" ? copy.ar : copy.en;
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
          <div className="hero-actions">
            <Link className="button primary" href={`/${locale}/discover`}>{t.discover}</Link>
            <Link className="button secondary" href={`/${locale}/creators`}>{t.creators}</Link>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <div><div className="eyebrow">RAVINE / PRINCIPLE</div><h2>{locale === "ar" ? "الجودة قبل الضجيج." : "Quality before noise."}</h2></div>
          <p className="section-note">{locale === "ar" ? "التقدير، الاكتشاف، والسمعة أنظمة مختلفة. النجاح هنا لا يُختزل في عدد المشاهدات." : "Rating, discovery, and reputation remain distinct. Success here is never reduced to a view count."}</p>
        </div>
        <div className="work-grid">
          {t.works.map((work, index) => <article className="work" key={work}><div className="work-art"/><div className="work-body"><div className="work-kicker">0{index + 1}</div><h3>{work}</h3><p>{locale === "ar" ? "عمل ومساحة وسياق — بتجربة هادئة ومقصودة." : "Work, space, and context — presented with restraint and intent."}</p></div></article>)}
        </div>
      </section>
    </>
  );
}
