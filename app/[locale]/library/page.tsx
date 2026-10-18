import { redirect } from "next/navigation";
import { Library } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SavedWorksCollection, { type SavedWorkItem } from "@/components/SavedWorksCollection";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type SavedRow = { video_id: number };

export default async function LibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/library"));

  const { data: savedRows, error: savedError } = await supabase
    .from("video_saves")
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
          <h1>{ar ? "أعمالك المحفوظة." : "Your saved work."}</h1>
          <p className="section-note">
            {ar
              ? "كل ما اخترت الاحتفاظ به في مكان واحد؛ ابحث، رتّب، أو أزل العمل عندما لا تحتاج إليه."
              : "Everything you chose to keep in one place. Search, sort, or remove a work when you no longer need it."}
          </p>
        </div>
        <Library size={28} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <SavedWorksCollection locale={locale} initialItems={items} loadError={loadError} />
    </section>
  );
}
