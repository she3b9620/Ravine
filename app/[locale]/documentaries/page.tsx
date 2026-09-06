import Link from "next/link";
import { Film } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type Documentary = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  quality: string | null;
  content_type: string | null;
};

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export default async function DocumentariesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/${locale}`);

  const { data, error } = await supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,duration,views,likes,quality,content_type,created_at")
    .eq("published", true)
    .eq("content_type", "documentary")
    .order("created_at", { ascending: false })
    .limit(60);

  const documentaries = (data ?? []) as Documentary[];

  return (
    <section className="section ravine-documentaries-page">
      <div className="ravine-documentaries-hero">
        <div className="ravine-documentaries-mark" aria-hidden="true"><Film size={28} strokeWidth={1.6} /></div>
        <div>
          <div className="eyebrow">{ar ? "رَافِين / الوثائقي" : "RAVINE / DOCUMENTARY"}</div>
          <h1>{ar ? "الوثائقيات." : "Documentaries."}</h1>
          <p className="section-note">{ar ? "قصص طويلة تُمنح الوقت، والسياق، والمساحة التي تستحقها." : "Long-form stories given the time, context, and space they deserve."}</p>
        </div>
      </div>

      {error ? (
        <div className="empty-state"><strong>{ar ? "تعذر تحميل الوثائقيات." : "We could not load documentaries."}</strong><span>{error.message}</span></div>
      ) : documentaries.length === 0 ? (
        <div className="empty-state"><strong>{ar ? "لا توجد وثائقيات منشورة بعد." : "No documentaries published yet."}</strong><span>{ar ? "ستظهر الأعمال الوثائقية هنا عند نشرها." : "Published documentary work will appear here."}</span></div>
      ) : (
        <div className="video-grid ravine-documentaries-grid">
          {documentaries.map((work) => (
            <Link href={`/${locale}/watch/${work.id}`} className="video-card" key={work.id}>
              <div className="video-thumb">
                <img src={work.thumbnail_url || "/RAVINE.png"} alt="" loading="lazy" />
                <span className="duration">{formatDuration(work.duration)}</span>
                <span className="documentary-pill"><Film size={12} />{ar ? "وثائقي" : "Documentary"}</span>
              </div>
              <div className="video-meta">
                <div className="video-kicker">DOCUMENTARY{work.quality ? ` · ${work.quality}` : ""}</div>
                <h2>{work.title || (ar ? "وثائقي بدون عنوان" : "Untitled documentary")}</h2>
                <p>{work.description || (ar ? "عمل وثائقي من مجتمع رَافِين." : "A documentary work from the RAVINE community.")}</p>
                <div className="video-stats">
                  <span>{Number(work.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span>
                  <span>{Number(work.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
