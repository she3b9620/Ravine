import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Compass, Library, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import styles from "./dashboard.module.css";

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
    { label: ar ? "المحفوظات" : "Saved", value: savedCount ?? 0, action: ar ? "افتح المكتبة" : "Open library", href: `/${locale}/library`, icon: Library },
    { label: ar ? "سجل المشاهدة" : "Watch history", value: historyCount ?? 0, action: ar ? "تابع المشاهدة" : "Continue watching", href: `/${locale}/library`, icon: ArrowUpRight },
    { label: ar ? "المتابَعون" : "Following", value: followingCount ?? 0, action: ar ? "اكتشف المبدعين" : "Discover creators", href: `/${locale}/creators`, icon: Compass },
  ];

  return (
    <section className={`section dashboard-page ${styles.page}`} dir={ar ? "rtl" : "ltr"}>
      <div className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>RAVINE / {ar ? "لوحتك" : "DASHBOARD"}</div>
          <div className={styles.kicker}>{ar ? "مساحتك" : "YOUR SPACE"}</div>
          <h1 className={styles.title}>{ar ? `أهلًا ${displayName}.` : `Welcome, ${displayName}.`}</h1>
          <p className={styles.note}>{ar ? "نظرة واضحة على مكتبتك ومسار اكتشافك وحالتك داخل RAVINE." : "A clear view of your library, discovery path, and current place inside RAVINE."}</p>
        </div>
        <div className={styles.profileChip}>
          <span className={styles.avatar}>{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{displayName.slice(0, 1).toUpperCase()}</span>}</span>
          <div className={styles.profileCopy}><strong>{profile?.username ? `@${profile.username}` : (ar ? "هوية شخصية" : "Personal identity")}</strong><span>{profile?.is_creator ? (ar ? "مبدع" : "Creator") : (ar ? "مشاهد" : "Viewer")}{profile?.is_verified ? " · ✓" : ""}</span></div>
        </div>
      </div>

      <div className={styles.cardGrid}>
        {cards.map(({ label, value, action, href, icon: Icon }) => (
          <Link key={label} href={href} className={styles.card}>
            <span className={styles.cardLabel}>{label}</span>
            <strong className={styles.cardValue}>{Number(value).toLocaleString(locale)}</strong>
            <span className={styles.cardAction}>{action} <Icon size={12} /></span>
          </Link>
        ))}
      </div>

      <div className={styles.actions}>
        <Link className={`${styles.button} ${styles.primary}`} href={`/${locale}/discover`}><Compass size={15} />{ar ? "ابدأ اكتشافًا جديدًا" : "Start a new discovery"}</Link>
        <Link className={`${styles.button} ${styles.secondary}`} href={`/${locale}/account`}><Settings2 size={15} />{ar ? "إدارة الحساب والإعدادات" : "Manage account & settings"}</Link>
      </div>
    </section>
  );
}
