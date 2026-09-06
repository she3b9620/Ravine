"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, UserRound, UserCog, Settings, Library, MessageCircle, Compass, Video, LogOut, ExternalLink, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { westernDigits } from "@/lib/ravine-format";
import { RAVINE_LOGO_MOTION_KEY } from "./RavineLogoMotion";

type Locale="ar"|"en"; type Props={locale:Locale;displayName:string;username:string|null;avatarUrl:string|null;isCreator:boolean};
const CLOSE_MS=200;
export default function AccountMenu({locale,displayName,username,avatarUrl,isCreator}:Props){
 const ar=locale==="ar"; const rootRef=useRef<HTMLDivElement>(null); const [open,setOpen]=useState(false); const [closing,setClosing]=useState(false); const [signingOut,setSigningOut]=useState(false); const [logoMotionEnabled,setLogoMotionEnabled]=useState(true);
 useEffect(()=>{const down=(e:PointerEvent)=>{if(!rootRef.current?.contains(e.target as Node))close()};const key=(e:KeyboardEvent)=>{if(e.key==="Escape")close()};document.addEventListener("pointerdown",down);document.addEventListener("keydown",key);return()=>{document.removeEventListener("pointerdown",down);document.removeEventListener("keydown",key)}},[open,closing]);
 useEffect(()=>{if(typeof window!=="undefined")setLogoMotionEnabled(window.localStorage.getItem(RAVINE_LOGO_MOTION_KEY)!=="off")},[]);
 function close(){if(!open||closing)return;setClosing(true);window.setTimeout(()=>{setOpen(false);setClosing(false)},CLOSE_MS)}
 function toggle(){if(open)close();else{setClosing(false);setOpen(true)}}
 function toggleLogoMotion(){
  const next=!logoMotionEnabled;
  setLogoMotionEnabled(next);
  window.localStorage.setItem(RAVINE_LOGO_MOTION_KEY,next?"on":"off");
  window.dispatchEvent(new CustomEvent("ravine-logo-motion-change",{detail:{enabled:next}}));
 }
 async function signOut(){
  setSigningOut(true);
  const s=createClient();
  const { error } = await s.auth.signOut();
  if (error) { setSigningOut(false); return; }
  setOpen(false);
  setClosing(false);
  window.location.assign(`/${locale}`);
 }
 const safeDisplayName=westernDigits(displayName||""); const safeUsername=username?westernDigits(username):null; const fallback=(safeDisplayName||safeUsername||"R").trim().slice(0,1).toUpperCase();
 const publicHref=safeUsername?`/${locale}/u/${encodeURIComponent(safeUsername)}`:null;
 return <div ref={rootRef} className={`ravine-account-menu${open?" is-open":""}`} dir={ar?"rtl":"ltr"}><button type="button" className="ravine-account-trigger" aria-haspopup="menu" aria-expanded={open&&!closing} onClick={toggle} title={safeDisplayName||(ar?"حسابك":"Your account")}><span className="ravine-account-avatar">{avatarUrl?<img src={avatarUrl} alt=""/>:<span>{fallback}</span>}</span><ChevronDown size={14}/></button>{open||closing?<div className={`ravine-account-panel${closing?" is-closing":""}`} role="menu"><div className="ravine-account-summary"><div className="ravine-account-avatar large">{avatarUrl?<img src={avatarUrl} alt=""/>:<span>{fallback}</span>}</div><div className="ravine-account-summary-copy"><strong>{safeDisplayName||"RAVINE"}</strong><span>{safeUsername?`@${safeUsername}`:(ar?"هوية شخصية":"Personal identity")}</span></div></div><div className="ravine-account-section-label">{ar?"الحساب":"Account"}</div>{publicHref?<Link href={publicHref} onClick={close} role="menuitem"><ExternalLink size={16}/>{ar?"مشاهدة صفحتي":"View my page"}</Link>:null}<Link href={`/${locale}/account`} onClick={close} role="menuitem"><UserRound size={16}/>{ar?"عرض الحساب":"View account"}</Link><Link href={`/${locale}/account/edit`} onClick={close} role="menuitem"><UserCog size={16}/>{ar?"تعديل الملف الشخصي":"Edit profile"}</Link><Link href={`/${locale}/settings`} onClick={close} role="menuitem"><Settings size={16}/>{ar?"الإعدادات العامة":"General settings"}</Link><div className="ravine-account-logo-motion"><div className="ravine-account-section-label">{ar?"الحركة":"Motion"}</div><button type="button" className={`ravine-account-motion-toggle${logoMotionEnabled?" is-on":""}`} onClick={toggleLogoMotion} role="menuitemcheckbox" aria-checked={logoMotionEnabled}><span className="ravine-account-motion-icon"><Sparkles size={15}/></span><span>{ar?"حركة ألوان الشعار":"Logo color motion"}</span><span className="ravine-account-motion-state">{logoMotionEnabled?(ar?"تشغيل":"On"):(ar?"إيقاف":"Off")}</span></button></div><div className="ravine-account-section-label">{ar?"مساحتك":"Your space"}</div><Link href={`/${locale}/library`} onClick={close} role="menuitem"><Library size={16}/>{ar?"المكتبة":"Library"}</Link><Link href={`/${locale}/messages`} onClick={close} role="menuitem"><MessageCircle size={16}/>{ar?"الرسائل":"Messages"}</Link><Link href={`/${locale}/community`} onClick={close} role="menuitem"><MessageCircle size={16}/>{ar?"المجتمعات":"Communities"}</Link><Link href={`/${locale}/discover`} onClick={close} role="menuitem"><Compass size={16}/>{ar?"الاكتشاف":"Discover"}</Link><div className="ravine-account-section-label">{ar?"لوحتك":"Dashboard"}</div><Link href={`/${locale}/dashboard`} onClick={close} role="menuitem"><Video size={16}/>{ar?"لوحة المستخدم":"User dashboard"}</Link>{isCreator?<Link href={`/${locale}/studio`} onClick={close} role="menuitem"><Video size={16}/>{ar?"استوديو المبدع":"Creator Studio"}</Link>:null}<div className="ravine-account-divider"/><button type="button" className="ravine-account-signout" onClick={()=>void signOut()} disabled={signingOut} role="menuitem"><LogOut size={16}/>{signingOut?(ar?"جارٍ الخروج…":"Signing out…"):(ar?"تسجيل الخروج":"Sign out")}</button></div>:null}</div>
}
