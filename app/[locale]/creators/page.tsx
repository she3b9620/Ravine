import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RAVINECreatorDirectory, { type RAVINECreatorDirectoryItem } from "@/components/RAVINECreatorDirectory";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type CreatorRow = {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialty: string | null;
  followers: number | null;
};
type FollowRow = { creator_id: number };

export default async function CreatorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const followingOnly = query.tab === "following";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (followingOnly && !auth.user) {
    redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/creators?tab=following"));
  }

  let rows: CreatorRow[] = [];
  let errorMessage = "";

  if (followingOnly && auth.user) {
    const { data: follows, error: followsError } = await supabase
      .from("follows")
      .select("creator_id")
      .eq("follower_id", auth.user.id)
      .limit(200);

    if (followsError) {
      errorMessage = followsError.message;
    } else {
      const ids = Array.from(new Set(
        ((follows ?? []) as FollowRow[])
          .map((row) => Number(row.creator_id))
          .filter((id) => Number.isSafeInteger(id) && id > 0),
      ));
      if (ids.length) {
        const { data, error } = await supabase
          .from("creators")
          .select("id,name,username,avatar_url,bio,specialty,followers")
          .in("id", ids)
          .limit(200);
        if (error) errorMessage = error.message;
        else {
          const byId = new Map<number, CreatorRow>((data ?? []).map((creator) => [Number(creator.id), creator as CreatorRow]));
          rows = ids.map((id) => byId.get(id)).filter((creator): creator is CreatorRow => Boolean(creator));
        }
      }
    }
  } else {
    const { data, error } = await supabase
      .from("creators")
      .select("id,name,username,avatar_url,bio,specialty,followers")
      .order("followers", { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) errorMessage = error.message;
    else rows = (data ?? []) as CreatorRow[];
  }

  const items: RAVINECreatorDirectoryItem[] = rows.map((creator) => ({
    id: Number(creator.id),
    name: creator.name || (ar ? "مبدع رَافِين" : "RAVINE creator"),
    username: creator.username,
    avatarUrl: creator.avatar_url,
    bio: creator.bio,
    specialty: creator.specialty,
    followers: Number(creator.followers || 0),
  }));

  return (
    <section className="section creators-page" dir={ar ? "rtl" : "ltr"}>
      <div className="section-head">
        <div>
          <div className="eyebrow">RAVINE / CREATORS</div>
          <h1>{followingOnly ? (ar ? "المبدعون الذين تتابعهم." : "Creators you follow.") : (ar ? "الأشخاص خلف الأعمال." : "The people behind the work.")}</h1>
          <p className="section-note">
            {followingOnly
              ? (ar ? "مسارك الإبداعي، بعيدًا عن ضجيج الترتيب العام." : "Your personal creative path, separate from the noise of the public directory.")
              : (ar ? "ملفات إبداعية احترافية، اعتمادات واضحة، وسمعة مبنية على المساهمة الفعلية." : "Professional creative identities, visible credits, and reputation built on real contribution.")}
          </p>
        </div>
        <Link className="button primary" href={"/" + locale + "/creator/apply"}>
          {ar ? "قدّم كمبدع" : "Apply as a creator"}
        </Link>
      </div>

      <nav className="creator-directory-tabs" aria-label={ar ? "عرض المبدعين" : "Creator views"}>
        <Link className={"button " + (!followingOnly ? "primary" : "secondary")} href={"/" + locale + "/creators"} aria-current={!followingOnly ? "page" : undefined}>
          {ar ? "كل المبدعين" : "All creators"}
        </Link>
        <Link className={"button " + (followingOnly ? "primary" : "secondary")} href={"/" + locale + "/creators?tab=following"} aria-current={followingOnly ? "page" : undefined}>
          {ar ? "تتابعهم" : "Following"}
        </Link>
      </nav>

      {errorMessage ? (
        <div className="empty-state">
          <strong>{ar ? "تعذر تحميل المبدعين." : "We could not load creators."}</strong>
          <span>{ar ? "تحقق من اتصالك ثم حاول مجددًا." : "Check your connection and try again."}</span>
        </div>
      ) : (
        <RAVINECreatorDirectory locale={locale} view={followingOnly ? "following" : "all"} creators={items} />
      )}
    </section>
  );
}
