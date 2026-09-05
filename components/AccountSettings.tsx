"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "@/app/[locale]/account/account.module.css";

type Profile = {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
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
    return { url: data.publicUrl, path };
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

    const uploadedAssets: Array<{ bucket: "avatars" | "covers"; path: string }> = [];

    try {
      let avatarUrl: string | null = profile?.avatar_url || null;
      let coverUrl: string | null = profile?.cover_url || null;

      if (avatar) {
        const uploaded = await uploadAsset(auth.user.id, "avatars", avatar);
        avatarUrl = uploaded.url;
        uploadedAssets.push({ bucket: "avatars", path: uploaded.path });
      }
      if (cover) {
        const uploaded = await uploadAsset(auth.user.id, "covers", cover);
        coverUrl = uploaded.url;
        uploadedAssets.push({ bucket: "covers", path: uploaded.path });
      }

      const patch = {
        display_name: displayName.trim() || null,
        username: username.trim().replace(/^@+/, "") || null,
        bio: bio.trim() || null,
        country: country.trim() || null,
        language: language as "ar" | "en",
        website_url: website.trim() || null,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      };

      const { error: updateError } = await supabase.from("profiles").update(patch).eq("id", auth.user.id);
      if (updateError) throw updateError;

      setAvatar(null);
      setCover(null);
      setMessage(ar ? "تم حفظ بيانات الحساب." : "Account details saved.");
      router.refresh();
    } catch (saveError) {
      for (const item of uploadedAssets) await supabase.storage.from(item.bucket).remove([item.path]);
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
    <div className={styles.settingsShell}>
      <div className={styles.settingsHead}>
        <div>
          <div className={styles.sectionLabel}>{ar ? "إعدادات الحساب" : "Account settings"}</div>
          <h2 className={styles.settingsTitle}>{ar ? "إدارة هويتك داخل RAVINE." : "Shape your RAVINE identity."}</h2>
          <p className={styles.settingsNote}>{ar ? "المعلومات التي تظهر لك وللمجتمع، منظمة في مساحة واحدة واضحة." : "Your public identity and account details, organized in one clear workspace."}</p>
        </div>
        <Link className={styles.actionLink} href={`/${locale}/dashboard`}><span>{ar ? "لوحة المستخدم" : "User dashboard"}</span><ArrowUpRight size={14} /></Link>
      </div>

      <section className={styles.sectionBlock}>
        <h3 className={styles.sectionLabel}>{ar ? "الهوية" : "Identity"}</h3>
        <div className={styles.formGrid}>
          <label className={styles.field}><span>{ar ? "الاسم الظاهر" : "Display name"}</span><input className={styles.input} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
          <label className={styles.field}><span>{ar ? "اسم المستخدم" : "Username"}</span><input className={styles.input} value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          <label className={styles.field}><span>{ar ? "البلد" : "Country"}</span><input className={styles.input} value={country} onChange={(event) => setCountry(event.target.value)} /></label>
          <label className={styles.field}><span>{ar ? "لغة الحساب" : "Account language"}</span><select className={styles.select} value={language} onChange={(event) => setLanguage(event.target.value)}><option value="ar">العربية</option><option value="en">English</option></select></label>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <h3 className={styles.sectionLabel}>{ar ? "التعريف" : "Profile"}</h3>
        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fieldWide}`}><span>{ar ? "نبذة عنك" : "Bio"}</span><textarea className={styles.textarea} value={bio} onChange={(event) => setBio(event.target.value)} rows={5} placeholder={ar ? "عرّف الناس بك وبما تصنعه..." : "Tell people who you are and what you create..."} /></label>
          <label className={`${styles.field} ${styles.fieldWide}`}><span>{ar ? "الموقع الإلكتروني" : "Website"}</span><input className={styles.input} value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://" /></label>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <h3 className={styles.sectionLabel}>{ar ? "الصور" : "Media"}</h3>
        <div className={styles.formGrid}>
          <label className={styles.field}><span>{ar ? "الصورة الشخصية" : "Avatar"}</span><input className={styles.file} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /><small className={styles.help}>{ar ? "صورة مربعة تمثل هويتك." : "A square image representing your identity."}</small></label>
          <label className={styles.field}><span>{ar ? "صورة الغلاف" : "Cover"}</span><input className={styles.file} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCover(event.target.files?.[0] ?? null)} /><small className={styles.help}>{ar ? "غلاف لصفحتك وملفك العام." : "A cover image for your public profile."}</small></label>
        </div>
      </section>

      {error ? <div className={styles.feedback}><strong>{ar ? "تعذر الحفظ" : "Could not save"}</strong><span>{error}</span></div> : null}
      {message ? <div className={styles.feedback}><strong>{ar ? "تم الحفظ" : "Saved"}</strong><span>{message}</span></div> : null}

      <div className={styles.actions}>
        <Link className={styles.actionLink} href={`/${locale}/dashboard`}>{ar ? "العودة للوحة المستخدم" : "Back to dashboard"}<ArrowUpRight size={14} /></Link>
        <div className={styles.actionsRight}>
          <button className={`${styles.button} ${styles.danger}`} type="button" onClick={signOut} disabled={busy}>{ar ? "تسجيل الخروج" : "Sign out"}</button>
          <button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={save} disabled={busy}>{busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ التغييرات" : "Save changes")}</button>
        </div>
      </div>
    </div>
  );
}
