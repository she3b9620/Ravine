import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import AuthTrigger from "@/components/AuthTrigger";
import { getCommunity, type CommunityLocale } from "@/lib/community-catalog";

export const dynamic = "force-dynamic";

export async function joinCommunityAction(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en") === "ar" ? "ar" : "en";
  if (!slug) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: community } = await supabase
    .from("communities")
    .select("id,type,privacy,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!community || !community.is_active || community.privacy !== "public" || !["platform", "topic"].includes(community.type)) return;

  await supabase.from("community_members").insert({
    community_id: community.id,
    user_id: user.id,
    role: "member",
    status: "active",
  });

  revalidatePath(`/${locale}/community/${slug}`);
  revalidatePath(`/${locale}/community`);
}

export async function createCommunityPostAction(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en") === "ar" ? "ar" : "en";
  const body = String(formData.get("body") ?? "").trim();
  if (!slug || !body) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: community } = await supabase
    .from("communities")
    .select("id,type,privacy,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!community || !community.is_active || community.privacy !== "public") return;

  await supabase.from("community_posts").insert({
    community_id: community.id,
    author_id: user.id,
    post_type: "post",
    body,
  });

  revalidatePath(`/${locale}/community/${slug}`);
}

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (rawLocale !== "ar" && rawLocale !== "en") notFound();

  const locale: CommunityLocale = rawLocale;
  const communityCopy = getCommunity(slug);
  if (!communityCopy) notFound();

  const isAr = locale === "ar";
  const t = communityCopy[locale];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: dbCommunity } = await supabase
    .from("communities")
    .select("id,type,privacy,name_en,name_ar,description_en,description_ar,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!dbCommunity || !dbCommunity.is_active) notFound();

  const [{ data: memberships }, { data: posts }] = await Promise.all([
    user
      ? supabase.from("community_members").select("role,status").eq("community_id", dbCommunity.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("community_posts")
      .select("id,post_type,body,created_at,author_id")
      .eq("community_id", dbCommunity.id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const isMember = memberships?.status === "active";
  const canJoin = Boolean(user) && dbCommunity.privacy === "public" && ["platform", "topic"].includes(dbCommunity.type) && !isMember;
  const canPost = Boolean(user) && isMember;
  const hasOperationalSystem = ["platform", "topic"].includes(dbCommunity.type);

  return (
    <section className="section community-page">
      <Link className="button secondary" href={`/${locale}/community`}>
        {isAr ? "العودة إلى المجتمعات" : "Back to communities"}
      </Link>

      <div className="eyebrow" style={{ marginTop: 32 }}>{t.eyebrow}</div>
      <h1>{t.name}</h1>
      <p className="section-note">{t.description}</p>

      <div className="community-detail-meta">
        <span>{isAr ? "الحالة" : "Status"}</span>
        <strong>{isMember ? (isAr ? "عضو" : "Member") : user ? (isAr ? "مسجل" : "Signed in") : (isAr ? "زائر" : "Guest")}</strong>
        <span>{isAr ? "الخصوصية" : "Privacy"}</span>
        <strong>{dbCommunity.privacy === "public" ? (isAr ? "عام" : "Public") : dbCommunity.privacy}</strong>
      </div>

      <div className="community-space-grid community-detail-cards">
        {t.details.map((detail, index) => (
          <article className="community-space-card" key={detail}>
            <span className="community-space-index">{String(index + 1).padStart(2, "0")}</span>
            <p>{detail}</p>
          </article>
        ))}
      </div>

      {!user ? (
        <div className="community-access-card">
          <div>
            <div className="eyebrow">{isAr ? "وضع الزائر" : "Guest mode"}</div>
            <h2>{isAr ? "استكشف المعاينة قبل الانضمام." : "Explore the preview before joining."}</h2>
            <p>{isAr ? "يمكنك قراءة المعاينة العامة. الانضمام والمشاركة يحتاجان إلى تسجيل الدخول." : "You can read the public preview. Joining and participation require authentication."}</p>
          </div>
          <AuthTrigger
            locale={locale}
            label={isAr ? "سجّل الدخول للانضمام" : "Sign in to join"}
            mode="signin"
            primary
          />
        </div>
      ) : hasOperationalSystem ? (
        <div className="community-access-card">
          <div>
            <div className="eyebrow">{isMember ? (isAr ? "عضوية فعالة" : "Active membership") : (isAr ? "مجتمع مفتوح" : "Open community")}</div>
            <h2>{isMember ? (isAr ? "أنت داخل المجتمع." : "You are inside this community.") : (isAr ? "انضم إلى المجتمع." : "Join this community.")}</h2>
            <p>{isMember ? (isAr ? "يمكنك المشاركة في المحادثات والمنشورات وفق صلاحيات المجتمع." : "You can participate in community conversations and posts according to community permissions.") : (isAr ? "المجتمعات العامة من نوع المنصة والموضوع مفتوحة للمستخدمين المسجّلين." : "Public platform and topic communities are open to registered users.")}</p>
          </div>
          {canJoin ? (
            <form action={joinCommunityAction}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="locale" value={locale} />
              <button className="button primary" type="submit">{isAr ? "انضمام" : "Join community"}</button>
            </form>
          ) : isMember ? <span className="community-member-state">{isAr ? "عضويتك مفعلة" : "Membership active"}</span> : null}
        </div>
      ) : (
        <div className="community-access-card">
          <div>
            <div className="eyebrow">{isAr ? "معاينة عامة" : "Public preview"}</div>
            <h2>{isAr ? "هذه المساحة لم تُفتح تشغيليًا بعد." : "This space is not operationally open yet."}</h2>
            <p>{isAr ? "قواعد أهلية المجموعات، مساحات المبدعين والنخبة ما زالت قرارات مفتوحة في المواصفة؛ لذلك لا ننشئ عضويات وهمية أو نتجاوز الأهلية." : "Eligibility for user groups, creator spaces and elite spaces remains an open product decision, so no fake membership or access is created."}</p>
          </div>
        </div>
      )}

      {hasOperationalSystem && (
        <section className="community-posts-section">
          <div className="community-posts-head">
            <div>
              <div className="eyebrow">RAVINE / {isAr ? "المنشورات" : "POSTS"}</div>
              <h2>{isAr ? "المحادثة الحية للمجتمع." : "The community conversation."}</h2>
            </div>
            <span className="community-post-count">{String(posts?.length ?? 0).padStart(2, "0")}</span>
          </div>

          {canPost ? (
            <form action={createCommunityPostAction} className="community-post-composer">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="locale" value={locale} />
              <textarea name="body" rows={4} required placeholder={isAr ? "اكتب شيئًا للمجتمع..." : "Write something for the community..."} />
              <button className="button primary" type="submit">{isAr ? "نشر" : "Publish"}</button>
            </form>
          ) : null}

          {!posts?.length ? (
            <div className="empty-state community-empty-state">
              <strong>{isAr ? "لا توجد منشورات بعد." : "No posts yet."}</strong>
              <span>{isMember ? (isAr ? "كن أول من يبدأ المحادثة." : "Be the first to start the conversation.") : (isAr ? "انضم إلى المجتمع للمشاركة في المحادثة." : "Join the community to participate in the conversation.")}</span>
            </div>
          ) : (
            <div className="community-post-list">
              {posts.map((post) => (
                <article className="community-post" key={post.id}>
                  <div className="community-post-topline">
                    <span>{post.post_type.toUpperCase()}</span>
                    <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</time>
                  </div>
                  <p>{post.body}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
