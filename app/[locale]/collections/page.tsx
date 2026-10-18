import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SavedWorksCollection, { type SavedWorkItem } from "@/components/SavedWorksCollection";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type SavedRow = { video_id: number };

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const destination = "/" + locale + "/collections";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/" + locale + "/auth?next=" + encodeURIComponent(destination));
  }

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

  let workItems: SavedWorkItem[] = [];
  let loadError = Boolean(savedError);

  if (!loadError && savedIds.length) {
    const { data: workRows, error: worksError } = await supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,created_at")
      .in("id", savedIds)
      .eq("published", true)
      .eq("visibility", "public");

    loadError = Boolean(worksError);
    const byId = new Map((workRows ?? []).map((work) => [Number(work.id), work]));
    workItems = savedIds
      .map((id) => byId.get(id))
      .filter((work): work is NonNullable<typeof work> => Boolean(work))
      .map((work) => ({
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
      }));
  }

  return (
    <section className="section saved-collection-page" dir={ar ? "rtl" : "ltr"}>
      <div className="eyebrow">RAVINE / {ar ? "مجموعتك" : "YOUR COLLECTION"}</div>
      <div className="section-head">
        <div>
          <h1>{ar ? "أعمال احتفظت بها." : "Work worth keeping."}</h1>
          <p className="section-note">
            {ar
              ? "كل ما حفظته في مكان واحد. رتّب قائمتك وابحث فيها واحذف ما لم تعد بحاجة إليه."
              : "Everything you have saved in one place. Search, sort, and remove work whenever you need."}
          </p>
        </div>
        <Bookmark size={30} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <SavedWorksCollection locale={locale} initialItems={workItems} loadError={loadError} />
    </section>
  );
}
