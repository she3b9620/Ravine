import Link from "next/link";
import { Headphones, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RAVINEEventsCatalog, { type RAVINEEventItem } from "@/components/RAVINEEventsCatalog";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type SpaceRow = {
  id: string;
  host_creator_id: number | null;
  title: string;
  description: string | null;
  space_type: "audio" | "video" | "hybrid" | string;
  format: string;
  status: "scheduled" | "live" | "ended" | string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  recording_session_id: string | null;
  created_at: string;
};
type CreatorRow = { id: number; name: string | null; username: string | null; avatar_url: string | null };

export default async function SpacesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ravine_spaces")
    .select("id,host_creator_id,title,description,space_type,format,status,scheduled_at,started_at,ended_at,recording_session_id,created_at")
    .in("status", ["scheduled", "live", "ended"])
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(100);

  if (error) {
    return (
      <section className="section ravine-spaces-page">
        <div className="eyebrow">RAVINE / SPACES</div>
        <h1>{ar ? "مساحات الحوار." : "Spaces for conversation."}</h1>
        <p className="section-note">{ar ? "جلسات صوتية ومرئية حول الأعمال والأفكار والمجتمع." : "Audio and video sessions around work, ideas, and community."}</p>
        <div className="empty-state">
          <strong>{ar ? "تعذر تحميل جدول المساحات." : "The Spaces schedule is unavailable."}</strong>
          <span>{ar ? "يمكنك استكشاف الأعمال المنشورة حتى يتوفر الجدول." : "Explore published work while the schedule is unavailable."}</span>
          <Link className="button secondary" href={"/" + locale + "/discover"}>{ar ? "اكتشف الأعمال" : "Discover work"}</Link>
        </div>
      </section>
    );
  }

  const spaces = (data ?? []) as SpaceRow[];
  const creatorIds = Array.from(new Set(spaces.map((space) => Number(space.host_creator_id)).filter((id) => Number.isSafeInteger(id) && id > 0)));
  const { data: creatorRows } = creatorIds.length
    ? await supabase.from("creators").select("id,name,username,avatar_url").in("id", creatorIds)
    : { data: [] };
  const creatorsById = new Map<number, CreatorRow>((creatorRows ?? []).map((creator) => [Number(creator.id), creator as CreatorRow] as const));

  const items: RAVINEEventItem[] = spaces.map((space) => {
    const creator = space.host_creator_id ? creatorsById.get(Number(space.host_creator_id)) : null;
    return {
      id: space.id,
      title: space.title,
      description: space.description,
      type: space.format,
      mode: space.space_type,
      status: space.status,
      scheduledAt: space.scheduled_at,
      startedAt: space.started_at,
      endedAt: space.ended_at,
      creatorId: creator?.id ?? null,
      creatorName: creator?.name || creator?.username || (ar ? "مساحة رَافِين" : "RAVINE space"),
      creatorAvatar: creator?.avatar_url ?? null,
      recordingHref: null,
    };
  });

  return (
    <section className="section ravine-spaces-page" dir={ar ? "rtl" : "ltr"}>
      <div className="eyebrow">{ar ? "رَافِين / المساحات" : "RAVINE / SPACES"}</div>
      <div className="ravine-events-heading">
        <div>
          <h1>{ar ? "أفكار تستحق مساحة للحوار." : "Ideas worth making room for."}</h1>
          <p className="section-note">{ar ? "تابع مواعيد جلسات النقاش والمقابلات والحوارات الصوتية والمرئية. الانضمام الحي يتطلب استكمال مزود البث وسياساته." : "Browse scheduled debates, interviews, and audio/video conversations. Live participation remains dependent on the selected provider and its policies."}</p>
        </div>
        <div className="ravine-events-heading-mark" aria-hidden="true"><Headphones size={28} strokeWidth={1.4} /><Users size={18} strokeWidth={1.5} /></div>
      </div>
      <RAVINEEventsCatalog locale={locale} items={items} />
    </section>
  );
}
