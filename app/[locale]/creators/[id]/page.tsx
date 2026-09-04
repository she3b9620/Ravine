import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FollowCreator from "@/components/FollowCreator";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const creatorId = Number(id);
  if (!Number.isInteger(creatorId) || creatorId < 1) notFound();

  const supabase = await createClient();
  const [{ data: creator, error }, { data: works }] = await Promise.all([
    supabase
      .from("creators")
      .select("id,name,username,avatar_url,bio,specialty,followers,user_id")
      .eq("id", creatorId)
      .maybeSingle(),
    supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,creator_id")
      .eq("creator_id", creatorId)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  if (error || !creator) notFound();

  return (
    <section className="section creator-profile-page">
      <div className="creator-profile-head">
        <div className="creator-profile-avatar"><img src={creator.avatar_url || "/RAVINE.png"} alt="" /></div>
        <div>
          <div className="eyebrow">RAVINE / CREATOR</div>
          <h1>{creator.name}</h1>
          <div className="video-kicker">@{creator.username || `creator-${creator.id}`} · {creator.specialty || "CREATOR"}</div>
          <p className="section-note">{creator.bio || (ar ? "هوية إبداعية من مجتمع RAVINE." : "A creative identity from the RAVINE community.")}</p>
          <div className="video-stats">
            <span>{Number(creator.followers || 0).toLocaleString()} {ar ? "متابع" : "followers"}</span>
            <FollowCreator creatorId={creator.id} creatorUserId={creator.user_id} locale={locale} />
            <Link className="button secondary" href={`/${locale}/creators`}>{ar ? "كل المبدعين" : "All creators"}</Link>
          </div>
        </div>
      </div>

      <div className="section-head">
        <div><div className="eyebrow">RAVINE / WORK</div><h2>{ar ? "الأعمال المنشورة" : "Published work"}</h2></div>
      </div>

      {!works?.length ? (
        <div className="empty-state"><strong>{ar ? "لا توجد أعمال منشورة بعد." : "No published work yet."}</strong></div>
      ) : (
        <div className="video-grid">
          {works.map((work) => (
            <Link href={`/${locale}/watch/${work.id}`} className="video-card" key={work.id}>
              <div className="video-thumb"><img src={work.thumbnail_url || "/RAVINE.png"} alt="" /><span className="duration">{work.duration ? `${Math.floor(work.duration / 60)}:${String(Math.round(work.duration % 60)).padStart(2, "0")}` : "—"}</span></div>
              <div className="video-meta"><div className="video-kicker">{work.content_type || "WORK"}{work.quality ? ` · ${work.quality}` : ""}</div><h2>{work.title || (ar ? "بدون عنوان" : "Untitled")}</h2><p>{work.description || (ar ? "عمل إبداعي من هذا المبدع." : "A creative work by this creator.")}</p><div className="video-stats"><span>{Number(work.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span><span>{Number(work.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span></div></div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
