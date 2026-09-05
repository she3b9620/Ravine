"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OnboardingSelectors from "@/components/OnboardingSelectors";

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
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [language, setLanguage] = useState<"ar" | "en">(locale);
  const [country, setCountry] = useState("");
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data, error: userError }) => {
      if (!mounted) return;
      if (userError || !data.user) { router.replace(`/${locale}/auth?next=/${locale}/onboarding`); return; }
      const { data: profile, error: profileError } = await supabase.from("profiles").select("display_name,username,language,country").eq("id", data.user.id).maybeSingle();
      if (!mounted) return;
      if (profileError) setError(ar ? "تعذر تحميل حسابك." : "Could not load your account.");
      setDisplayName(profile?.display_name || data.user.user_metadata?.name || "");
      setUsername(profile?.username || "");
      setLanguage(profile?.language === "en" ? "en" : profile?.language === "ar" ? "ar" : locale);
      setCountry(profile?.country || "");
      if (profile?.username) setUsernameState("available");
      setLoading(false);
    }).catch(() => { if (mounted) { setError(ar ? "تعذر تحميل حسابك." : "Could not load your account."); setLoading(false); } });
    return () => { mounted = false; if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [ar, locale, router]);

  function cleanUsernameValue(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
  }

  function suggestUsernames(base: string) {
    const compact = base.replace(/[^a-z0-9_]/g, "").slice(0, 25) || "ravine";
    const suggestions: string[] = [];
    for (let i = 1; suggestions.length < 4 && i < 500; i += 1) {
      const candidate = `${compact}${String(i).padStart(4, "0")}`.slice(0, 30);
      if (!suggestions.includes(candidate)) suggestions.push(candidate);
    }
    return suggestions;
  }

  async function checkUsernameAvailability(nextUsername: string) {
    const clean = cleanUsernameValue(nextUsername);
    setUsername(clean);
    setUsernameSuggestions([]);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (clean.length < 3) { setUsernameState("idle"); return; }
    setUsernameState("checking");
    checkTimer.current = setTimeout(async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const { data: existing, error: lookupError } = await supabase.from("profiles").select("id").eq("username", clean).maybeSingle();
      if (lookupError) { setUsernameState("idle"); return; }
      if (!existing || existing.id === userData.user?.id) {
        setUsernameState("available");
        return;
      }
      const candidates = suggestUsernames(clean);
      const { data: takenRows } = await supabase.from("profiles").select("username").in("username", candidates);
      const taken = new Set((takenRows ?? []).map((row) => row.username));
      setUsernameSuggestions(candidates.filter((candidate) => !taken.has(candidate)));
      setUsernameState("taken");
    }, 400);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const cleanDisplay = displayName.trim();
    const cleanUsername = cleanUsernameValue(username);
    if (cleanDisplay.length < 2) { setError(ar ? "اكتب اسم العرض أولًا." : "Enter a display name."); return; }
    if (cleanUsername.length < 3) { setError(ar ? "اسم المستخدم يجب أن يكون 3 أحرف على الأقل." : "Username must be at least 3 characters."); return; }
    if (usernameState === "checking") { setError(ar ? "جارٍ التحقق من اسم المستخدم." : "Checking username availability."); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error(ar ? "انتهت الجلسة. سجّل الدخول مرة أخرى." : "Your session expired. Please sign in again.");
      const { data: existing, error: lookupError } = await supabase.from("profiles").select("id").eq("username", cleanUsername).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing && existing.id !== userData.user.id) {
        const candidates = suggestUsernames(cleanUsername);
        const { data: takenRows } = await supabase.from("profiles").select("username").in("username", candidates);
        const taken = new Set((takenRows ?? []).map((row) => row.username));
        setUsernameState("taken");
        setUsernameSuggestions(candidates.filter((candidate) => !taken.has(candidate)));
        throw new Error(ar ? "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر." : "That username is already taken. Choose another one.");
      }
      const { error: profileError } = await supabase.from("profiles").upsert({ id: userData.user.id, display_name: cleanDisplay, username: cleanUsername, language, country: country || null, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (profileError) throw profileError;
      router.replace(`/${locale}/security?next=${encodeURIComponent(`/${language}`)}`);
      router.refresh();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : String(submitError)); }
    finally { setSaving(false); }
  }

  if (loading) return <section className="auth-page"><div className="auth-card"><div className="eyebrow">RAVINE / ONBOARDING</div><p className="auth-intro">{ar ? "نجهز هويتك..." : "Preparing your identity..."}</p></div></section>;

  return <section className="auth-page" dir={ar ? "rtl" : "ltr"}>
    <div className="auth-card">
      <div className="eyebrow">RAVINE / ONBOARDING</div>
      <h1>{ar ? "ابنِ هويتك داخل RAVINE." : "Build your RAVINE identity."}</h1>
      <p className="auth-intro">{ar ? "اسم العرض واسم المستخدم واللغة أساسية. البلد اختياري ويمكن تغييره لاحقًا. بعد الحفظ ننتقل مباشرة إلى إعداد الأمان." : "Display name, username, and language are required. Country is optional and can change later. After saving, we continue directly to security setup."}</p>
      <form onSubmit={submit} className="auth-form">
        <label>{ar ? "اسم العرض" : "Display name"}<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" /></label>
        <label>
          {ar ? "اسم المستخدم" : "Username"}
          <input value={username} onChange={(e) => void checkUsernameAvailability(e.target.value)} required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]{3,30}" autoCapitalize="none" autoComplete="username" placeholder="yourname" dir="ltr" />
          <span className={`onboarding-username-status ${usernameState}`} aria-live="polite">
            {usernameState === "checking" ? (ar ? "جارٍ التحقق..." : "Checking...") : usernameState === "available" ? (ar ? "اسم المستخدم متاح" : "Username available") : usernameState === "taken" ? (ar ? "اسم المستخدم مستخدم" : "Username is taken") : ""}
          </span>
          {usernameState === "taken" && usernameSuggestions.length ? (
            <div className="onboarding-username-suggestions">
              <span>{ar ? "اقتراحات متاحة:" : "Available suggestions:"}</span>
              <div>{usernameSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void checkUsernameAvailability(suggestion)}>{suggestion}</button>)}</div>
            </div>
          ) : null}
        </label>
        <OnboardingSelectors locale={locale} language={language} country={country} onLanguageChange={setLanguage} onCountryChange={setCountry} />
        <button className="button primary auth-submit" type="submit" disabled={saving || usernameState === "checking"}>{saving ? "…" : ar ? "حفظ والمتابعة للأمان" : "Save and continue to security"}</button>
      </form>
      {error && <p className="auth-message" role="alert">{error}</p>}
    </div>
  </section>;
}
