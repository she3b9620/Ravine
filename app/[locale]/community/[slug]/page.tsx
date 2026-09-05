import Link from "next/link";
import { notFound } from "next/navigation";
import AuthTrigger from "@/components/AuthTrigger";
import { communityCatalog, getCommunity, type CommunityLocale } from "@/lib/community-catalog";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return ["ar", "en"].flatMap((locale) =>
    communityCatalog.map(({ slug }) => ({ locale, slug }))
  );
}

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (rawLocale !== "ar" && rawLocale !== "en") notFound();

  const locale: CommunityLocale = rawLocale;
  const community = getCommunity(slug);
  if (!community) notFound();

  const content = community[locale];
  const isAr = locale === "ar";

  return (
    <section className="section community-page">
      <Link className="button secondary" href={`/${locale}/community`}>
        {isAr ? "العودة إلى المجتمعات" : "Back to communities"}
      </Link>

      <div className="eyebrow" style={{ marginTop: 32 }}>{content.eyebrow}</div>
      <h1>{content.name}</h1>
      <p className="section-note">{content.description}</p>

      <div className="community-space-grid" style={{ marginTop: 28 }}>
        {content.details.map((detail, index) => (
          <article className="community-space-card" key={detail}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{detail}</p>
          </article>
        ))}
      </div>

      <div className="community-open-note" style={{ marginTop: 28 }}>
        {isAr
          ? "يمكن للزائر قراءة المعاينة العامة. الانضمام والتفاعل الأعمق يتطلبان المصادقة؛ لا يتم إنشاء عضوية أو صلاحيات وهمية هنا."
          : "Guests can read the public preview. Joining and deeper interaction require authentication; no fake membership or permissions are created here."}
      </div>

      <div style={{ marginTop: 20 }}>
        <AuthTrigger
          locale={locale}
          label={isAr ? "سجّل الدخول للانضمام" : "Sign in to join"}
          mode="signin"
          primary
        />
      </div>
    </section>
  );
}
