import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudioUpload from "@/components/StudioUpload";
import StudioWorkManager from "@/components/StudioWorkManager";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type Work = {
  id: number;
  title: string;
  description: string | null;
  content_type: string | null;
  quality: string | null;
  published: boolean | null;
  visibility: string | null;
  video_url: string | null;
  views: number | null;
  likes: number | null;
  created_at: string | null;
};

export default async function StudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/studio`);

  const [{ data: creator }, { data: application }] = await Promise.all([
    supabase.from("creators").select("id,name,username,specialty,followers").eq("user_id", auth.user.id).maybeSingle(),
    supabase.from("creator_applications").select("status,created_at,reviewer_notes,reviewed_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!creator) {
    return (
      <section className="section">
        <div className="eyebrow">RAVINE / STUDIO</div>
        <h1>{ar ? "مساحتك الإبداعية تبدأ من هنا." : "Your creative workspace starts here."}</h1>
        <p className="section-note">
          {application?.status === "pending"
            ? (ar ? "طلب المبدع الخاص بك قيد المراجعة. ستظهر أدوات Studio بعد القبول." : "Your creator application is under review. Studio tools appear after approval.")
            : (ar ? "قدّم طلب Creator أولًا. القبول يدوي ومبني على العمل والخبرة والسياق." : "Apply as a creator first. Admission is manual and based on work, experience, and context.")}
        </p>
        <Link className="button primary" href={`/${locale}/creator/apply`}>
          {application?.status === "pending" ? (ar ? "عرض الطلب" : "View application") : (ar ? "التقديم كمبدع" : "Apply as creator")}
        </Link>
      </section>
    );
  }

  const { data: worksData } = await supabase
    .from("videos")
    .select("id,title,description,content_type,quality,published,visibility,video_url,views,likes,created_at")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const works = (worksData ?? []) as Work[];
  const publishedCount = works.filter((work) => work.published).length;
  const draftCount = works.length - publishedCount;

  return (
    <section className="section studio-page">
      <div className="eyebrow">RAVINE / STUDIO</div>
      <div className="section-head">
        <div>
          <h1>{ar ? `مرحبًا، ${creator.name}.` : `Welcome, ${creator.name}.`}</h1>
          <p className="section-note">{ar ? "مساحة العمل والإدارة الخاصة بهويتك الإبداعية." : "Your workspace for managing your creative identity and published work."}</p>
        </div>
        <Link className="button secondary" href={`/${locale}/creators/${creator.id}`}>{ar ? "فتح الملف العام" : "Open public profile"}</Link>
      </div>
      <div className="work-grid">
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">PROFILE</div><h3>{creator.specialty || "Creator"}</h3><p>@{creator.username || `creator-${creator.id}`}</p></div></article>
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">WORKS</div><h3>{works.length.toLocaleString()}</h3><p>{ar ? `${publishedCount} منشور · ${draftCount} مسودة` : `${publishedCount} published · ${draftCount} drafts`}</p></div></article>
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">AUDIENCE</div><h3>{Number(creator.followers || 0).toLocaleString()}</h3><p>{ar ? "متابع" : "followers"}</p></div></article>
      </div>
      <StudioUpload creatorId={creator.id} locale={locale} />
      <StudioWorkManager works={works} locale={locale} />
    </section>
  );
}
