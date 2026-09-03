"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowUpRight, Globe2, Instagram, Link2, Save, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  website_url: string | null;
  country: string | null;
  specialty: string | null;
  is_verified: boolean | null;
  is_creator: boolean | null;
};

export default function StudioProfilePage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!userData.user) { window.location.href = `/${locale}/auth?next=/${locale}/studio/profile`; return; }
      const { data, error: loadError } = await supabase.from("profiles").select("id,display_name,username,bio,avatar_url,cover_url,website_url,country,specialty,is_verified,is_creator").eq("id", userData.user.id).maybeSingle();
      if (!mounted) return;
      if (loadError) setError(loadError.message);
      if (data) {
        setProfile(data);
        setName(data.display_name ?? ""); setUsername(data.username ?? ""); setBio(data.bio ?? ""); setWebsite(data.website_url ?? ""); setCountry(data.country ?? ""); setSpecialty(data.specialty ?? "");
      }
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [locale, supabase]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    const cleanUsername = username.trim().replace(/^@+/, "").replace(/\s+/g, "-").toLowerCase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { window.location.href = `/${locale}/auth?next=/${locale}/studio/profile`; return; }
    const { data, error: saveError } = await supabase.from("profiles").update({ display_name: name.trim() || null, username: cleanUsername || null, bio: bio.trim() || null, website_url: website.trim() || null, country: country.trim() || null, specialty: specialty.trim() || null }).eq("id", userData.user.id).select("id,display_name,username,bio,avatar_url,cover_url,website_url,country,specialty,is_verified,is_creator").maybeSingle();
    if (saveError) setError(saveError.message); else { setProfile(data ?? profile); setUsername(cleanUsername); setMessage(isArabic ? "تم حفظ الهوية." : "Identity saved."); }
    setSaving(false);
  }

  return (
    <PlatformShell active="creators" eyebrow="RAVINE Studio" title={isArabic ? "الهوية المهنية" : "Professional identity"} description={isArabic ? "اضبط الواجهة التي يراك بها مجتمع RAVINE." : "Shape the identity the RAVINE community sees when it meets your work."}>
      <div className="mx-auto max-w-[1200px] space-y-6 px-5 pb-16 pt-8 md:px-8 lg:px-10">
        {loading ? <div className="space-y-4"><div className="h-40 animate-pulse rounded-[32px]" style={{background:"rgba(241,233,220,.035)"}}/><div className="h-96 animate-pulse rounded-[32px]" style={{background:"rgba(241,233,220,.035)"}}/></div> : (
          <>
            <section className="rounded-[32px] border p-6 md:p-8" style={{borderColor:"rgba(241,233,220,.10)",background:"linear-gradient(145deg,rgba(24,63,70,.23),rgba(21,23,25,.82))"}}>
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl" style={{background:"rgba(241,233,220,.06)"}}>{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover"/> : <UserRound size={26} style={{color:"rgba(241,233,220,.38)"}}/>}</div><div><p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{color:"#C47A52"}}>RAVINE PROFILE</p><h2 className="mt-2 text-2xl font-black">{name || username || (isArabic ? "مبدع RAVINE" : "RAVINE creator")}</h2><p className="mt-1 text-sm" style={{color:"rgba(241,233,220,.48)"}}>@{username.replace(/^@+/,"") || "username"}</p></div></div>
                <a href={username ? `/${locale}/creator/${username.replace(/^@+/,"")}` : `/${locale}/creator`} className="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-bold" style={{borderColor:"rgba(241,233,220,.12)",color:"#F1E9DC"}}>{isArabic ? "معاينة الملف العام" : "Preview public profile"}<ArrowUpRight size={15}/></a>
              </div>
            </section>

            <form onSubmit={save} className="rounded-[32px] border p-6 md:p-8" style={{borderColor:"rgba(241,233,220,.10)",background:"rgba(21,23,25,.74)"}}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-sm font-medium">{isArabic ? "الاسم الظاهر" : "Display name"}<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{borderColor:"rgba(241,233,220,.08)",background:"#090909"}} /></label>
                <label className="block text-sm font-medium">{isArabic ? "اسم المستخدم" : "Username"}<input value={username} onChange={e=>setUsername(e.target.value)} maxLength={40} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{borderColor:"rgba(241,233,220,.08)",background:"#090909"}} placeholder="your-name" /></label>
                <label className="block text-sm font-medium md:col-span-2">{isArabic ? "النبذة" : "Bio"}<textarea value={bio} onChange={e=>setBio(e.target.value)} rows={5} maxLength={500} className="mt-2 w-full resize-y rounded-2xl border px-4 py-3 outline-none" style={{borderColor:"rgba(241,233,220,.08)",background:"#090909"}} /></label>
                <label className="block text-sm font-medium">{isArabic ? "التخصص" : "Specialty"}<input value={specialty} onChange={e=>setSpecialty(e.target.value)} maxLength={100} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{borderColor:"rgba(241,233,220,.08)",background:"#090909"}} placeholder={isArabic ? "مخرج / مونتير / مصور" : "Director / Editor / Photographer"} /></label>
                <label className="block text-sm font-medium">{isArabic ? "الدولة" : "Country"}<input value={country} onChange={e=>setCountry(e.target.value)} maxLength={80} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{borderColor:"rgba(241,233,220,.08)",background:"#090909"}} /></label>
                <label className="block text-sm font-medium md:col-span-2"><span className="flex items-center gap-2"><Globe2 size={15} style={{color:"#C47A52"}}/>{isArabic ? "الموقع الإلكتروني" : "Website"}</span><input value={website} onChange={e=>setWebsite(e.target.value)} maxLength={300} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{borderColor:"rgba(241,233,220,.08)",background:"#090909"}} placeholder="https://" /></label>
              </div>
              <div className="mt-6 flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between" style={{background:"rgba(24,63,70,.10)"}}><div className="flex items-start gap-3"><Link2 size={17} className="mt-0.5 shrink-0" style={{color:"#C47A52"}}/><p className="text-xs leading-6" style={{color:"rgba(241,233,220,.48)"}}>{isArabic ? "الصورة والغلاف والروابط الاجتماعية ستدخل في طبقة الهوية التالية." : "Avatar, cover and social links are staged for the next identity layer."}</p></div><button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold disabled:opacity-50" style={{background:"#C47A52",color:"#090909"}}><Save size={15}/>{saving ? (isArabic ? "جارٍ الحفظ" : "Saving") : (isArabic ? "حفظ الهوية" : "Save identity")}</button></div>
              {message && <div className="mt-4 rounded-2xl border p-4 text-sm" style={{borderColor:"rgba(24,63,70,.7)",background:"rgba(24,63,70,.16)"}}>{message}</div>}
              {error && <div className="mt-4 rounded-2xl border p-4 text-sm" style={{borderColor:"rgba(196,122,82,.30)",background:"rgba(196,122,82,.08)"}}>{isArabic ? "تعذر حفظ التعديلات." : "Could not save your changes."}</div>}
            </form>
            <section className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border p-5" style={{borderColor:"rgba(241,233,220,.08)",background:"rgba(21,23,25,.68)"}}><Instagram size={17} style={{color:"#C47A52"}}/><h3 className="mt-3 text-sm font-bold">{isArabic ? "الروابط الاجتماعية" : "Social links"}</h3><p className="mt-1 text-xs" style={{color:"rgba(241,233,220,.4)"}}>{isArabic ? "قريبًا" : "Next layer"}</p></div><div className="rounded-2xl border p-5" style={{borderColor:"rgba(241,233,220,.08)",background:"rgba(21,23,25,.68)"}}><UserRound size={17} style={{color:"#C47A52"}}/><h3 className="mt-3 text-sm font-bold">{isArabic ? "الصورة الشخصية" : "Avatar"}</h3><p className="mt-1 text-xs" style={{color:"rgba(241,233,220,.4)"}}>{isArabic ? "تطوير قادم" : "Upgrade next"}</p></div><div className="rounded-2xl border p-5" style={{borderColor:"rgba(241,233,220,.08)",background:"rgba(21,23,25,.68)"}}><Globe2 size={17} style={{color:"#C47A52"}}/><h3 className="mt-3 text-sm font-bold">{isArabic ? "الظهور العام" : "Public presence"}</h3><p className="mt-1 text-xs" style={{color:"rgba(241,233,220,.4)"}}>{profile?.is_verified ? (isArabic ? "موثق" : "Verified") : (isArabic ? "غير موثق حاليًا" : "Not verified yet")}</p></div></section>
          </>
        )}
      </div>
    </PlatformShell>
  );
}
