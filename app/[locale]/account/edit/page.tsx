import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Camera, Clapperboard, ExternalLink, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AccountSettings from "@/components/AccountSettings";
import styles from "../account.module.css";

export const dynamic = "force-dynamic";
type Locale = "ar" | "en";
type Profile={display_name:string|null;username:string|null;bio:string|null;avatar_url:string|null;cover_url:string|null;website_url:string|null;country:string|null;language:string|null;is_creator:boolean|null;trailer_url:string|null;timezone:string|null};

export default async function EditAccountPage({params}:{params:Promise<{locale:string}>}){
  const {locale:rawLocale}=await params;
  const locale:Locale=rawLocale==="en"?"en":"ar";
  const ar=locale==="ar";
  const supabase=await createClient();
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)redirect(`/${locale}/auth?next=/${locale}/account/edit`);
  const {data}=await supabase.from("profiles").select("display_name,username,bio,avatar_url,cover_url,country,language,website_url,is_creator,trailer_url,timezone").eq("id",auth.user.id).maybeSingle();
  const profile=data as Profile|null;
  const name=profile?.display_name||profile?.username||auth.user.email?.split("@")[0]||(ar?"مستخدم RAVINE":"RAVINE user");
  const username=profile?.username||"";
  const publicProfileHref=username?`/${locale}/u/${encodeURIComponent(username)}`:null;
  return <section className={`section ${styles.page} ${styles.editPage} account-edit-page`} dir={ar?"rtl":"ltr"}>
    <div className={styles.editHero}>
      <div className={styles.editHeroCopy}>
        <div className={styles.eyebrow}>RAVINE / {ar?"تعديل الهوية":"EDIT IDENTITY"}</div>
        <div className={styles.editHeroKicker}>{ar?"مساحة التشكيل":"IDENTITY WORKSPACE"}</div>
        <h1 className={styles.heroTitle}>{ar?"شكّل حضورك داخل رَافِين.":"Shape your presence in RAVINE."}</h1>
        <p className={styles.heroNote}>{ar?"عدّل الاسم والصور والنبذة ومعلومات الموقع من مساحة واحدة، وشاهد هويتك قبل الحفظ.":"Shape your name, media, bio, and location from one focused workspace, with a live identity preview before you save."}</p>
        <div className={styles.editHeroActions}>
          <a className={styles.editBackLink} href={`/${locale}/account`}>{ar?<ArrowRight size={15}/>:<ArrowLeft size={15}/>}<span>{ar?"العودة إلى الحساب":"Back to account"}</span></a>
          {publicProfileHref?<a className={styles.editPreviewLink} href={publicProfileHref}><ExternalLink size={15}/><span>{ar?"معاينة صفحتي":"Preview my page"}</span></a>:null}
        </div>
      </div>
      <div className={styles.identityPreview}>
        <div className={styles.identityPreviewGlow}/>
        <div className={styles.identityPreviewCover}>{profile?.cover_url?<img src={profile.cover_url} alt=""/>:null}<div className={styles.identityPreviewCoverWash}/></div>
        <div className={styles.identityPreviewBody}>
          <div className={styles.identityPreviewAvatar}>{profile?.avatar_url?<img src={profile.avatar_url} alt=""/>:<span>{name.slice(0,1).toUpperCase()}</span>}<span className={styles.identityPreviewAvatarBadge}><Camera size={11}/></span></div>
          <div className={styles.identityPreviewText}>
            <strong>{name}</strong>
            <span>{username?`@${username}`:"@ravine"}</span>
            <small>
              {profile?.is_creator?(ar?"مبدع RAVINE":"RAVINE Creator"):(ar?"حساب شخصي":"Personal account")}
              {profile?.is_creator&&profile.trailer_url ? <><i/> <Clapperboard size={11}/> {ar?"تريلر جاهز":"Trailer ready"}</> : null}
            </small>
          </div>
        </div>
      </div>
    </div>
    <div className={styles.editorLayout}>
      <aside className={styles.editorRail}>
        <div className={styles.editorRailCard}>
          <span className={styles.editorRailIcon}><UserRound size={16}/></span>
          <div><strong>{ar?"الهوية أولًا":"Identity first"}</strong><p>{ar?"اسمك وصورتك وموقعك كما سيظهرون للناس.":"Your name, image, and location as people will see them."}</p></div>
        </div>
        <div className={styles.editorRailCard}>
          <span className={styles.editorRailIcon}><BadgeCheck size={16}/></span>
          <div><strong>{profile?.is_creator?(ar?"وضع المبدع":"Creator mode"):(ar?"وضع المشاهد":"Viewer mode")}</strong><p>{profile?.is_creator?(ar?"مساحتك تشمل هوية القناة والتريلر.":"Your profile can be upgraded later to a creator identity."):(ar?"يمكنك الترقية لاحقًا إلى مساحة مبدع.":"You can later upgrade into a creator space.")}</p></div>
        </div>
      </aside>
      <div className={styles.editorMain}><AccountSettings profile={profile} locale={locale}/></div>
    </div>
  </section>;
}
