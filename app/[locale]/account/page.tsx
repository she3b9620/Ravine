import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, LayoutDashboard, Settings2, UserRound, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type Profile = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  is_creator: boolean | null;
};

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/account`);

  const [{ data: profileData }, { count: savedCount }, { count: followingCount }] = await Promise.all([
    supabase.from("profiles").select("display_name,username,avatar_url,is_verified,is_creator").eq("id", auth.user.id).maybeSingle(),
    supabase.from("video_saves").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", auth.user.id),
  ]);

  const profile = profileData as Profile | null;
  const displayName = profile?.display_name || auth.user.email?.split("@")[0] || (ar ? "مستخدم RAVINE" : "RAVINE user");

  return (
    <section className={`section account-page ${styles.page}`} dir={ar ? "rtl" : "ltr"}>
      <div className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>RAVINE / {ar ? "الحساب" : "ACCOUNT"}</div>
          <h1 className={styles.heroTitle}>{ar ? "حسابك داخل رَافِين." : "Your RAVINE account."}</h1>
          <p className={styles.heroNote}>{ar ? "مساحة مختصرة لهويتك وحالتك ومسارك، بينما تعديل الملف والإعدادات العامة لهما مساحاتهما المنفصلة." : "A focused view of your identity and activity, with profile editing and general preferences kept separate."}</p>
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
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{ar ? "الحالة" : "Status"}</span><strong className={styles.summaryValue}>{profile?.is_creator ? (ar ? "مبدع" : "Creator") : (ar ? "مشاهد" : "Viewer")}</strong><span className={styles.summaryMeta}>{profile?.is_verified ? (ar ? "حساب موثق" : "Verified account") : (ar ? "غير موثق" : "Not verified")}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{ar ? "المحفوظات" : "Saved"}</span><strong className={styles.summaryValue}>{Number(savedCount ?? 0).toLocaleString(locale)}</strong><span className={styles.summaryMeta}>{ar ? "أعمال في مكتبتك" : "Works in your library"}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{ar ? "المتابَعون" : "Following"}</span><strong className={styles.summaryValue}>{Number(followingCount ?? 0).toLocaleString(locale)}</strong><span className={styles.summaryMeta}>{ar ? "مبدعون في مسارك" : "Creators in your path"}</span></div>
      </div>

      <div className={styles.accountActionGrid}>
        <Link className={styles.accountActionCard} href={`/${locale}/account`}>
          <span className={styles.accountActionIcon}><UserRound size={18} /></span>
          <span><strong>{ar ? "الحساب" : "Account"}</strong><small>{ar ? "عرض هويتك وحالتك ومسارك" : "View your identity, status, and activity"}</small></span>
        </Link>
        <Link className={styles.accountActionCard} href={`/${locale}/account/edit`}>
          <span className={styles.accountActionIcon}><UserCog size={18} /></span>
          <span><strong>{ar ? "تعديل الملف الشخصي" : "Edit profile"}</strong><small>{ar ? "الاسم والنبذة والصورة والغلاف" : "Name, bio, avatar, and cinematic cover"}</small></span>
        </Link>
        <Link className={styles.accountActionCard} href={`/${locale}/settings`}>
          <span className={styles.accountActionIcon}><Settings2 size={18} /></span>
          <span><strong>{ar ? "الإعدادات العامة" : "General settings"}</strong><small>{ar ? "المظهر واللغة وتفضيلات التجربة" : "Appearance, language, and experience preferences"}</small></span>
        </Link>
      </div>

      <div className={styles.actions}>
        <Link className={styles.actionLink} href={`/${locale}/dashboard`}><LayoutDashboard size={14} />{ar ? "لوحة المستخدم" : "User dashboard"}</Link>
        {profile?.is_creator ? <Link className={styles.actionLink} href={`/${locale}/studio`}><UserRound size={14} />{ar ? "استوديو المبدع" : "Creator Studio"}</Link> : null}
        {profile?.is_verified ? <span className={styles.actionLink}><BadgeCheck size={14} />{ar ? "موثق" : "Verified"}</span> : null}
      </div>
    </section>
  );
}
