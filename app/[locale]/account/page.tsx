"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  website_url: string | null;
  country: string | null;
  is_verified: boolean;
  is_suspended: boolean;
};

export default function AccountPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        window.location.href = `/${locale}/auth?next=/${locale}/account`;
        return;
      }

      setEmail(user.email ?? "");

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id,username,display_name,bio,avatar_url,cover_url,website_url,country,is_verified,is_suspended"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profileError) {
        setError(profileError.message);
      }

      const current = data as Profile | null;

      if (current) {
        setProfile(current);
        setDisplayName(current.display_name ?? "");
        setUsername(current.username ?? "");
        setBio(current.bio ?? "");
        setCountry(current.country ?? "");
        setWebsite(current.website_url ?? "");
      } else {
        const fallbackName =
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : typeof user.user_metadata?.name === "string"
              ? user.user_metadata.name
              : "";
        setDisplayName(fallbackName);
      }

      setLoading(false);
    }

    void loadAccount();

    return () => {
      mounted = false;
    };
  }, [locale, supabase]);

  async function uploadImage(
    bucket: "avatars" | "covers",
    file: File,
    userId: string
  ) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(
        isArabic
          ? "حجم الصورة يجب ألا يتجاوز 5 ميجابايت."
          : "Image size must not exceed 5 MB."
      );
    }

    if (!file.type.startsWith("image/")) {
      throw new Error(
        isArabic ? "اختر ملف صورة صالحًا." : "Choose a valid image file."
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    return publicUrl;
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = `/${locale}/auth?next=/${locale}/account`;
        return;
      }

      let avatarUrl = profile?.avatar_url || null;
      let coverUrl = profile?.cover_url || null;

      if (avatarFile) {
        avatarUrl = await uploadImage("avatars", avatarFile, user.id);
      }

      if (coverFile) {
        coverUrl = await uploadImage("covers", coverFile, user.id);
      }

      const payload = {
        id: user.id,
        display_name: displayName.trim() || null,
        username: username.trim().toLowerCase() || null,
        bio: bio.trim() || null,
        country: country.trim() || null,
        website_url: website.trim() || null,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      };

      const { data, error: saveError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (saveError) throw saveError;

      setProfile(data as Profile);
      setAvatarFile(null);
      setCoverFile(null);
      setMessage(isArabic ? "تم تحديث الملف بنجاح." : "Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : isArabic ? "تعذر حفظ الملف." : "Could not save the profile.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = `/${locale}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-4xl text-center">
          {isArabic ? "جارٍ تحميل الحساب..." : "Loading account..."}
        </div>
      </main>
    );
  }

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#090909] px-5 py-12 text-[#F1E9DC]">
      <div className="mx-auto max-w-4xl">
        <a
          href={`/${locale}`}
          className="text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
        >
          {isArabic ? "← العودة إلى RAVINE" : "← Back to RAVINE"}
        </a>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#C47A52]">
              RAVINE ACCOUNT
            </div>
            <h1 className="mt-3 text-4xl font-black">
              {isArabic ? "حسابك" : "Your Account"}
            </h1>
            <p className="mt-2 text-sm text-[#F1E9DC]/45">{email}</p>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-full border border-red-500/30 px-5 py-2.5 text-sm text-red-300"
          >
            {isArabic ? "تسجيل الخروج" : "Sign out"}
          </button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a href={`/${locale}/library`} className="rounded-2xl border border-[#183F46]/60 bg-[#151719] p-5">
            <div className="text-sm font-bold">{isArabic ? "مكتبتي" : "My Library"}</div>
            <div className="mt-1 text-xs text-[#F1E9DC]/40">{isArabic ? "المحفوظات والإعجابات والسجل" : "Saved, liked and history"}</div>
          </a>

          <a href={`/${locale}/notifications`} className="rounded-2xl border border-[#183F46]/60 bg-[#151719] p-5">
            <div className="text-sm font-bold">{isArabic ? "الإشعارات" : "Notifications"}</div>
            <div className="mt-1 text-xs text-[#F1E9DC]/40">{isArabic ? "النشاط والتحديثات" : "Activity and updates"}</div>
          </a>

          <a href={`/${locale}/creator`} className="rounded-2xl border border-[#183F46]/60 bg-[#151719] p-5">
            <div className="text-sm font-bold">{isArabic ? "لوحة المبدع" : "Creator Dashboard"}</div>
            <div className="mt-1 text-xs text-[#F1E9DC]/40">{isArabic ? "إدارة أعمالك" : "Manage your work"}</div>
          </a>

        </div>

        <form
          onSubmit={saveProfile}
          className="mt-8 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6 md:p-8"
        >
          <h2 className="text-2xl font-bold">{isArabic ? "الملف الشخصي" : "Profile"}</h2>

          {profile?.is_verified && (
            <div className="mt-3 text-xs font-semibold text-[#C47A52]">
              {isArabic ? "حساب موثق" : "Verified account"}
            </div>
          )}

          {profile?.is_suspended && (
            <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
              {isArabic ? "هذا الحساب موقوف." : "This account is suspended."}
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-3xl border border-[#F1E9DC]/10 bg-[#090909]">
            <div
              className="h-36 bg-cover bg-center"
              style={{
                backgroundImage: profile?.cover_url
                  ? `url(${profile.cover_url})`
                  : "linear-gradient(135deg,#183F46,#151719)",
              }}
            />

            <div className="-mt-10 px-6 pb-5">
              <img
                src={profile?.avatar_url || "/RAVINE.png"}
                alt=""
                className="h-20 w-20 rounded-full border-4 border-[#151719] object-cover"
              />
            </div>
          </div>

          <label className="mt-6 block text-sm font-medium">
            {isArabic ? "الصورة الشخصية" : "Avatar"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
              className="mt-2 block w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#C47A52] file:px-4 file:py-2 file:font-bold file:text-[#090909]"
            />
          </label>

          <label className="mt-5 block text-sm font-medium">
            {isArabic ? "صورة الغلاف" : "Cover image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
              className="mt-2 block w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#C47A52] file:px-4 file:py-2 file:font-bold file:text-[#090909]"
            />
          </label>

          <label className="mt-6 block text-sm font-medium">
            {isArabic ? "اسم العرض" : "Display name"}
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            />
          </label>

          <label className="mt-5 block text-sm font-medium">
            {isArabic ? "اسم المستخدم" : "Username"}
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value.replace(/\s+/g, ""))}
              maxLength={40}
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            />
          </label>

          <label className="mt-5 block text-sm font-medium">
            {isArabic ? "النبذة" : "Bio"}
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={5}
              maxLength={500}
              className="mt-2 w-full resize-y rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            />
          </label>

          <label className="mt-5 block text-sm font-medium">
            {isArabic ? "الدولة" : "Country"}
            <input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              maxLength={80}
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            />
          </label>

          <label className="mt-5 block text-sm font-medium">
            {isArabic ? "الموقع الإلكتروني" : "Website"}
            <input
              type="url"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://example.com"
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-7 rounded-2xl bg-[#C47A52] px-6 py-3 text-sm font-bold text-[#090909] disabled:opacity-50"
          >
            {saving
              ? isArabic
                ? "جارٍ الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ الملف"
                : "Save Profile"}
          </button>

          {message && (
            <div className="mt-5 rounded-2xl border border-[#183F46] bg-[#183F46]/20 p-4 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
