"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Factor = {
  id: string;
  status: "verified" | "unverified";
  friendly_name?: string | null;
  factor_type: string;
};

export default function SecurityPage() {
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [verifiedFactor, setVerifiedFactor] = useState<Factor | null>(null);

  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadSecurity() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = `/${locale}/auth?next=/${locale}/account/security`;
      return;
    }

    setEmail(user.email ?? "");

    const { data, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      setError(factorsError.message);
      setLoading(false);
      return;
    }

    const verified =
      data.totp?.find((factor) => factor.status === "verified") ?? null;

    setVerifiedFactor(verified);
    setLoading(false);
  }

  useEffect(() => {
    void loadSecurity();
  }, [locale, supabase]);

  async function startEnrollment() {
    setStarting(true);
    setError("");
    setMessage("");
    setQrCode("");
    setSecret("");
    setFactorId("");
    setChallengeId("");
    setCode("");

    try {
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) {
        throw factorsError;
      }

      const pending = factors.all?.filter(
        (factor) =>
          factor.factor_type === "totp" &&
          factor.status === "unverified"
      ) ?? [];

      for (const factor of pending) {
        const { error: removeError } =
          await supabase.auth.mfa.unenroll({
            factorId: factor.id,
          });

        if (removeError) {
          throw removeError;
        }
      }

      const { data, error: enrollError } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "RAVINE Authenticator",
        });

      if (enrollError) {
        throw enrollError;
      }

      if (!data?.id || !data?.totp?.qr_code || !data?.totp?.secret) {
        throw new Error(
          "Supabase did not return the TOTP QR code and secret."
        );
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: data.id,
        });

      if (challengeError) {
        throw challengeError;
      }

      setChallengeId(challenge.id);
    } catch (err) {
      console.error("RAVINE MFA ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start MFA setup."
      );
    } finally {
      setStarting(false);
    }
  }

  async function verifyCode() {
    setError("");
    setMessage("");

    if (!factorId || !challengeId) {
      setError("MFA setup is not ready.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setVerifying(true);

    const { error: verifyError } =
      await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

    if (verifyError) {
      setError(verifyError.message);
      setVerifying(false);
      return;
    }

    setMessage("Two-factor authentication is now enabled.");

    setQrCode("");
    setSecret("");
    setFactorId("");
    setChallengeId("");
    setCode("");

    await loadSecurity();

    setVerifying(false);
  }

  async function disableMfa() {
    if (!verifiedFactor) return;

    setVerifying(true);
    setError("");
    setMessage("");

    const { error: removeError } =
      await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });

    if (removeError) {
      setError(removeError.message);
    } else {
      setVerifiedFactor(null);
      setMessage("Two-factor authentication has been disabled.");
    }

    setVerifying(false);
  }

  async function signOutOthers() {
    setVerifying(true);
    setError("");
    setMessage("");

    const { error: signOutError } =
      await supabase.auth.signOut({
        scope: "others",
      });

    if (signOutError) {
      setError(signOutError.message);
    } else {
      setMessage("All other active sessions have been signed out.");
    }

    setVerifying(false);
  }

  if (loading) {
    return (
      <main dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-3xl text-center text-sm text-[#F1E9DC]/60">
          Loading security settings...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-16 text-[#F1E9DC]">
      <div className="mx-auto max-w-3xl">

        <div className="mb-10">
          <div className="mb-4 text-sm uppercase tracking-[0.25em] text-[#C47A52]">
            RAVINE SECURITY
          </div>

          <h1 className="text-4xl font-black">
            Security Center
          </h1>

          <p className="mt-3 text-[#F1E9DC]/60">
            Protect your account and control your security settings.
          </p>
        </div>

        <div className="space-y-5">

          <section className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6">
            <h2 className="text-xl font-semibold">
              Account email
            </h2>

            <p className="mt-3 break-all text-[#F1E9DC]/70">
              {email}
            </p>
          </section>

          <section className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6">

            <div className="flex items-start justify-between gap-5">

              <div>
                <h2 className="text-xl font-semibold">
                  Two-factor authentication
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F1E9DC]/60">
                  Add an authenticator app so your password alone is
                  not enough to access your account.
                </p>
              </div>

              <div
                className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                  verifiedFactor
                    ? "border-[#C47A52]/50 bg-[#C47A52]/10 text-[#C47A52]"
                    : "border-[#F1E9DC]/10 text-[#F1E9DC]/50"
                }`}
              >
                {verifiedFactor ? "Enabled" : "Not enabled"}
              </div>

            </div>

            {!verifiedFactor && !qrCode && (
              <button
                type="button"
                onClick={startEnrollment}
                disabled={starting}
                className="mt-6 rounded-2xl bg-[#C47A52] px-5 py-3 text-sm font-semibold text-[#090909] disabled:opacity-50"
              >
                {starting
                  ? "Preparing..."
                  : "Set up authenticator"}
              </button>
            )}

            {qrCode && (
              <div className="mt-8 rounded-3xl border border-[#F1E9DC]/10 bg-[#090909] p-6">

                <h3 className="text-lg font-semibold">
                  Scan the QR code
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#F1E9DC]/60">
                  Scan this code using Google Authenticator,
                  Microsoft Authenticator, 1Password, or another
                  TOTP-compatible application.
                </p>

                <div className="mt-6 flex justify-center rounded-2xl bg-white p-6">
                  <div
                    className="h-56 w-56"
                    aria-label="RAVINE authenticator QR code"
                    dangerouslySetInnerHTML={{ __html: qrCode }}
                  />
                </div>

                <div className="mt-6">
                  <div className="text-xs uppercase tracking-wider text-[#F1E9DC]/40">
                    Manual setup key
                  </div>

                  <code className="mt-2 block break-all rounded-2xl bg-[#151719] p-4 text-sm text-[#C47A52]">
                    {secret}
                  </code>
                </div>

                <label className="mt-6 block text-sm">
                  6-digit verification code

                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value.replace(/\D/g, "")
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#151719] px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none focus:border-[#C47A52]"
                    placeholder="000000"
                  />
                </label>

                <button
                  type="button"
                  onClick={verifyCode}
                  disabled={verifying || code.length !== 6}
                  className="mt-5 w-full rounded-2xl bg-[#C47A52] px-5 py-3 font-semibold text-[#090909] disabled:opacity-50"
                >
                  {verifying
                    ? "Verifying..."
                    : "Enable 2FA"}
                </button>

              </div>
            )}

            {verifiedFactor && !qrCode && (
              <div className="mt-6 flex flex-wrap items-center gap-3">

                <div className="rounded-2xl border border-[#183F46] bg-[#183F46]/20 px-4 py-3 text-sm text-[#F1E9DC]/70">
                  Authenticator app connected
                </div>

                <button
                  type="button"
                  onClick={disableMfa}
                  disabled={verifying}
                  className="rounded-2xl border border-red-400/30 px-4 py-3 text-sm text-red-200 disabled:opacity-50"
                >
                  Disable 2FA
                </button>

              </div>
            )}

          </section>

          <section className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6">

            <h2 className="text-xl font-semibold">
              Active sessions
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#F1E9DC]/60">
              Sign out every other active session while keeping
              this browser signed in.
            </p>

            <button
              type="button"
              onClick={signOutOthers}
              disabled={verifying}
              className="mt-6 rounded-2xl border border-[#C47A52]/50 px-5 py-3 text-sm hover:border-[#C47A52] disabled:opacity-50"
            >
              {verifying
                ? "Signing out..."
                : "Sign out other sessions"}
            </button>

          </section>

          {message && (
            <div className="rounded-2xl border border-[#183F46] bg-[#183F46]/20 p-4 text-sm text-[#F1E9DC]/80">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
              {error}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}