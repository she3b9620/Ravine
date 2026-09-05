"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type FactorMode = "totp" | "phone";

export default function SecurityPage() {
  const params = useParams<{ locale: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const locale = params.locale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const next = search.get("next") && search.get("next")!.startsWith(`/${locale}`) ? search.get("next")! : `/${locale}`;
  const [mode, setMode] = useState<FactorMode>("totp");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [hasFactor, setHasFactor] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace(`/${locale}/auth?next=${encodeURIComponent(next)}`); return; }
      const listed = await supabase.auth.mfa.listFactors();
      if (listed.error) { setError(listed.error.message); setLoading(false); return; }
      const verified = [...listed.data.totp, ...listed.data.phone].some((item) => item.status === "verified");
      if (verified) { router.replace(next); router.refresh(); return; }
      setLoading(false);
    }).catch((e) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [locale, next, router]);

  async function beginTotp() {
    setWorking(true); setError("");
    try {
      const result = await createClient().auth.mfa.enroll({ factorType: "totp", friendlyName: "RAVINE Authenticator" });
      if (result.error) throw result.error;
      setFactorId(result.data.id); setQrCode(result.data.totp.qr_code); setSecret(result.data.totp.secret); setMode("totp");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setWorking(false); }
  }

  async function beginPhone() {
    setWorking(true); setError("");
    try {
      const clean = phone.trim();
      if (!/^\+[1-9]\d{7,14}$/.test(clean)) throw new Error(ar ? "اكتب رقم الهاتف بصيغة دولية، مثل +201xxxxxxxxx." : "Enter your phone in international format, such as +201xxxxxxxxx.");
      const result = await createClient().auth.mfa.enroll({ factorType: "phone", phone: clean, friendlyName: "RAVINE Phone" });
      if (result.error) throw result.error;
      setFactorId(result.data.id); setChallengeId(""); setMode("phone");
      const challenge = await createClient().auth.mfa.challenge({ factorId: result.data.id });
      if (challenge.error) throw challenge.error;
      setChallengeId(challenge.data.id);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setWorking(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking(true); setError("");
    try {
      if (!factorId || !/^\d{6,10}$/.test(code.trim())) throw new Error(ar ? "أدخل رمز التحقق الصحيح." : "Enter a valid verification code.");
      const supabase = createClient();
      const challenge = challengeId || (await supabase.auth.mfa.challenge({ factorId })).data?.id;
      if (!challenge) throw new Error(ar ? "تعذر إنشاء جلسة تحقق جديدة." : "Could not create a verification challenge.");
      const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge, code: code.trim() });
      if (result.error) throw result.error;
      setHasFactor(true); router.replace(next); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setWorking(false); }
  }

  if (loading) return <section className="auth-page"><div className="auth-card"><div className="eyebrow">RAVINE / SECURITY</div><p className="auth-intro">{ar ? "جاري تجهيز طبقة الأمان..." : "Preparing your security layer..."}</p></div></section>;

  return <section className="auth-page" dir={ar ? "rtl" : "ltr"}>
    <div className="auth-card" style={{ width: "min(620px, 100%)" }}>
      <div className="eyebrow">RAVINE / SECURITY</div>
      <h1>{ar ? "وثّق حسابك قبل الدخول." : "Secure your account before entering."}</h1>
      <p className="auth-intro">{ar ? "نريد أن نتأكد أن الحساب لك فعلًا. اختر تطبيق مصادقة كخيارنا المفضل، أو استخدم رقم الهاتف عندما يكون SMS مفعّلًا في RAVINE." : "We want to verify that this account belongs to you. An authenticator app is the preferred method; phone verification is available when SMS is configured for RAVINE."}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <button type="button" className="button secondary" onClick={() => { setMode("totp"); if (!factorId) void beginTotp(); }} disabled={working}><ShieldCheck size={15}/>{ar ? "تطبيق المصادقة" : "Authenticator app"}</button>
        <button type="button" className="button secondary" onClick={() => setMode("phone")} disabled={working}><Smartphone size={15}/>{ar ? "رقم الهاتف" : "Phone"}</button>
      </div>

      {mode === "phone" && !factorId ? <div className="auth-form">
        <label>{ar ? "رقم الهاتف" : "Phone number"}<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="+201xxxxxxxxx" /></label>
        <button type="button" className="button primary auth-submit" onClick={() => void beginPhone()} disabled={working}>{working ? "…" : (ar ? "إرسال رمز SMS" : "Send SMS code")}</button>
      </div> : null}

      {mode === "totp" && factorId && qrCode ? <div className="auth-form">
        <div style={{ display: "grid", placeItems: "center", gap: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 18 }}>
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`} alt={ar ? "رمز QR لتطبيق المصادقة" : "Authenticator QR code"} style={{ width: 220, height: 220, background: "#fff", padding: 8, borderRadius: 12 }} />
          <small>{ar ? "أو أدخل المفتاح يدويًا" : "Or enter the secret manually"}: {secret}</small>
        </div>
        <label>{ar ? "رمز تطبيق المصادقة" : "Authenticator code"}<input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="one-time-code" /></label>
        <button className="button primary auth-submit" type="button" onClick={(e) => void verify(e as unknown as FormEvent<HTMLFormElement>)} disabled={working}>{working ? "…" : (ar ? "تفعيل الحماية" : "Enable protection")}</button>
      </div> : null}

      {mode === "phone" && factorId && challengeId ? <form onSubmit={verify} className="auth-form">
        <label>{ar ? "رمز SMS" : "SMS code"}<input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="one-time-code" /></label>
        <button className="button primary auth-submit" type="submit" disabled={working}>{working ? "…" : (ar ? "تأكيد الرقم" : "Verify phone")}</button>
      </form> : null}

      {hasFactor ? <p className="auth-message">{ar ? "تم تفعيل الحماية." : "Protection enabled."}</p> : null}
      {error ? <p className="auth-message" role="alert">{error}</p> : null}
      <p className="auth-intro" style={{ marginTop: 18, fontSize: 12 }}>{ar ? "ملاحظة: التحقق عبر SMS يحتاج مزود رسائل مفعّل. لا نعتبر مجرد إدخال رقم الهاتف توثيقًا." : "Note: SMS verification requires a configured messaging provider. Entering a phone number alone never counts as verified."}</p>
    </div>
  </section>;
}
