"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const locale = params.locale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">(locale);
  const [country, setCountry] = useState("");

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data, error: userError }) => {
      if (!mounted) return;
      if (userError || !data.user) {
        router.replace(`/${locale}/auth?next=/${locale}/onboarding`);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name,username,language,country")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!mounted) return;
      if (profileError) {
        setError(ar ? "تعذر تحميل حسابك." : "Could not load your account.");
      }
      setDisplayName(profile?.display_name || data.user.user_metadata?.name || "");
      setUsername(profile?.username || "");
      setLanguage(profile?.language === "en" ? "en" : profile?.language === "ar" ? "ar" : locale);
      setCountry(profile?.country || "");
      setLoading(false);
    }).catch(() => {
      if (mounted) {
        setError(ar ? "تعذر تحميل حسابك." : "Could not load your account.");
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [ar, locale, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanDisplay = displayName.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanDisplay.length < 2) {
      setError(ar ? "اكتب اسم العرض أولًا." : "Enter a display name.");
      return;
    }
    if (cleanUsername.length < 3) {
      setError(ar ? "اسم المستخدم يجب أن يكون 3 أحرف على الأقل." : "Username must be at least 3 characters.");
      return;
    }
    if (language !== "ar" && language !== "en") {
      setError(ar ? "اختر لغة الواجهة." : "Choose an interface language.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error(ar ? "انتهت الجلسة. سجّل الدخول مرة أخرى." : "Your session expired. Please sign in again.");
      }
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userData.user.id,
        display_name: cleanDisplay,
        username: cleanUsername,
        language,
        country: country.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (profileError) throw profileError;
      router.replace(`/${language}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <div className="eyebrow">RAVINE / ONBOARDING</div>
          <p className="auth-intro">{ar ? "نجهز هويتك..." : "Preparing your identity..."}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="eyebrow">RAVINE / ONBOARDING</div>
        <h1>{ar ? "ابنِ هويتك داخل RAVINE." : "Build your RAVINE identity."}</h1>
        <p className="auth-intro">
          {ar
            ? "اسم العرض واسم المستخدم واللغة أساسية. البلد اختياري ويمكن تغييره لاحقًا."
            : "Display name, username, and language are required. Country is optional and can change later."}
        </p>
        <form onSubmit={submit} className="auth-form">
          <label>
            {ar ? "اسم العرض" : "Display name"}
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
          </label>

          <label>
            {ar ? "اسم المستخدم" : "Username"}
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_]{3,30}"
              autoCapitalize="none"
              autoComplete="username"
              placeholder="yourname"
            />
          </label>

          <label>
            {ar ? "اللغة" : "Language"}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "ar" | "en")}
              required
            >
              <option value="ar">{ar ? "العربية" : "Arabic"}</option>
              <option value="en">{ar ? "الإنجليزية" : "English"}</option>
            </select>
          </label>

          <label>
            {ar ? "البلد (اختياري)" : "Country (optional)"}
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={80}
              autoComplete="country-name"
            />
          </label>

          <button className="button primary auth-submit" type="submit" disabled={saving}>
            {saving ? "…" : ar ? "حفظ والدخول" : "Save and enter"}
          </button>
        </form>
        {error && <p className="auth-message">{error}</p>}
      </div>
    </section>
  );
}
