import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
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
  const cookieStore = await cookies();
  const activeCreatorCookie = cookieStore.get("ravine-active-creator-id")?.value;
  const parsedCreatorId = activeCreatorCookie ? Number(activeCreatorCookie) : null;
  const requestedCreatorId = parsedCreatorId !== null && Number.isInteger(parsedCreatorId) && parsedCreatorId > 0 ? parsedCreatorId : null;
  const hasRequestedCreator = requestedCreatorId !== null;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/studio`);

  const creatorQuery = supabase
    .from("creators")
    .select("id,name,username,specialty,followers")
    .eq("user_id", auth.user.id);
  const [{ data: creator }, { data: application }, { data: profile }] = await Promise.all([
    (hasRequestedCreator ? creatorQuery.eq("id", requestedCreatorId as number) : creatorQuery.order("created_at", { ascending: true })).maybeSingle(),
    supabase.from("creator_applications").select("status,created_at,reviewer_notes,reviewed_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("display_name,username,bio,avatar_url,is_creator").eq("id", auth.user.id).maybeSingle(),
  ]);

  let activeCreator = creator;
  const hasApprovedCreatorAccess = application?.status === "approved" || application?.status === "accepted" || Boolean(profile?.is_creator);
  if (!activeCreator && hasApprovedCreatorAccess) {
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (adminKey && supabaseUrl) {
      const admin = createSupabaseAdminClient(supabaseUrl, adminKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const creatorPayload = {
        user_id: auth.user.id,
        name: profile?.display_name || auth.user.email?.split("@")[0] || "RAVINE Creator",
        username: profile?.username,
        bio: profile?.bio,
        avatar_url: profile?.avatar_url,
        specialty: "Creative maker",
      };
      const { data: recoveredCreator } = await admin
        .from("creators")
        .upsert(creatorPayload, { onConflict: "user_id", ignoreDuplicates: true })
        .select("id,name,username,specialty,followers")
        .maybeSingle();
      activeCreator = recoveredCreator;

      if (!activeCreator) {
        const { data: existingCreator } = await admin
          .from("creators")
          .select("id,name,username,specialty,followers")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        activeCreator = existingCreator;
      }
    }
  }

  if (!activeCreator) {
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
    .eq("creator_id", activeCreator.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const works = (worksData ?? []) as Work[];
  const formatCount = (value: number) => new Intl.NumberFormat(ar ? "ar-EG" : "en-US").format(value);
  const publishedCount = works.filter((work) => work.published).length;
  const draftCount = works.length - publishedCount;

  return (
    <section className="section studio-page">
      <div className="eyebrow">RAVINE / STUDIO</div>
      <div className="section-head">
        <div>
          <h1>{ar ? `مرحبًا، ${activeCreator.name}.` : `Welcome, ${activeCreator.name}.`}</h1>
          <p className="section-note">{ar ? "مساحة العمل والإدارة الخاصة بهويتك الإبداعية." : "Your workspace for managing your creative identity and published work."}</p>
        </div>
        <Link className="button secondary" href={`/${locale}/creators/${activeCreator.id}`}>{ar ? "فتح الملف العام" : "Open public profile"}</Link>
      </div>
      <div className="work-grid">
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">PROFILE</div><h3>{activeCreator.specialty || "Creator"}</h3><p>@{activeCreator.username || `creator-${activeCreator.id}`}</p></div></article>
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">WORKS</div><h3>{formatCount(works.length)}</h3><p>{ar ? `${publishedCount} منشور · ${draftCount} مسودة` : `${publishedCount} published · ${draftCount} drafts`}</p></div></article>
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">AUDIENCE</div><h3>{Number(activeCreator.followers || 0).toLocaleString()}</h3><p>{ar ? "متابع" : "followers"}</p></div></article>
      </div>
      <StudioUpload creatorId={activeCreator.id} locale={locale} />
      <StudioWorkManager works={works} locale={locale} />
    </section>
  );
}
