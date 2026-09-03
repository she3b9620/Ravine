"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { Check, QrCode, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  mode?: "signin" | "signup";
  onClose: () => void;
  startInMfa?: boolean;
};

type SignupStep = "form" | "email" | "mfa";

export default function AuthModal({ open, mode: initialMode = "signin", onClose, startInMfa = false }: Props) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [signupStep, setSignupStep] = useState<SignupStep>(startInMfa ? "mfa" : "form");
  const [mfaOptional, setMfaOptional] = useState(startInMfa);
  const [mfaQr, setMfaQr] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !startInMfa || !mounted) return;
    void startMfaEnrollment(true);
  }, [open, startInMfa, mounted]);

  useEffect(() => {
    if (!open) {
      setMode(initialMode);
      setSignupStep(startInMfa ? "mfa" : "form");
      setMfaOptional(startInMfa);
      setMfaQr("");
      setMfaSecret("");
      setMfaFactorId("");
      setMfaChallengeId("");
      setMfaCode("");
      setError("");
      setMessage("");
    }
  }, [initialMode, open, startInMfa]);

  if (!open || !mounted) return null;

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  async function startMfaEnrollment(optional = false) {
    setLoading(true);
    clearFeedback();
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "RAVINE Authenticator",
      });
      if (error) throw error;
      setMfaQr(data?.totp?.qr_code ?? "");
      setMfaSecret(data?.totp?.secret ?? "");
      setMfaFactorId(data?.id ?? "");
      const challenge = await supabase.auth.mfa.challenge({ factorId: data.id });
      if (challenge.error) throw challenge.error;
      setMfaChallengeId(challenge.data.id);
      setMfaOptional(optional);
      setSignupStep("mfa");
    } catch (err) {
      setError(err instanceof Error ? err.message : (isArabic ? "تعذر بدء التحقق بخطوتين." : "Could not start two-step verification."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyMfa() {
    if (!mfaFactorId || !mfaChallengeId || !mfaCode.trim()) return;
    setLoading(true);
    clearFeedback();
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: mfaChallengeId, code: mfaCode.trim() });
      if (error) throw error;
      setMessage(isArabic ? "تم تفعيل التحقق بخطوتين بنجاح." : "Two-step verification is now enabled.");
      window.location.href = `/${locale}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : (isArabic ? "رمز التحقق غير صحيح." : "The verification code is incorrect."));
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    clearFeedback();
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) throw new Error(isArabic ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
        if (!firstName.trim() || !lastName.trim() || !username.trim()) throw new Error(isArabic ? "أكمل الاسم الأول واسم العائلة واسم المستخدم." : "Complete your first name, last name, and username.");
        const callback = new URL(window.location.origin + "/" + locale + "/auth/callback");
        callback.searchParams.set("next", `/${locale}?mfa=1`);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callback.toString(),
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              username: username.trim().replace(/^@+/, ""),
              display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          setMessage(isArabic ? "تم إنشاء الحساب. يمكنك حماية حسابك الآن بتطبيق Google Authenticator." : "Account created. You can now protect it with Google Authenticator.");
          await startMfaEnrollment(true);
        } else {
          setSignupStep("email");
          setMessage(isArabic ? "أرسلنا رسالة تأكيد إلى بريدك الإلكتروني. بعد التأكيد سيظهر لك طلب اختياري لتفعيل التحقق بخطوتين." : "We sent a confirmation email. After confirming it, you will see an optional prompt to enable two-step verification.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const factors = await supabase.auth.mfa.listFactors();
        if (factors.error) throw factors.error;
        const verifiedFactor = factors.data?.totp?.find((factor) => factor.status === "verified");
        if (verifiedFactor && data.session) {
          const challenge = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
          if (challenge.error) throw challenge.error;
          setMfaOptional(false);
          setMfaFactorId(verifiedFactor.id);
          setMfaChallengeId(challenge.data.id);
          setSignupStep("mfa");
          setMessage(isArabic ? "اكتب رمز التحقق من تطبيق Google Authenticator." : "Enter the code from Google Authenticator.");
        } else {
          window.location.href = `/${locale}`;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isArabic ? "حدث خطأ غير متوقع." : "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    clearFeedback();
    const callback = new URL(window.location.origin + "/" + locale + "/auth/callback");
    callback.searchParams.set("next", `/${locale}`);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString() } });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  function renderAuthForm() {
    if (signupStep === "email" && mode === "signup") {
      return <div className="mt-6 rounded-3xl border p-5 text-center" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)" }}><div className="mx-auto grid h-12 w-12 place-items-center rounded-full" style={{ background: "rgba(196,122,82,.14)", color: "#C47A52" }}><Check size={22} /></div><h3 className="mt-4 text-lg font-black">{isArabic ? "تحقق من بريدك" : "Verify your email"}</h3><p className="mt-2 text-sm leading-6" style={{ color: "rgba(241,233,220,.58)" }}>{message}</p><button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black" style={{ background: "#C47A52", color: "#090909" }}>{isArabic ? "تم" : "Done"}</button></div>;
    }

    if (signupStep === "mfa") {
      return <div className="mt-6">{mfaQr ? <div className="mx-auto mb-5 grid w-fit place-items-center rounded-3xl bg-white p-4"><img src={mfaQr.startsWith("data:") ? mfaQr : `data:image/svg+xml;utf8,${encodeURIComponent(mfaQr)}`} alt={isArabic ? "رمز QR لتطبيق المصادقة" : "Authenticator QR code"} className="h-48 w-48" /></div> : <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl" style={{ background: "rgba(196,122,82,.12)", color: "#C47A52" }}><QrCode size={34} /></div>}
        <h3 className="text-center text-lg font-black">{isArabic ? "حماية الحساب بالتحقق بخطوتين" : "Protect your account with two-step verification"}</h3>
        <p className="mt-2 text-center text-sm leading-6" style={{ color: "rgba(241,233,220,.58)" }}>{message || (isArabic ? "امسح الرمز بتطبيق Google Authenticator ثم اكتب الرمز المكوّن من 6 أرقام." : "Scan the QR code with Google Authenticator, then enter the 6-digit code.")}</p>
        {mfaOptional && <p className="mt-2 text-center text-xs" style={{ color: "rgba(241,233,220,.42)" }}>{isArabic ? "التفعيل موصى به لحماية البريد والحساب، لكنه اختياري الآن." : "Recommended for account security, but optional for now."}</p>}
        {mfaSecret && <p className="mt-3 break-all rounded-2xl border p-3 text-center text-xs" style={{ borderColor: "rgba(241,233,220,.10)", color: "rgba(241,233,220,.7)" }}>{mfaSecret}</p>}
        <input value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder={isArabic ? "رمز التحقق" : "Verification code"} className="mt-4 w-full rounded-2xl border px-4 py-3 text-center tracking-[.4em] outline-none" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)", color: "#F1E9DC" }} />
        <button type="button" disabled={loading || mfaCode.length !== 6} onClick={() => void verifyMfa()} className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black disabled:opacity-50" style={{ background: "#C47A52", color: "#090909" }}>{loading ? (isArabic ? "جارٍ التحقق..." : "Verifying...") : (isArabic ? "تفعيل التحقق" : "Verify & continue")}</button>
        {mfaOptional && <button type="button" disabled={loading} onClick={onClose} className="mt-3 w-full rounded-2xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: "rgba(241,233,220,.12)", color: "rgba(241,233,220,.68)" }}>{isArabic ? "لاحقًا" : "Maybe later"}</button>}
      </div>;
    }

    return <><button type="button" disabled={loading} onClick={() => void google()} className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold disabled:opacity-50" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)" }}><span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-black text-[#4285F4]">G</span>{isArabic ? "المتابعة باستخدام Google" : "Continue with Google"}</button>
      <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[.2em]" style={{ color: "rgba(241,233,220,.58)" }}><span className="h-px flex-1" style={{ background: "rgba(241,233,220,.12)" }} /><span>{isArabic ? "أو" : "OR"}</span><span className="h-px flex-1" style={{ background: "rgba(241,233,220,.12)" }} /></div>
      <form onSubmit={submit}>
        {mode === "signup" && <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">{isArabic ? "الاسم الأول" : "First name"}<input required value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)", color: "#F1E9DC" }} /></label><label className="block text-sm font-semibold">{isArabic ? "اسم العائلة" : "Last name"}<input required value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)", color: "#F1E9DC" }} /></label><label className="col-span-2 block text-sm font-semibold">{isArabic ? "اسم المستخدم" : "Username"}<input required minLength={3} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="@username" className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)", color: "#F1E9DC" }} /></label></div>}
        <label className="mt-4 block text-sm font-semibold">{isArabic ? "البريد الإلكتروني" : "Email"}<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)", color: "#F1E9DC" }} /></label>
        <label className="mt-4 block text-sm font-semibold">{isArabic ? "كلمة المرور" : "Password"}<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)", color: "#F1E9DC" }} /></label>
        {mode === "signup" && <label className="mt-4 block text-sm font-semibold">{isArabic ? "تأكيد كلمة المرور" : "Confirm password"}<input type="password" required minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)", color: "#F1E9DC" }} /></label>}
        <button type="submit" disabled={loading} className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black disabled:opacity-50" style={{ background: "#C47A52", color: "#090909" }}>{loading ? (isArabic ? "جارٍ التنفيذ..." : "Please wait...") : mode === "signin" ? (isArabic ? "تسجيل الدخول" : "Sign in") : (isArabic ? "إنشاء الحساب" : "Create account")}</button>
      </form>
      {error && <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      {message && <div className="mt-4 rounded-2xl border p-3 text-sm" style={{ borderColor: "#183F46", background: "rgba(24,63,70,.18)" }}>{message}</div>}
      <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setSignupStep("form"); setMfaOptional(false); clearFeedback(); }} className="mt-5 w-full text-sm" style={{ color: "rgba(241,233,220,.58)" }}>{mode === "signin" ? (isArabic ? "ليس لديك حساب؟ أنشئ حسابًا" : "Don't have an account? Create one") : (isArabic ? "لديك حساب بالفعل؟ سجل الدخول" : "Already have an account? Sign in")}</button></>;
  }

  return createPortal(<div className="fixed inset-0 z-[99999] grid min-h-[100dvh] w-screen place-items-center overscroll-contain overflow-y-auto bg-black/70 p-4 backdrop-blur-md" style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh" }} role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[32px] border p-6 shadow-2xl" style={{ background: "#111516", borderColor: "rgba(241,233,220,.12)", color: "#F1E9DC" }} onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "#C47A52" }}>RAVINE</p><h2 className="mt-2 text-2xl font-black">{signupStep === "mfa" ? (isArabic ? "حماية الحساب" : "Secure your account") : mode === "signin" ? (isArabic ? "مرحبًا بعودتك" : "Welcome back") : (isArabic ? "أنشئ حسابك" : "Create your account")}</h2></div><button type="button" onClick={onClose} className="rounded-full border p-2" style={{ borderColor: "rgba(241,233,220,.12)" }} aria-label={isArabic ? "إغلاق" : "Close"}><X size={17} /></button></div>{renderAuthForm()}</div></div>, document.body);
}
