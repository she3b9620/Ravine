import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type Creator = {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialty: string | null;
  followers: number | null;
};

export default async function CreatorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creators")
    .select("id,name,username,avatar_url,bio,specialty,followers")
    .order("followers", { ascending: false, nullsFirst: false })
    .limit(48);

  const creators = (data ?? []) as Creator[];

  return (
    <section className="section creators-page">
      <div className="section-head">
        <div>
          <div className="eyebrow">RAVINE / CREATORS</div>
          <h1>{ar ? "الأشخاص خلف الأعمال." : "The people behind the work."}</h1>
          <p className="section-note">
            {ar
              ? "ملفات إبداعية احترافية، اعتمادات واضحة، وسمعة مبنية على المساهمة الفعلية."
              : "Professional creative identities, visible credits, and reputation built on real contribution."}
          </p>
        </div>
        <Link className="button primary" href={`/${locale}/creator/apply`}>
          {ar ? "قدّم كمبدع" : "Apply as a creator"}
        </Link>
      </div>

      {error ? (
        <div className="empty-state">
          <strong>{ar ? "تعذر تحميل المبدعين." : "We could not load creators."}</strong>
          <span>{error.message}</span>
        </div>
      ) : creators.length === 0 ? (
        <div className="empty-state">
          <strong>{ar ? "لا يوجد مبدعون منشورون بعد." : "No published creators yet."}</strong>
          <span>{ar ? "سيظهر المبدعون المقبولون هنا." : "Approved creators will appear here."}</span>
        </div>
      ) : (
        <div className="video-grid creators-grid">
          {creators.map((creator) => (
            <Link href={`/${locale}/creators/${creator.id}`} className="video-card creator-card" key={creator.id}>
              <div className="video-thumb creator-avatar-wrap">
                <img src={creator.avatar_url || "/RAVINE.png"} alt="" className="creator-avatar" />
              </div>
              <div className="video-meta">
                <div className="video-kicker">{creator.specialty || "CREATOR"}</div>
                <h2>{creator.name}</h2>
                <p>{creator.bio || (ar ? "ملف إبداعي من مجتمع RAVINE." : "A creative identity from the RAVINE community.")}</p>
                <div className="video-stats">
                  <span>@{creator.username || `creator-${creator.id}`}</span>
                  <span>{Number(creator.followers || 0).toLocaleString()} {ar ? "متابع" : "followers"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
