"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  country: string | null;
  language: string | null;
  website_url: string | null;
};

type Props = {
  profile: Profile | null;
  locale: "ar" | "en";
};

export default function AccountSettings({ profile, locale }: Props) {
  const ar = locale === "ar";
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [language, setLanguage] = useState(profile?.language === "en" ? "en" : "ar");
  const [website, setWebsite] = useState(profile?.website_url || "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function uploadAsset(userId: string, bucket: "avatars" | "covers", file: File) {
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError(ar ? "يجب تسجيل الدخول أولًا." : "You must be signed in first.");
      setBusy(false);
      return;
    }

    const uploadedPaths: Array<{ bucket: "avatars" | "covers"; path: string }> = [];

    try {
      let avatarUrl = profile?.avatar_url || null;
      let coverUrl: string | null = null;

      if (avatar) {
        avatarUrl = await uploadAsset(auth.user.id, "avatars", avatar);
        uploadedPaths.push({ bucket: "avatars", path: new URL(avatarUrl).pathname.split("/storage/v1/object/public/avatars/")[1] || "" });
      }
      if (cover) {
        coverUrl = await uploadAsset(auth.user.id, "covers", cover);
        uploadedPaths.push({ bucket: "covers", path: new URL(coverUrl).pathname.split("/storage/v1/object/public/covers/")[1] || "" });
      }

      const patch: Record<string, string | null> = {
        display_name: displayName.trim() || null,
        username: username.trim().replace(/^@+/, "") || null,
        bio: bio.trim() || null,
        country: country.trim() || null,
        language,
        website_url: website.trim() || null,
      };
      if (avatar) patch.avatar_url = avatarUrl;
      if (cover) patch.cover_url = coverUrl;

      const { error: updateError } = await supabase.from("profiles").update(patch).eq("id", auth.user.id);
      if (updateError) throw updateError;

      setAvatar(null);
      setCover(null);
      setMessage(ar ? "تم حفظ بيانات الحساب." : "Account details saved.");
      router.refresh();
    } catch (saveError) {
      for (const item of uploadedPaths) {
        if (item.path) await supabase.storage.from(item.bucket).remove([item.path]);
      }
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace(`/${locale}`);
    router.refresh();
  }

  return (
    <div className="account-settings">
      <div className="section-head">
        <div>
          <div className="eyebrow">RAVINE / SETTINGS</div>
          <h2>{ar ? "إدارة الهوية والحساب" : "Manage identity and account"}</h2>
          <p className="section-note">{ar ? "حافظ على هويتك كما تريد أن يراها مجتمع RAVINE." : "Shape the identity you present to the RAVINE community."}</p>
        </div>
      </div>

      <div className="studio-form-grid">
        <label><span>{ar ? "الاسم الظاهر" : "Display name"}</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
        <label><span>{ar ? "اسم المستخدم" : "Username"}</span><input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label><span>{ar ? "البلد" : "Country"}</span><input value={country} onChange={(event) => setCountry(event.target.value)} /></label>
        <label><span>{ar ? "اللغة" : "Language"}</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="ar">العربية</option><option value="en">English</option></select></label>
        <label className="studio-form-wide"><span>{ar ? "نبذة" : "Bio"}</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={5} /></label>
        <label className="studio-form-wide"><span>{ar ? "الموقع الإلكتروني" : "Website"}</span><input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://" /></label>
        <label><span>{ar ? "الصورة الشخصية" : "Avatar"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /></label>
        <label><span>{ar ? "صورة الغلاف" : "Cover"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCover(event.target.files?.[0] ?? null)} /></label>
      </div>

      {error ? <div className="empty-state"><strong>{ar ? "تعذر الحفظ." : "Could not save."}</strong><span>{error}</span></div> : null}
      {message ? <div className="empty-state"><strong>{ar ? "تم الحفظ." : "Saved."}</strong><span>{message}</span></div> : null}

      <div className="studio-work-actions">
        <button className="button primary" type="button" onClick={save} disabled={busy}>{busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ التغييرات" : "Save changes")}</button>
        <button className="button secondary" type="button" onClick={signOut} disabled={busy}>{ar ? "تسجيل الخروج" : "Sign out"}</button>
      </div>
    </div>
  );
}
