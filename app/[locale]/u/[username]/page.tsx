import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Clapperboard, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { westernDigits } from "@/lib/ravine-format";

export const dynamic = "force-dynamic";
type Locale = "ar" | "en";
type Profile = { id:string; display_name:string|null; username:string|null; bio:string|null; avatar_url:string|null; cover_url:string|null; website_url:string|null; country:string|null; is_verified:boolean|null; is_creator:boolean|null; trailer_url:string|null };
type Creator = { id:number; username:string|null; user_id:string|null };
type Work = { id:number; title:string; description:string|null; thumbnail_url:string|null; views:number|null; duration:number|null; content_type:string|null; creator_id:number|null };

export default async function PublicUserPage({params}:{params:Promise<{locale:string;username:string}>}){
  const {locale:rawLocale,username:rawUsername}=await params;
  const locale:Locale=rawLocale==="en"?"en":"ar";
  const ar=locale==="ar";
  const username=decodeURIComponent(rawUsername).replace(/^@/,"").trim();
  if(!username)return notFound();
  const s=await createClient();
  const {data}=await s.from("profiles").select("id,display_name,username,bio,avatar_url,cover_url,website_url,country,is_verified,is_creator,trailer_url").eq("username",username).maybeSingle();
  const profile=data as Profile|null;
  if(!profile)return notFound();

  let works:Work[]=[];
  if(profile.is_creator){
    const {data:creatorData}=await s.from("creators").select("id,username,user_id").eq("user_id",profile.id).maybeSingle();
    const creator=creatorData as Creator|null;
    if(creator){
      const {data:worksData}=await s.from("videos").select("id,title,description,thumbnail_url,views,duration,content_type,creator_id").eq("published",true).eq("creator_id",creator.id).order("created_at",{ascending:false}).limit(12);
      works=(worksData??[]) as Work[];
    }
  }

  const name=westernDigits(profile.display_name||profile.username||"RAVINE user");
  const handle=westernDigits(profile.username||username);
  return <section className="public-profile-page section" dir={ar?"rtl":"ltr"}>
    <header className="public-profile-hero">
      <div className="public-profile-cover">{profile.cover_url?<img src={profile.cover_url} alt=""/>:null}<div className="public-profile-cover-wash"/></div>
      <div className="public-profile-hero-inner">
        <div className="public-profile-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:<span>{name.slice(0,1).toUpperCase()}</span>}</div>
        <div className="public-profile-identity"><div className="public-profile-kicker">RAVINE / {profile.is_creator?(ar?"المبدع":"CREATOR"):(ar?"الملف الشخصي":"PROFILE")}</div><h1>{name}</h1><div className="public-profile-handle">@{handle}{profile.is_verified?<span className="public-profile-verified"><BadgeCheck size={13}/>{ar?"موثق":"Verified"}</span>:null}</div><p>{profile.bio||(profile.is_creator?(ar?"مبدع داخل عالم رَافِين.":"Creator inside the RAVINE world."):(ar?"هذا الملف الشخصي على رَافِين.":"A personal profile on RAVINE."))}</p><div className="public-profile-actions">{profile.is_creator&&profile.trailer_url?<a className="public-profile-button secondary" href={profile.trailer_url} target="_blank" rel="noreferrer"><Clapperboard size={15}/>{ar?"مشاهدة التريلر":"Watch trailer"}</a>:null}<Link className="public-profile-button secondary" href={`/${locale}/account`}><UserRound size={15}/>{ar?"العودة إلى حسابي":"Back to my account"}</Link></div></div>
      </div>
    </header>
    <section className="public-profile-body">
      <div className="public-profile-meta"><span>{ar?"اسم المستخدم":"Username"}</span><strong>@{handle}</strong>{profile.country?<><span>{ar?"البلد":"Country"}</span><strong>{profile.country}</strong></>:null}{profile.website_url?<a href={profile.website_url} target="_blank" rel="noreferrer"><ArrowUpRight size={14}/>{ar?"الموقع الإلكتروني":"Website"}</a>:null}</div>
      {profile.is_creator?<section className="public-profile-work-section"><div className="public-profile-section-head"><div><div className="public-profile-kicker">RAVINE / {ar?"الأعمال":"WORK"}</div><h2>{ar?"مختارات من أعمالي":"Selected work"}</h2></div></div>{works.length?<div className="public-profile-work-grid">{works.map(work=><Link href={`/${locale}/watch/${work.id}`} className="public-profile-work" key={work.id}>{work.thumbnail_url?<img src={work.thumbnail_url} alt="" loading="lazy"/>:<div className="public-profile-work-placeholder"/>}<div><strong>{work.title}</strong><span>{work.content_type||"work"} · {work.views||0} views</span></div></Link>)}</div>:<div className="public-profile-empty">{ar?"لا توجد أعمال منشورة بعد.":"No published work yet."}</div>}</section>:null}
    </section>
  </section>;
}
