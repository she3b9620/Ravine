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
type SortMode = "followers" | "name";
type CreatorDirectoryQuery = {
  tab?: string | string[];
  q?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeCreatorSearch(value: string | undefined) {
  return (value ?? "")
    .trim()
    .slice(0, 100)
    .replace(/[(),%_*"\\]/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

export default async function CreatorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CreatorDirectoryQuery>;
}) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const followingOnly = firstParam(query.tab) === "following";
  const searchQuery = normalizeCreatorSearch(firstParam(query.q));
  const sortMode: SortMode = firstParam(query.sort) === "name" ? "name" : "followers";
  const rawPage = Number(firstParam(query.page));
  const requestedPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = 24;
  let currentPage = 1;
  let pageCount = 1;
  let totalCount = 0;
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
    totalCount = rows.length;
  } else {
    // Search/count the complete directory, then fetch only the clamped page.
    const countQuery = supabase.from("creators").select("id", { count: "exact", head: true });
    if (searchQuery) {
      countQuery.or(
        "name.ilike.%" + searchQuery + "%,username.ilike.%" + searchQuery +
        "%,specialty.ilike.%" + searchQuery + "%,bio.ilike.%" + searchQuery + "%",
      );
    }
    const { count, error: countError } = await countQuery;
    if (countError) {
      errorMessage = countError.message;
    } else {
      totalCount = count ?? 0;
      pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
      currentPage = Math.min(requestedPage, pageCount);

      const pageQuery = supabase
        .from("creators")
        .select("id,name,username,avatar_url,bio,specialty,followers");
      if (searchQuery) {
        pageQuery.or(
          "name.ilike.%" + searchQuery + "%,username.ilike.%" + searchQuery +
          "%,specialty.ilike.%" + searchQuery + "%,bio.ilike.%" + searchQuery + "%",
        );
      }
      const orderedQuery = sortMode === "name"
        ? pageQuery.order("name", { ascending: true, nullsFirst: false }).order("id", { ascending: true })
        : pageQuery.order("followers", { ascending: false, nullsFirst: false }).order("id", { ascending: true });
      const { data, error } = await orderedQuery.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
      if (error) errorMessage = error.message;
      else rows = (data ?? []) as CreatorRow[];
    }
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
        <RAVINECreatorDirectory
          key={followingOnly ? "following" : `all-${searchQuery}-${sortMode}-${currentPage}`}
          locale={locale}
          view={followingOnly ? "following" : "all"}
          creators={items}
          query={followingOnly ? "" : searchQuery}
          sort={followingOnly ? "followers" : sortMode}
          page={currentPage}
          pageCount={followingOnly ? 1 : pageCount}
          totalCount={followingOnly ? items.length : totalCount}
        />
      )}
    </section>
  );
}
