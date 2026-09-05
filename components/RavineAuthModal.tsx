"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./AuthModal.module.css";

type Locale = "ar" | "en";
type Mode = "signin" | "signup" | "reset" | "verify-email" | "mfa";
type Detail = { next?: string | null; mode?: "signin" | "signup" };
type Factor = { id: string; factor_type: "totp" | "phone"; status: string };

function safeNext(value: string | null | undefined, locale: Locale) {
  const fallback = `/${locale}`;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /:\/\//.test(value)) return fallback;
  return value;
}

export function requestRavineAuth(next?: string, mode: "signin" | "signup" = "signin") {
  window.dispatchEvent(new CustomEvent<Detail>("ravine:open-auth", { detail: { next, mode } }));
}

export default function RavineAuthModal({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [next, setNext] = useState(`/${locale}`);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState("");
  const [factor, setFactor] = useState<Factor | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");

  const copy = useMemo(() => ar ? {
    signin: "تسجيل الدخول", signup: "إنشاء حساب", reset: "استعادة كلمة المرور", verify: "أكد بريدك الإلكتروني", mfa: "تحقق أمني إضافي",
    intro: "ادخل إلى عالم الأعمال والمبدعين، أو ابدأ هويتك الإبداعية.", email: "البريد الإلكتروني", password: "كلمة المرور", google: "المتابعة باستخدام Google",
    enter: "دخول", start: "ابدأ على رَافِين", resetButton: "إرسال رابط الاستعادة", forgot: "نسيت كلمة المرور؟", switchSignup: "ليس لديك حساب؟ أنشئ حسابًا", switchSignin: "لديك حساب بالفعل؟ سجّل الدخول",
    created: "أرسلنا رسالة تأكيد إلى بريدك. افتحها وأكّد الحساب قبل إكمال التسجيل.", resend: "إعادة إرسال رسالة التأكيد", resent: "تم إرسال رسالة التأكيد مرة أخرى.",
    emailConfirmed: "تم تأكيد البريد. أكمل إعداد هويتك داخل RAVINE.", mfaIntro: "أدخل الرمز الحالي من تطبيق المصادقة لإكمال تسجيل الدخول.", phoneCode: "رمز التحقق", verifyCode: "تأكيد الرمز", security: "هذا الحساب يحتاج إعداد التحقق الأمني قبل المتابعة.",
    wrongCode: "رمز التحقق غير صحيح أو منتهي الصلاحية."
  } : {
    signin: "Sign in", signup: "Create account", reset: "Reset password", verify: "Confirm your email", mfa: "Additional security check",
    intro: "Enter the world of work and creators, or begin your creative identity.", email: "Email", password: "Password", google: "Continue with Google",
    enter: "Enter RAVINE", start: "Start on RAVINE", resetButton: "Send reset link", forgot: "Forgot your password?", switchSignup: "New here? Create an account", switchSignin: "Already have an account? Sign in",
    created: "We sent a confirmation email. Open it and confirm your account before finishing signup.", resend: "Resend confirmation email", resent: "Confirmation email sent again.",
    emailConfirmed: "Email confirmed. Continue setting up your RAVINE identity.", mfaIntro: "Enter the current code from your authenticator app to finish signing in.", phoneCode: "Verification code", verifyCode: "Verify code", security: "This account needs security setup before continuing.",
    wrongCode: "The verification code is invalid or expired."
  }, [ar]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Detail>).detail;
      setNext(safeNext(detail?.next, locale)); setMode(detail?.mode === "signup" ? "signup" : "signin"); setMessage(""); setPendingVerification(""); setFactor(null); setChallengeId(""); setCode(""); setClosing(false); setOpen(true);
    };
    window.addEventListener("ravine:open-auth", handler);
    return () => window.removeEventListener("ravine:open-auth", handler);
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") beginClose(); };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", key); };
  }, [open]);

  function beginClose() { if (!open || closing) return; setClosing(true); }
  function finishClose() { setOpen(false); setClosing(false); }

  async function startMfa(supabase: ReturnType<typeof createClient>) {
    const listed = await supabase.auth.mfa.listFactors();
    if (listed.error) throw listed.error;
    const factors = [...listed.data.totp, ...listed.data.phone].filter((item) => item.status === "verified") as Factor[];
    const selected = factors.find((item) => item.factor_type === "totp") ?? factors[0];
    if (!selected) return false;
    const challenge = await supabase.auth.mfa.challenge({ factorId: selected.id });
    if (challenge.error) throw challenge.error;
    setFactor(selected); setChallengeId(challenge.data.id); setCode(""); setMode("mfa");
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const supabase = createClient();
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}` });
        if (error) throw error; setMessage(ar ? "تم إرسال رابط الاستعادة إذا كان الحساب موجودًا." : "A reset link was sent if the account exists."); return;
      }
      if (mode === "verify-email") return;
      if (mode === "mfa") {
        if (!factor || !challengeId || !/^\d{6,10}$/.test(code)) throw new Error(copy.wrongCode);
        const { error } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId, code });
        if (error) throw error;
        setOpen(false); setClosing(false); router.replace(next); router.refresh(); return;
      }
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/${locale}/auth/callback?next=/${locale}/onboarding` } });
      if (result.error) throw result.error;
      if (mode === "signup") {
        setPendingVerification(email.trim());
        if (!result.data.session) { setMode("verify-email"); setMessage(copy.created); return; }
        setOpen(false); setClosing(false); router.replace(`/${locale}/onboarding`); router.refresh(); return;
      }
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error) throw assurance.error;
      if (assurance.data.nextLevel === "aal2" && assurance.data.currentLevel !== "aal2") { await startMfa(supabase); return; }
      const listed = await supabase.auth.mfa.listFactors();
      if (listed.error) throw listed.error;
      const hasFactor = [...listed.data.totp, ...listed.data.phone].some((item) => item.status === "verified");
      setOpen(false); setClosing(false);
      router.replace(hasFactor ? next : `/${locale}/security?next=${encodeURIComponent(next)}`); router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setLoading(false); }
  }

  async function resendVerification() {
    if (!pendingVerification || loading) return;
    setLoading(true); setMessage("");
    try { const { error } = await createClient().auth.resend({ type: "signup", email: pendingVerification }); if (error) throw error; setMessage(copy.resent); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setLoading(false); }
  }

  async function google() {
    setLoading(true); setMessage("");
    try {
      const target = mode === "signup" ? `/${locale}/onboarding` : next;
      const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(target)}` } });
      if (error) throw error;
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); setLoading(false); }
  }

  if (!open) return null;
  const title = mode === "signin" ? copy.signin : mode === "signup" ? copy.signup : mode === "reset" ? copy.reset : mode === "mfa" ? copy.mfa : copy.verify;
  return <div className={`ravine-auth-overlay ${styles.overlay}${closing ? ` ${styles.isClosing}` : ""}`} dir={ar ? "rtl" : "ltr"} onMouseDown={(event) => { if (event.currentTarget === event.target) beginClose(); }} onAnimationEnd={(event) => { if (closing && event.target === event.currentTarget) finishClose(); }}>
    <div className={`ravine-auth-dialog ${styles.dialog}${closing ? ` ${styles.isClosing}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="ravine-auth-title">
      <button className={styles.close} type="button" onClick={beginClose} aria-label={ar ? "إغلاق" : "Close"}><X size={18}/></button>
      <div className="eyebrow">RAVINE / {mode === "mfa" || mode === "verify-email" ? (ar ? "الأمان" : "SECURITY") : (ar ? "الدخول" : "ACCESS")}</div>
      <h2 id="ravine-auth-title">{title}</h2>
      <p className={styles.intro}>{mode === "mfa" ? copy.mfaIntro : mode === "verify-email" ? copy.emailConfirmed : copy.intro}</p>
      {mode === "verify-email" ? <div className="auth-form">
        <label>{copy.email}<input value={pendingVerification} readOnly type="email"/></label>
        <button className="button primary auth-submit" type="button" disabled={loading} onClick={() => void resendVerification()}>{loading ? "…" : copy.resend}</button>
        <button className="auth-switch" type="button" onClick={() => { setMode("signin"); setMessage(""); }}>{copy.switchSignin}</button>
      </div> : mode === "mfa" ? <form onSubmit={submit} className="auth-form">
        <div className="auth-security-note"><ShieldCheck size={18}/><span>{copy.mfaIntro}</span></div>
        <label>{factor?.factor_type === "phone" ? copy.phoneCode : (ar ? "رمز تطبيق المصادقة" : "Authenticator code")}<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="one-time-code" required/></label>
        <button className="button primary auth-submit" type="submit" disabled={loading}>{loading ? "…" : copy.verifyCode}</button>
      </form> : <>
        {mode !== "reset" && <><button className="auth-google" type="button" onClick={() => void google()} disabled={loading}>{copy.google}</button><div className="auth-divider"><span>{ar ? "أو" : "or"}</span></div></>}
        <form onSubmit={submit} className="auth-form">
          <label>{copy.email}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="email"/></label>
          {mode !== "reset" && <label>{copy.password}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"}/></label>}
          <button className="button primary auth-submit" type="submit" disabled={loading}>{loading ? "…" : mode === "signin" ? copy.enter : mode === "signup" ? copy.start : copy.resetButton}</button>
        </form>
      </>}
      {message && <p className="auth-message" role="alert">{message}</p>}
      {mode !== "mfa" && mode !== "verify-email" && <div className={styles.links}>
        {mode === "signin" && <button className="auth-switch" type="button" onClick={() => { setMode("reset"); setMessage(""); }}>{copy.forgot}</button>}
        {mode === "reset" ? <button className="auth-switch" type="button" onClick={() => { setMode("signin"); setMessage(""); }}>{copy.switchSignin}</button> : <button className="auth-switch" type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? copy.switchSignup : copy.switchSignin}</button>}
      </div>}
    </div>
  </div>;
}
