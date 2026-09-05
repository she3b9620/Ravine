import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BadgeCheck, LayoutDashboard, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AccountSettings from "@/components/AccountSettings";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type Profile = {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  country: string | null;
  is_verified: boolean | null;
  is_creator: boolean | null;
  language: string | null;
  website_url: string | null;
};

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/account`);

  const [{ data: profileData }, { data: roleRows }, { count: savedCount }, { count: followingCount }] = await Promise.all([
    supabase.from("profiles").select("display_name,username,bio,avatar_url,cover_url,country,is_verified,is_creator,language,website_url").eq("id", auth.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
    supabase.from("video_saves").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", auth.user.id),
  ]);

  const profile = profileData as Profile | null;
  const displayName = profile?.display_name || auth.user.email?.split("@")[0] || (ar ? "مستخدم RAVINE" : "RAVINE user");
  const roles = (roleRows ?? []).map((row) => row.role).filter(Boolean);
  const settingsProfile = profile
    ? {
        display_name: profile.display_name,
        username: profile.username,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        cover_url: profile.cover_url,
        country: profile.country,
        language: profile.language,
        website_url: profile.website_url,
      }
    : null;

  return (
    <section className={`section account-page ${styles.page}`} dir={ar ? "rtl" : "ltr"}>
      <div className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>RAVINE / {ar ? "الحساب" : "ACCOUNT"}</div>
          <h1 className={styles.heroTitle}>{ar ? "هويتك داخل رَافِين." : "Your identity inside RAVINE."}</h1>
          <p className={styles.heroNote}>{ar ? "من هنا تدير حضورك ومعلوماتك وصورتك العامة بدون ما تتوه وسط إعدادات مبعثرة." : "A focused workspace for your public identity, profile information, and account controls."}</p>
        </div>
        <div className={styles.profileCard}>
          <div className={styles.avatar}>{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{displayName.slice(0, 1).toUpperCase()}</span>}</div>
          <div className={styles.profileCopy}>
            <strong>{displayName}</strong>
            <span>{profile?.username ? `@${profile.username}` : (ar ? "هوية شخصية" : "Personal identity")}</span>
          </div>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{ar ? "الحالة" : "Status"}</span><strong className={styles.summaryValue}>{profile?.is_creator ? (ar ? "مبدع" : "Creator") : (ar ? "مشاهد" : "Viewer")}</strong><span className={styles.summaryMeta}>{profile?.is_verified ? (ar ? "حساب موثق" : "Verified account") : (ar ? "بانتظار التوثيق" : "Not verified")}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{ar ? "المحفوظات" : "Saved"}</span><strong className={styles.summaryValue}>{Number(savedCount ?? 0).toLocaleString(locale)}</strong><span className={styles.summaryMeta}>{ar ? "أعمال محفوظة في مكتبتك" : "Works in your library"}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{ar ? "المتابَعون" : "Following"}</span><strong className={styles.summaryValue}>{Number(followingCount ?? 0).toLocaleString(locale)}</strong><span className={styles.summaryMeta}>{ar ? "مبدعون في مسارك" : "Creators in your path"}</span></div>
      </div>

      <div className={styles.actions}>
        <Link className={styles.actionLink} href={`/${locale}/dashboard"><LayoutDashboard size={14} />{ar ? "لوحة المستخدم" : "User dashboard"}</Link>
        {profile?.is_creator ? <Link className={styles.actionLink} href={`/${locale}/studio`}><UserRound size={14} />{ar ? "استوديو المبدع" : "Creator Studio"}</Link> : null}
        {profile?.is_verified ? <span className={styles.actionLink}><BadgeCheck size={14} />{ar ? "موثق" : "Verified"}</span> : null}
      </div>

      <AccountSettings profile={settingsProfile} locale={locale} />
    </section>
  );
}
