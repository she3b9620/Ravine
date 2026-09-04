"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale === "en" ? "en" : "ar";
  const next = searchParams.get("next") || `/${locale}`;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const copy = useMemo(() => locale === "ar" ? {
    signin: "تسجيل الدخول", signup: "إنشاء حساب", email: "البريد الإلكتروني", password: "كلمة المرور",
    submitIn: "دخول", submitUp: "ابدأ على RAVINE", google: "المتابعة باستخدام Google",
    switchIn: "ليس لديك حساب؟ أنشئ حسابًا", switchUp: "لديك حساب بالفعل؟ سجّل الدخول",
    success: "تم إنشاء الحساب. تحقق من بريدك الإلكتروني إذا كان التأكيد مطلوبًا.",
  } : {
    signin: "Sign in", signup: "Create account", email: "Email", password: "Password",
    submitIn: "Enter RAVINE", submitUp: "Start on RAVINE", google: "Continue with Google",
    switchIn: "New here? Create an account", switchUp: "Already have an account? Sign in",
    success: "Account created. Check your email if confirmation is required.",
  }, [locale]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/${locale}/auth` } });

      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage(copy.success);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="eyebrow">RAVINE / ACCESS</div>
        <h1>{mode === "signin" ? copy.signin : copy.signup}</h1>
        <p className="auth-intro">{locale === "ar" ? "ادخل إلى عالم الأعمال والمبدعين، أو ابدأ هويتك الإبداعية." : "Enter the world of work and creators, or begin your creative identity."}</p>
        <button className="auth-google" type="button" onClick={google} disabled={loading}>{copy.google}</button>
        <div className="auth-divider"><span>{locale === "ar" ? "أو" : "or"}</span></div>
        <form onSubmit={submit} className="auth-form">
          <label>{copy.email}<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" /></label>
          <label>{copy.password}<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>
          <button className="button primary auth-submit" type="submit" disabled={loading}>{loading ? "…" : mode === "signin" ? copy.submitIn : copy.submitUp}</button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <button className="auth-switch" type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? copy.switchIn : copy.switchUp}
        </button>
      </div>
    </section>
  );
}
