"use client";

import { FormEvent, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  mode?: "signin" | "signup";
  onClose: () => void;
};

export default function AuthModal({ open, mode: initialMode = "signin", onClose }: Props) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      if (mode === "signup") {
        const callback = new URL(window.location.origin + "/" + locale + "/auth/callback");
        callback.searchParams.set("next", "/" + locale);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callback.toString() },
        });
        if (error) throw error;
        setMessage(isArabic ? "راجع بريدك الإلكتروني لتأكيد الحساب." : "Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/" + locale;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isArabic ? "حدث خطأ غير متوقع." : "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    setError("");
    const callback = new URL(window.location.origin + "/" + locale + "/auth/callback");
    callback.searchParams.set("next", "/" + locale);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/65 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md rounded-[32px] border p-6 shadow-2xl" style={{ background: "#111516", borderColor: "rgba(241,233,220,.12)", color: "#F1E9DC" }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "#C47A52" }}>RAVINE</p>
            <h2 className="mt-2 text-2xl font-black">{mode === "signin" ? (isArabic ? "مرحبًا بعودتك" : "Welcome back") : (isArabic ? "أنشئ حسابك" : "Create your account")}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border p-2" style={{ borderColor: "rgba(241,233,220,.12)" }}><X size={17} /></button>
        </div>
        <button type="button" disabled={loading} onClick={() => void google()} className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold disabled:opacity-50" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)" }}>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-black text-[#4285F4]">G</span>
          {isArabic ? "المتابعة باستخدام Google" : "Continue with Google"}
        </button>
        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[.2em]" style={{ color: "rgba(241,233,220,.58)" }}><span className="h-px flex-1" style={{ background: "rgba(241,233,220,.12)" }} /><span>{isArabic ? "أو" : "OR"}</span><span className="h-px flex-1" style={{ background: "rgba(241,233,220,.12)" }} /></div>
        <form onSubmit={submit}>
          <label className="block text-sm font-semibold">{isArabic ? "البريد الإلكتروني" : "Email"}<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)", color: "#F1E9DC" }} /></label>
          <label className="mt-4 block text-sm font-semibold">{isArabic ? "كلمة المرور" : "Password"}<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(241,233,220,.035)", color: "#F1E9DC" }} /></label>
          <button type="submit" disabled={loading} className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black disabled:opacity-50" style={{ background: "#C47A52", color: "#090909" }}>{loading ? (isArabic ? "جارٍ التنفيذ..." : "Please wait...") : mode === "signin" ? (isArabic ? "تسجيل الدخول" : "Sign in") : (isArabic ? "إنشاء الحساب" : "Create account")}</button>
        </form>
        {message && <div className="mt-4 rounded-2xl border p-3 text-sm" style={{ borderColor: "#183F46", background: "rgba(24,63,70,.18)" }}>{message}</div>}
        {error && <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }} className="mt-5 w-full text-sm" style={{ color: "rgba(241,233,220,.58)" }}>
          {mode === "signin" ? (isArabic ? "ليس لديك حساب؟ أنشئ حسابًا" : "Don't have an account? Create one") : (isArabic ? "لديك حساب بالفعل؟ سجل الدخول" : "Already have an account? Sign in")}
        </button>
      </div>
    </div>
  );
}
