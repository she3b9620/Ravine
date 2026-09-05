import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Edit3, History, LayoutDashboard, Library, Play, Settings2, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { westernDigits, ravineNumber } from "@/lib/ravine-format";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";
type Locale = "ar" | "en";
type Profile = { display_name: string | null; username: string | null; avatar_url: string | null; bio: string | null; is_verified: boolean | null; is_creator: boolean | null; trailer_url: string | null };

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const s = await createClient();
  const { data: auth } = await s.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/account`);

  const [{ data: profileData }, { count: savedCount }, { count: followingCount }, { count: historyCount }] = await Promise.all([
    s.from("profiles").select("display_name,username,avatar_url,bio,is_verified,is_creator,trailer_url").eq("id", auth.user.id).maybeSingle(),
    s.from("video_saves").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
    s.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", auth.user.id),
    s.from("watch_history").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id),
  ]);

  const profile = profileData as Profile | null;
  const name = westernDigits(profile?.display_name || auth.user.email?.split("@")[0] || (ar ? "مستخدم RAVINE" : "RAVINE user"));
  const username = profile?.username ? westernDigits(profile.username) : null;
  const isCreator = Boolean(profile?.is_creator);
  const quickLinks = [
    { href: `/${locale}/library`, label: ar ? "المحفوظات" : "Saved work", sub: ar ? "أعمال اخترت الاحتفاظ بها" : "Work you chose to keep", value: savedCount ?? 0, Icon: Library },
    { href: `/${locale}/history`, label: ar ? "سجل المشاهدة" : "Watch history", sub: ar ? "عد إلى ما شاهدته" : "Return to what you watched", value: historyCount ?? 0, Icon: History },
    { href: `/${locale}/creators`, label: ar ? "المتابَعة" : "Following", sub: ar ? "مبدعون في مسارك" : "Creators in your path", value: followingCount ?? 0, Icon: Users },
  ];

  return (
    <section className={`section account-page ${styles.page}`} dir={ar ? "rtl" : "ltr"}>
      <header className={`${styles.hero} ${isCreator ? styles.creatorHero : ""}`}>
        <div className={styles.heroCopyBlock}>
          <div className={styles.eyebrow}>RAVINE / {ar ? "الحساب" : "ACCOUNT"}</div>
          <div className={styles.identityLine}>
            <div className={styles.avatarLarge}>{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}</div>
            <div><div className={styles.roleKicker}>{isCreator ? (ar ? "هوية مبدع" : "CREATOR IDENTITY") : (ar ? "هوية مشاهد" : "VIEWER IDENTITY")}</div><h1 className={styles.heroTitle}>{name}</h1><div className={styles.handleRow}>{username ? <span>@{username}</span> : null}{profile?.is_verified ? <span className={styles.verified}><BadgeCheck size={13} />{ar ? "موثق" : "Verified"}</span> : null}</div></div>
          </div>
          <p className={styles.heroNote}>{profile?.bio || (isCreator ? (ar ? "مساحة المبدع تبدأ من هويته، ثم تمتد إلى أعماله وجمهوره." : "A creator space begins with identity, then expands into the work and the audience.") : (ar ? "مساحتك في RAVINE تجمع ما تشاهده وتحفظه وتتابعه في مكان واحد." : "Your RAVINE space brings together what you watch, save, and follow."))}</p>
          <div className={styles.heroActions}><Link className={styles.primaryButton} href={`/${locale}/account/edit`}><Edit3 size={15} />{ar ? "تعديل الملف" : "Edit profile"}</Link>{isCreator ? <Link className={styles.secondaryButton} href={`/${locale}/studio`}><Sparkles size={15} />{ar ? "استوديو المبدع" : "Creator Studio"}</Link> : <Link className={styles.secondaryButton} href={`/${locale}/discover`}><ArrowUpRight size={15} />{ar ? "ابدأ اكتشافًا" : "Start discovering"}</Link>}</div>
        </div>
        {isCreator ? <div className={styles.creatorFeatureCard}><div className={styles.creatorFeatureGlow} aria-hidden="true" /><div className={styles.creatorFeatureKicker}>{ar ? "مساحة المبدع" : "CREATOR SPACE"}</div><div className={styles.creatorFeatureTitle}>{ar ? "جمهورك يرى العمل، وأنت ترى المسار." : "Your audience sees the work. You see the path."}</div><div className={styles.creatorFeatureMeta}>{ar ? "هوية، أعمال، جلسات، وتريلر القناة في طبقة واحدة." : "Identity, work, Live, and your channel trailer in one layer."}</div>{profile?.trailer_url ? <a href={profile.trailer_url} target="_blank" rel="noreferrer" className={styles.trailerButton}><Play size={13} fill="currentColor" />{ar ? "مشاهدة التريلر" : "Watch trailer"}</a> : null}</div> : <div className={styles.viewerFeatureCard}><div className={styles.viewerFeatureIcon}><Sparkles size={18} /></div><div className={styles.viewerFeatureKicker}>{ar ? "مساحتك الشخصية" : "YOUR PERSONAL SPACE"}</div><strong>{ar ? "ليست لوحة تحكم جافة. هذه مساحتك." : "Not a dry dashboard. This is your space."}</strong><span>{ar ? "عد إلى الأعمال، السجل، والمبدعين الذين تتابعهم من هنا." : "Return to your work, history, and the creators you follow from here."}</span></div>}
      </header>

      <section className={styles.quickSection}><div className={styles.sectionHeading}><div><div className={styles.eyebrow}>{ar ? "رَافِين / مسارك" : "RAVINE / YOUR PATH"}</div><h2>{ar ? (isCreator ? "حسابك كمبدع" : "حسابك كمشاهد") : (isCreator ? "Your creator account" : "Your viewer account")}</h2></div><Link className={styles.textLink} href={`/${locale}/dashboard`}>{ar ? "لوحتك" : "Your dashboard"} <ArrowUpRight size={14} /></Link></div><div className={styles.quickGrid}>{quickLinks.map(({ href, label, sub, value, Icon }) => <Link className={styles.quickCard} href={href} key={label}><span className={styles.quickIcon}><Icon size={18} /></span><span className={styles.quickCopy}><strong>{label}</strong><small>{sub}</small></span><span className={styles.quickValue}>{ravineNumber(value, locale)}</span></Link>)}</div></section>

      <section className={styles.accountMap}><div className={styles.sectionHeading}><div><div className={styles.eyebrow}>{ar ? "رَافِين / التحكم" : "RAVINE / CONTROL"}</div><h2>{ar ? "وصول سريع بدون خلط بين الحساب والإعدادات." : "Quick access without mixing profile and settings."}</h2></div></div><div className={styles.accountMapGrid}><Link href={`/${locale}/account/edit`} className={styles.mapCard}><span className={styles.mapIndex}>01</span><strong>{ar ? "الملف الشخصي" : "Profile"}</strong><small>{ar ? "الاسم، الصورة، النبذة، وهوية المبدع." : "Name, media, bio, and creator identity."}</small></Link><Link href={`/${locale}/settings`} className={styles.mapCard}><span className={styles.mapIndex}>02</span><strong>{ar ? "الإعدادات العامة" : "General settings"}</strong><small>{ar ? "المظهر واللغة وتفضيلات التجربة." : "Appearance, language, and experience."}</small></Link><Link href={`/${locale}/history`} className={styles.mapCard}><span className={styles.mapIndex}>03</span><strong>{ar ? "السجل" : "History"}</strong><small>{ar ? "آخر الأعمال التي مررت بها داخل RAVINE." : "The latest work you explored inside RAVINE."}</small></Link></div></section>

      <div className={styles.actions}><Link className={styles.actionLink} href={`/${locale}/dashboard`}><LayoutDashboard size={14} />{ar ? "لوحة المستخدم" : "User dashboard"}</Link><Link className={styles.actionLink} href={`/${locale}/library`}><Library size={14} />{ar ? "المكتبة" : "Library"}</Link>{isCreator ? <Link className={styles.actionLink} href={`/${locale}/studio`}><Sparkles size={14} />{ar ? "استوديو المبدع" : "Creator Studio"}</Link> : null}<Link className={styles.actionLink} href={`/${locale}/settings`}><Settings2 size={14} />{ar ? "الإعدادات" : "Settings"}</Link></div>
    </section>
  );
}
