"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./AuthModal.module.css";

type Locale = "ar" | "en";
type AuthMode = "signin" | "signup" | "reset";

type OpenDetail = { next?: string | null };

function safeNext(value: string | null | undefined, locale: Locale) {
  const fallback = `/${locale}`;
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /:\/\//.test(value)) return fallback;
  return value;
}

export function requestRavineAuth(next?: string) {
  window.dispatchEvent(new CustomEvent<OpenDetail>("ravine:open-auth", { detail: { next } }));
}

export default function AuthModal({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState(`/${locale}`);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<OpenDetail>).detail;
      setNext(safeNext(detail?.next, locale));
      setMode("signin");
      setMessage("");
      setOpen(true);
    };

    window.addEventListener("ravine:open-auth", handler);
    return () => window.removeEventListener("ravine:open-auth", handler);
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copy = useMemo(() => ar ? {
    signin: "تسجيل الدخول",
    signup: "إنشاء حساب",
    reset: "استعادة كلمة المرور",
    intro: "ادخل إلى عالم الأعمال والمبدعين، أو ابدأ هويتك الإبداعية.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    google: "المتابعة باستخدام Google",
    submitIn: "دخول",
    submitUp: "ابدأ على RAVINE",
    submitReset: "إرسال رابط الاستعادة",
    switchIn: "ليس لديك حساب؟ أنشئ حسابًا",
    switchUp: "لديك حساب بالفعل؟ سجّل الدخول",
    forgot: "نسيت كلمة المرور؟",
    resetSent: "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني إذا كان الحساب موجودًا.",
    created: "تم إنشاء الحساب. تحقق من بريدك الإلكتروني إذا كان التأكيد مطلوبًا.",
  } : {
    signin: "Sign in",
    signup: "Create account",
    reset: "Reset password",
    intro: "Enter the world of work and creators, or begin your creative identity.",
    email: "Email",
    password: "Password",
    google: "Continue with Google",
    submitIn: "Enter RAVINE",
    submitUp: "Start on RAVINE",
    submitReset: "Send reset link",
    switchIn: "New here? Create an account",
    switchUp: "Already have an account? Sign in",
    forgot: "Forgot your password?",
    resetSent: "If an account exists for this email, a reset link has been sent.",
    created: "Account created. Check your email if confirmation is required.",
  }, [ar]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}`,
        });
        if (error) throw error;
        setMessage(copy.resetSent);
        return;
      }

      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/${locale}/auth/callback?next=/${locale}/onboarding` },
          });

      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage(copy.created);
        return;
      }

      setOpen(false);
      router.replace(mode === "signup" ? `/${locale}/onboarding` : next);
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
      const target = mode === "signup" ? `/${locale}/onboarding` : next;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(target)}` },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  }

  const title = mode === "signin" ? copy.signin : mode === "signup" ? copy.signup : copy.reset;

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="ravine-auth-title" dir={ar ? "rtl" : "ltr"}>
        <button className={styles.close} type="button" onClick={() => setOpen(false)} aria-label={ar ? "إغلاق" : "Close"}>
          <X size={18} />
        </button>
        <div className="eyebrow">RAVINE / ACCESS</div>
        <h2 id="ravine-auth-title">{title}</h2>
        <p className={styles.intro}>{copy.intro}</p>

        {mode !== "reset" && (
          <>
            <button className="auth-google" type="button" onClick={() => void google()} disabled={loading}>{copy.google}</button>
            <div className="auth-divider"><span>{ar ? "أو" : "or"}</span></div>
          </>
        )}

        <form onSubmit={submit} className="auth-form">
          <label>{copy.email}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="email" /></label>
          {mode !== "reset" && <label>{copy.password}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>}
          <button className="button primary auth-submit" type="submit" disabled={loading}>
            {loading ? "…" : mode === "signin" ? copy.submitIn : mode === "signup" ? copy.submitUp : copy.submitReset}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <div className={styles.links}>
          {mode === "signin" && <button className="auth-switch" type="button" onClick={() => { setMode("reset"); setMessage(""); }}>{copy.forgot}</button>}
          {mode === "reset" ? (
            <button className="auth-switch" type="button" onClick={() => { setMode("signin"); setMessage(""); }}>{ar ? "العودة لتسجيل الدخول" : "Back to sign in"}</button>
          ) : (
            <button className="auth-switch" type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
              {mode === "signin" ? copy.switchIn : copy.switchUp}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
