import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type Profile = { display_name: string | null; username: string | null; avatar_url: string | null; is_creator: boolean | null; is_verified: boolean | null };

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const rawLocale = (await params).locale;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/dashboard`);

  const [{ data: profileData }, { count: savedCount }, { count: historyCount }, { count: followingCount }] = await Promise.all([
    supabase.from("profiles").select("display_name,username,avatar_url,is_creator,is_verified").eq("id", auth.user.id).maybeSingle(),
    supabase.from("video_saves").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
    supabase.from("watch_history").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", auth.user.id),
  ]);

  const profile = profileData as Profile | null;
  const displayName = profile?.display_name || profile?.username || auth.user.email?.split("@")[0] || (ar ? "مستخدم RAVINE" : "RAVINE user");

  const cards = [
    { label: ar ? "المحفوظات" : "Saved", value: savedCount ?? 0, href: `/${locale}/library`, action: ar ? "افتح المكتبة" : "Open library" },
    { label: ar ? "سجل المشاهدة" : "Watch history", value: historyCount ?? 0, href: `/${locale}/library`, action: ar ? "تابع المشاهدة" : "Continue watching" },
    { label: ar ? "المتابَعون" : "Following", value: followingCount ?? 0, href: `/${locale}/creators`, action: ar ? "اكتشف المبدعين" : "Discover creators" },
  ];

  return (
    <section className="section dashboard-page">
      <div className="eyebrow">RAVINE / {ar ? "لوحتك" : "DASHBOARD"}</div>
      <div className="dashboard-hero">
        <div>
          <div className="home-state-kicker">{ar ? "مساحتك" : "YOUR SPACE"}</div>
          <h1>{ar ? `أهلًا ${displayName}.` : `Welcome, ${displayName}.`}</h1>
          <p className="section-note">{ar ? "نظرة سريعة على مكتبتك ومسار اكتشافك وحالتك داخل RAVINE." : "A clear view of your library, discovery path, and current place inside RAVINE."}</p>
        </div>
        <div className="dashboard-profile-chip">
          <span className="ravine-account-avatar large">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{displayName.slice(0, 1).toUpperCase()}</span>}</span>
          <div><strong>{profile?.username ? `@${profile.username}` : (ar ? "هوية شخصية" : "Personal identity")}</strong><span>{profile?.is_creator ? (ar ? "مبدع" : "Creator") : (ar ? "مشاهد" : "Viewer")}{profile?.is_verified ? " · ✓" : ""}</span></div>
        </div>
      </div>

      <div className="dashboard-card-grid">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="dashboard-card">
            <span>{card.label}</span>
            <strong>{Number(card.value).toLocaleString(locale)}</strong>
            <small>{card.action}</small>
          </Link>
        ))}
      </div>

      <div className="dashboard-action-grid">
        <Link className="button primary" href={`/${locale}/discover`}>{ar ? "ابدأ اكتشافًا جديدًا" : "Start a new discovery"}</Link>
        <Link className="button secondary" href={`/${locale}/account`}>{ar ? "إدارة الحساب" : "Manage account"}</Link>
        {profile?.is_creator ? <Link className="button secondary" href={`/${locale}/studio`}>{ar ? "فتح استوديو المبدع" : "Open Creator Studio"}</Link> : null}
      </div>
    </section>
  );
}
