"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, RotateCcw, LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "@/app/[locale]/account/account.module.css";
import RavineMediaPicker from "@/components/RavineMediaPicker";
import RavineSelect from "@/components/RavineSelect";
import { ISO_COUNTRY_CODES, countryLabel, browserTimeZone } from "@/lib/countries";

type Profile={display_name:string|null;username:string|null;bio:string|null;avatar_url:string|null;cover_url:string|null;country:string|null;language:string|null;website_url:string|null;is_creator:boolean|null;trailer_url:string|null;timezone:string|null};
type Props={profile:Profile|null;locale:"ar"|"en"};

export default function AccountSettings({profile,locale}:Props){
  const ar=locale==="ar",router=useRouter();
  const [displayName,setDisplayName]=useState(profile?.display_name||"");
  const [username,setUsername]=useState(profile?.username||"");
  const [bio,setBio]=useState(profile?.bio||"");
  const [country,setCountry]=useState(profile?.country||"");
  const [language,setLanguage]=useState(profile?.language==="en"?"en":"ar");
  const [website,setWebsite]=useState(profile?.website_url||"");
  const [trailer,setTrailer]=useState(profile?.trailer_url||"");
  const [timezone,setTimezone]=useState(profile?.timezone||"");
  const [avatar,setAvatar]=useState<File|null>(null);
  const [cover,setCover]=useState<File|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");

  const timezones=useMemo(()=>{
    if(typeof Intl==="undefined"||!("supportedValuesOf" in Intl)) return [timezone||"UTC"];
    const values=Intl.supportedValuesOf("timeZone");
    const current=timezone||"";
    return current && !values.includes(current) ? [current,...values] : values;
  },[timezone]);

  useEffect(()=>{if(!timezone&&typeof window!=="undefined")setTimezone(browserTimeZone())},[timezone]);

  async function uploadAsset(userId:string,bucket:"avatars"|"covers",file:File){const s=createClient(),path=`${userId}/${crypto.randomUUID()}.webp`,{error}=await s.storage.from(bucket).upload(path,file,{cacheControl:"3600",upsert:false,contentType:"image/webp"});if(error)throw error;return{url:s.storage.from(bucket).getPublicUrl(path).data.publicUrl,path}}
  function cancelChanges(){if(busy)return;setDisplayName(profile?.display_name||"");setUsername(profile?.username||"");setBio(profile?.bio||"");setCountry(profile?.country||"");setLanguage(profile?.language==="en"?"en":"ar");setWebsite(profile?.website_url||"");setTrailer(profile?.trailer_url||"");setTimezone(profile?.timezone||"");setAvatar(null);setCover(null);setMessage("");setError("")}
  async function save(){setBusy(true);setError("");setMessage("");const s=createClient(),{data:auth}=await s.auth.getUser();if(!auth.user){setError(ar?"يجب تسجيل الدخول أولًا.":"You must be signed in first.");setBusy(false);return}const uploaded:Array<{bucket:"avatars"|"covers";path:string}>=[];try{let avatarUrl=profile?.avatar_url||null,coverUrl=profile?.cover_url||null;if(avatar){const u=await uploadAsset(auth.user.id,"avatars",avatar);avatarUrl=u.url;uploaded.push({bucket:"avatars",path:u.path})}if(cover){const u=await uploadAsset(auth.user.id,"covers",cover);coverUrl=u.url;uploaded.push({bucket:"covers",path:u.path})}const patch={display_name:displayName.trim()||null,username:username.trim().replace(/^@+/ ,"")||null,bio:bio.trim()||null,country:country||null,language:language as "ar"|"en",website_url:website.trim()||null,avatar_url:avatarUrl,cover_url:coverUrl,timezone:timezone||browserTimeZone(),trailer_url:profile?.is_creator?trailer.trim()||null:null};const{error:updateError}=await s.from("profiles").update(patch).eq("id",auth.user.id);if(updateError)throw updateError;setAvatar(null);setCover(null);setMessage(ar?"تم حفظ هوية الحساب وموقعه الزمني.":"Identity and location settings saved.");router.refresh()}catch(e){for(const item of uploaded)await s.storage.from(item.bucket).remove([item.path]);setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
  return <div className={styles.settingsShell}>
    <div className={styles.settingsHead}><div><div className={styles.sectionLabel}>{ar?"إعدادات الهوية":"Identity settings"}</div><h2 className={styles.settingsTitle}>{ar?"كل تفاصيل حضورك، في مكان واحد.":"Everything that shapes your presence, in one place."}</h2><p className={styles.settingsNote}>{ar?"الهوية والصور والنبذة والبلد والمنطقة الزمنية، مع معاينة الحساب قبل مغادرة الصفحة.":"Identity, media, bio, country, and time zone — organized without turning your profile into a data sheet."}</p></div><a className={styles.actionLink} href={`/${locale}/account`}><span>{ar?"عرض الحساب":"View account"}</span><ArrowUpRight size={14}/></a></div>
    <section className={styles.sectionBlock}><h3 className={styles.sectionLabel}>{ar?"الهوية":"Identity"}</h3><div className={styles.formGrid}>
      <label className={styles.field}><span>{ar?"الاسم الظاهر":"Display name"}</span><input className={styles.input} value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label>
      <label className={styles.field}><span>{ar?"اسم المستخدم":"Username"}</span><input className={styles.input} value={username} onChange={e=>setUsername(e.target.value)}/></label>
      <label className={`${styles.field} ${styles.fieldWide}`}><span>{ar?"البلد":"Country"}</span><RavineSelect value={country} options={[{value:"",label:ar?"اختر بلدك":"Choose your country"},...ISO_COUNTRY_CODES.map(code=>({value:code,label:countryLabel(code,locale)}))]} onChange={setCountry} ariaLabel={ar?"البلد":"Country"} className="account-country-select"/></label>
      <div className={styles.field}><span>{ar?"المنطقة الزمنية":"Time zone"}</span><RavineSelect value={timezone} options={timezones.map(zone=>({value:zone,label:zone}))} onChange={setTimezone} ariaLabel={ar?"المنطقة الزمنية":"Time zone"} className="account-timezone-select"/></div>
      <div className={styles.field}><span>{ar?"لغة الحساب":"Account language"}</span><RavineSelect value={language} options={[{value:"ar",label:"العربية"},{value:"en",label:"English"}]} onChange={setLanguage} ariaLabel={ar?"لغة الحساب":"Account language"} className="account-language-select"/></div>
      <div className={styles.locationHint}><LocateFixed size={15}/><span>{ar?`الوقت المحلي سيُبنى على ${timezone||"منطقتك الزمنية"}، بينما البلد يحدد هويتك وموقعك العام.`:`Local time follows ${timezone||"your time zone"}; country provides your public location context.`}</span></div>
    </div></section>
    <section className={styles.sectionBlock}><h3 className={styles.sectionLabel}>{ar?"التعريف":"Profile"}</h3><div className={styles.formGrid}><label className={`${styles.field} ${styles.fieldWide}`}><span>{ar?"نبذة عنك":"Bio"}</span><textarea className={styles.textarea} value={bio} onChange={e=>setBio(e.target.value)} rows={5} placeholder={ar?"عرّف الناس بك وبما تصنعه...":"Tell people who you are and what you create..."}/></label><label className={`${styles.field} ${styles.fieldWide}`}><span>{ar?"الموقع الإلكتروني":"Website"}</span><input className={styles.input} value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://"/></label></div></section>
    {profile?.is_creator?<section className={styles.sectionBlock}><h3 className={styles.sectionLabel}>{ar?"هوية المبدع":"Creator identity"}</h3><div className={styles.formGrid}><label className={`${styles.field} ${styles.fieldWide}`}><span>{ar?"تريلر القناة":"Channel trailer"}</span><input className={styles.input} value={trailer} onChange={e=>setTrailer(e.target.value)} placeholder={ar?"رابط تريلر القناة على YouTube أو Vimeo":"YouTube or Vimeo trailer URL"}/><small className={styles.help}>{ar?"يظهر للزوار كفيديو تعريفي مختصر بقناتك.":"Shown to visitors as a short introduction to your channel."}</small></label></div></section>:null}
    <section className={styles.sectionBlock}><h3 className={styles.sectionLabel}>{ar?"الصور":"Media"}</h3><div className={styles.mediaGrid}><RavineMediaPicker aspect="square" locale={locale} existingUrl={profile?.avatar_url} value={avatar} onChange={setAvatar}/><RavineMediaPicker aspect="cover" locale={locale} existingUrl={profile?.cover_url} value={cover} onChange={setCover}/></div></section>
    {error?<div className={styles.feedback}><strong>{ar?"تعذر التنفيذ":"Action failed"}</strong><span>{error}</span></div>:null}{message?<div className={styles.feedback}><strong>{ar?"تم الحفظ":"Saved"}</strong><span>{message}</span></div>:null}
    <div className={styles.actions}><a className={styles.actionLink} href={`/${locale}/account`}><span>{ar?"عرض الحساب":"View account"}</span><ArrowUpRight size={14}/></a><div className={styles.actionsRight}><button className={`${styles.button} ${styles.secondaryButton}`} type="button" onClick={cancelChanges} disabled={busy}><RotateCcw size={14}/><span>{ar?"إلغاء التعديلات":"Discard changes"}</span></button><button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={save} disabled={busy}>{busy?(ar?"جارٍ الحفظ…":"Saving…"):(ar?"حفظ التغييرات":"Save changes")}</button></div></div>
  </div>
}
