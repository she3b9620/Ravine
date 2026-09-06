import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type SavedWork = {
  video_id: number;
  videos: {
    id: number;
    title: string | null;
    description: string | null;
    thumbnail_url: string | null;
    duration: number | null;
    views: number | null;
  } | null;
};

export default async function LibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/library`);

  const { data, error } = await supabase
    .from("video_saves")
    .select("video_id,videos(id,title,description,thumbnail_url,duration,views)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  const saved = (data ?? []) as unknown as SavedWork[];

  return (
    <section className="section library-page">
      <div className="eyebrow">RAVINE / LIBRARY</div>
      <h1>{ar ? "أعمالك المحفوظة." : "Your saved work."}</h1>
      <p className="section-note">{ar ? "مساحة هادئة للعودة إلى الأعمال التي اخترتها." : "A quiet space for returning to the work you chose to keep."}</p>
      {error ? (
        <div className="empty-state"><strong>{ar ? "تعذر تحميل مكتبتك." : "We could not load your library."}</strong><span>{error.message}</span></div>
      ) : saved.length === 0 ? (
        <div className="empty-state"><strong>{ar ? "مكتبتك فارغة." : "Your library is empty."}</strong><span>{ar ? "احفظ عملًا من صفحة المشاهدة ليظهر هنا." : "Save a work from its watch page and it will appear here."}</span></div>
      ) : (
        <div className="video-grid">
          {saved.map((item) => item.videos && (
            <Link className="video-card" href={`/${locale}/watch/${item.videos.id}`} key={item.video_id}>
              <div className="video-thumb"><img src={item.videos.thumbnail_url || "/RAVINE.PNG"} alt="" /><span className="duration">{item.videos.duration ? `${Math.floor(item.videos.duration / 60)}:${String(Math.round(item.videos.duration % 60)).padStart(2, "0")}` : "—"}</span></div>
              <div className="video-meta"><div className="video-kicker">WORK</div><h2>{item.videos.title || (ar ? "بدون عنوان" : "Untitled")}</h2><p>{item.videos.description || (ar ? "عمل محفوظ في مكتبتك." : "A work saved to your library.")}</p><div className="video-stats"><span>{Number(item.videos.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span></div></div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
