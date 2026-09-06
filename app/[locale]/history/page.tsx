import Link from "next/link";
import { History, PlayCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ravineNumber } from "@/lib/ravine-format";

type Locale = "ar" | "en";
type HistoryRow = { id: number; video_id: number; videos: { id: number; title: string | null; thumbnail_url: string | null; duration: number | null; views: number | null } | null };

export const dynamic = "force-dynamic";

export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const raw = (await params).locale;
  const locale: Locale = raw === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const s = await createClient();
  const { data: auth } = await s.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/history`);

  const { data, error } = await s.from("watch_history").select("id,video_id,videos(id,title,thumbnail_url,duration,views)").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(50);
  const items = (data ?? []) as unknown as HistoryRow[];

  return (
    <section className="section ravine-history-page" dir={ar ? "rtl" : "ltr"}>
      <div className="eyebrow">RAVINE / {ar ? "السجل" : "HISTORY"}</div>
      <h1>{ar ? "الأعمال التي مررت بها." : "The work you've passed through."}</h1>
      <p className="section-note">{ar ? "سجل هادئ يرجّعك بسرعة إلى ما شاهدته داخل رَافِين." : "A quiet trail back to what you watched inside RAVINE."}</p>
      {error ? <div className="empty-state"><strong>{ar ? "تعذر تحميل السجل." : "We could not load your history."}</strong><span>{ar ? "حاول فتح الصفحة مرة أخرى." : "Try opening the page again."}</span></div> : items.length ? (
        <div className="video-grid">
          {items.map((item) => item.videos && (
            <Link className="video-card" href={`/${locale}/watch/${item.videos.id}`} key={item.id}>
              <div className="video-thumb"><img src={item.videos.thumbnail_url || "/RAVINE.PNG"} alt="" /><span className="duration">{item.videos.duration ? `${Math.floor(item.videos.duration / 60)}:${String(Math.round(item.videos.duration % 60)).padStart(2, "0")}` : "—"}</span></div>
              <div className="video-meta"><div className="video-kicker"><History size={11} /> {ar ? "من السجل" : "HISTORY"}</div><h2>{item.videos.title || (ar ? "عمل بدون عنوان" : "Untitled work")}</h2><div className="video-stats"><span>{ravineNumber(item.videos.views, locale)} {ar ? "مشاهدة" : "views"}</span><span><PlayCircle size={12} /> {ar ? "استكمال" : "Continue"}</span></div></div>
            </Link>
          ))}
        </div>
      ) : <div className="empty-state"><strong>{ar ? "السجل لسه فاضي." : "Your history is empty."}</strong><span>{ar ? "ابدأ مشاهدة الأعمال وسيظهر مسارك هنا." : "Start watching work and your trail will appear here."}</span></div>}
    </section>
  );
}
