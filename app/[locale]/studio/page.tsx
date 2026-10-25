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

export default async function StudioPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ creatorId?: string | string[] }> }) {
  const { locale: rawLocale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const cookieStore = await cookies();
  const activeCreatorCookie = cookieStore.get("ravine-active-creator-id")?.value;
  const queryCreatorValue = Array.isArray(resolvedSearchParams.creatorId) ? resolvedSearchParams.creatorId[0] : resolvedSearchParams.creatorId;
  const parsedCreatorId = queryCreatorValue ? Number(queryCreatorValue) : activeCreatorCookie ? Number(activeCreatorCookie) : null;
  const requestedCreatorId = parsedCreatorId !== null && Number.isInteger(parsedCreatorId) && parsedCreatorId > 0 ? parsedCreatorId : null;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/studio`);

  const creatorQuery = supabase
    .from("creators")
    .select("id,name,username,specialty,followers")
    .eq("user_id", auth.user.id);
  const [{ data: creator }, { data: application }, { data: profile }] = await Promise.all([
    requestedCreatorId !== null
      ? creatorQuery.eq("id", requestedCreatorId).maybeSingle()
      : creatorQuery.order("created_at", { ascending: true }).limit(1).maybeSingle(),
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

  const creatorTier = profile?.is_creator ? (application?.status === "approved" || application?.status === "accepted" ? (ar ? "مبدع معتمد" : "Verified Creator") : (ar ? "مبدع" : "Creator")) : (ar ? "مبدع" : "Creator");
  const nextTier = creatorTier.includes("معتمد") || creatorTier.includes("Verified") ? (ar ? "RAVINE Select — قيد التقييم" : "RAVINE Select — under review") : (ar ? "المستوى التالي: مبدع معتمد" : "Next: Verified Creator");

  return (
    <section className="section studio-page">
      <div className="studio-command-header">
        <div>
          <div className="eyebrow">RAVINE / CREATOR SPACE</div>
          <div className="studio-identity-line"><span className="studio-mode-mark" aria-hidden="true" /> <span>{ar ? "أنت تتفاعل الآن بصفتك" : "You are acting as"} <strong>{activeCreator.name}</strong></span></div>
          <h1>{ar ? "لوحة المبدع الخاصة بك." : "Your creator command center."}</h1>
          <p className="section-note">{ar ? "هنا تدير هويتك الإبداعية وأعمالك المنشورة. حسابك الشخصي يظل منفصلًا ويمكن العودة إليه من مبدّل الهوية." : "Manage your creative identity and published work here. Your personal account stays separate and is always available from the identity switcher."}</p>
        </div>
        <div className="studio-command-actions"><span className="studio-tier-badge">{creatorTier}</span><Link className="button secondary" href={`/${locale}/creators/${activeCreator.id}`}>{ar ? "فتح الملف العام" : "Open public profile"}</Link></div>
      </div>
      <div className="studio-progress-panel"><div><div className="work-kicker">CREATOR PATH</div><h2>{ar ? "مسار الثقة والإبداع" : "Trust and creative path"}</h2><p>{nextTier}</p></div><div className="studio-progress-steps"><span className="is-done">{ar ? "حساب" : "Account"}</span><span className="is-done">{ar ? "مبدع" : "Creator"}</span><span className={creatorTier.includes("معتمد") || creatorTier.includes("Verified") ? "is-done" : ""}>{ar ? "معتمد" : "Verified"}</span><span>{ar ? "Select" : "Select"}</span></div></div>
      <div className="work-grid">
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">IDENTITY</div><h3>{activeCreator.specialty || (ar ? "مبدع" : "Creator")}</h3><p>@{activeCreator.username || `creator-${activeCreator.id}`}</p></div></article>
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">WORKS</div><h3>{formatCount(works.length)}</h3><p>{ar ? `${publishedCount} منشور · ${draftCount} مسودة` : `${publishedCount} published · ${draftCount} drafts`}</p></div></article>
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">AUDIENCE</div><h3>{Number(activeCreator.followers || 0).toLocaleString()}</h3><p>{ar ? "متابع" : "followers"}</p></div></article>
      </div>
      <StudioUpload creatorId={activeCreator.id} locale={locale} />
      <StudioWorkManager works={works} locale={locale} />
    </section>
  );
}
