import Link from "next/link";
import { redirect } from "next/navigation";
import { Library } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SavedWorksCollection, { type SavedWorkItem } from "@/components/SavedWorksCollection";
import styles from "./library.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type SavedRow = { video_id: number };

export default async function LibraryPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ locale: rawLocale }, filters] = await Promise.all([params, searchParams]);
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const mode: "saved" | "liked" = filters.tab === "liked" ? "liked" : "saved";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/library" + (mode === "liked" ? "?tab=liked" : "")));

  const table: "video_likes" | "video_saves" = mode === "liked" ? "video_likes" : "video_saves";
  const { data: savedRows, error: savedError } = await supabase
    .from(table)
    .select("video_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const savedIds = Array.from(new Set(
    ((savedRows ?? []) as SavedRow[])
      .map((row) => Number(row.video_id))
      .filter((id) => Number.isSafeInteger(id) && id > 0),
  ));

  let items: SavedWorkItem[] = [];
  let loadError = Boolean(savedError);

  if (!loadError && savedIds.length) {
    const { data: works, error: worksError } = await supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,created_at")
      .in("id", savedIds)
      .eq("published", true)
      .eq("visibility", "public");

    loadError = Boolean(worksError);
    const byId = new Map<number, SavedWorkItem>();
    for (const work of works ?? []) {
      byId.set(Number(work.id), {
        id: Number(work.id),
        title: work.title ?? null,
        description: work.description ?? null,
        thumbnail_url: work.thumbnail_url ?? null,
        duration: work.duration ?? null,
        views: work.views ?? null,
        likes: work.likes ?? null,
        content_type: work.content_type ?? null,
        quality: work.quality ?? null,
        created_at: work.created_at ?? null,
      });
    }
    items = savedIds
      .map((id) => byId.get(id))
      .filter((work): work is SavedWorkItem => work !== undefined);
  }

  return (
    <section className="section library-page" dir={ar ? "rtl" : "ltr"}>
      <div className="eyebrow">RAVINE / {ar ? "المكتبة" : "LIBRARY"}</div>
      <div className="section-head">
        <div>
          <h1>{mode === "liked" ? (ar ? "الأعمال التي أعجبتك." : "Work you liked.") : (ar ? "أعمالك المحفوظة." : "Your saved work.")}</h1>
          <p className="section-note">
            {ar
              ? (mode === "liked" ? "كل الأعمال التي أعجبتك في مكان واحد؛ ابحث فيها ورتّبها وأزل إعجابك متى شئت." : "كل ما اخترت الاحتفاظ به في مكان واحد؛ ابحث، رتّب، أو أزل العمل عندما لا تحتاج إليه.")
              : (mode === "liked" ? "Every work you liked in one place. Search, sort, or remove a like whenever you want." : "Everything you chose to keep in one place. Search, sort, or remove a work when you no longer need it.")}
          </p>
        </div>
        <Library size={28} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <nav className={styles.tabs} aria-label={ar ? "المكتبة والأعمال المعجب بها" : "Library views"}>
        <Link className={mode === "saved" ? styles.activeTab : styles.tab} href={"/" + locale + "/library"} aria-current={mode === "saved" ? "page" : undefined}>
          {ar ? "المحفوظات" : "Saved"}
        </Link>
        <Link className={mode === "liked" ? styles.activeTab : styles.tab} href={"/" + locale + "/library?tab=liked"} aria-current={mode === "liked" ? "page" : undefined}>
          {ar ? "أعجبتني" : "Liked"}
        </Link>
      </nav>
      <SavedWorksCollection locale={locale} mode={mode} initialItems={items} loadError={loadError} />
    </section>
  );
}
