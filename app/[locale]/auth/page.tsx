"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function clearStaleMfa() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (data?.currentLevel === "aal2") {
        setMfaRequired(false);
      }
    }

    clearStaleMfa();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/ar/auth/callback`,
          },
        });

        if (error) throw error;

        setMessage(
          "Check your email to confirm your account before signing in."
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) throw aalError;

      if (aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
        const { data: factors, error: factorsError } =
          await supabase.auth.mfa.listFactors();

        if (factorsError) throw factorsError;

        const factor = factors.totp?.find(
          (item) => item.status === "verified"
        );

        if (!factor) {
          throw new Error(
            "Your account requires MFA, but no verified authenticator was found."
          );
        }

        const { data: challenge, error: challengeError } =
          await supabase.auth.mfa.challenge({
            factorId: factor.id,
          });

        if (challengeError) throw challengeError;

        setMfaFactorId(factor.id);
        setMfaChallengeId(challenge.id);
        setMfaRequired(true);
        return;
      }

      const locale = window.location.pathname.split("/")[1] || "ar";
      window.location.href = `/${locale}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyMfa() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!/^\d{6}$/.test(mfaCode)) {
        throw new Error("Enter the 6-digit code from your authenticator app.");
      }

      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode,
      });

      if (error) throw error;

      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (!aal || aal.currentLevel !== "aal2") {
        throw new Error("MFA verification could not be completed.");
      }

      const locale = window.location.pathname.split("/")[1] || "ar";
      window.location.href = `/${locale}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "MFA verification failed."
      );
    } finally {
      setLoading(false);
    }
  }

  if (mfaRequired) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 text-center">
            <div className="mb-6 text-3xl font-black tracking-[0.18em] text-[#C47A52]">
              RAVINE
            </div>

            <h1 className="text-3xl font-bold">
              Two-factor authentication
            </h1>

            <p className="mt-3 text-sm text-[#F1E9DC]/60">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6 shadow-2xl">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              value={mfaCode}
              onChange={(event) =>
                setMfaCode(event.target.value.replace(/\D/g, ""))
              }
              className="w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none transition focus:border-[#C47A52]"
              placeholder="000000"
            />

            <button
              type="button"
              onClick={verifyMfa}
              disabled={loading || mfaCode.length !== 6}
              className="mt-5 w-full rounded-2xl bg-[#C47A52] px-4 py-3 font-semibold text-[#090909] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify and continue"}
            </button>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut({ scope: "local" });
                window.location.href = "/ar/auth";
              }}
              className="mt-4 w-full text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
            >
              Cancel and sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mb-6 text-3xl font-black tracking-[0.18em] text-[#C47A52]">
            RAVINE
          </div>

          <h1 className="text-3xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>

          <p className="mt-3 text-sm text-[#F1E9DC]/60">
            {mode === "signin"
              ? "Sign in to continue to RAVINE."
              : "Create your RAVINE account with your email."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6 shadow-2xl"
        >
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none transition focus:border-[#C47A52]"
              placeholder="you@example.com"
            />
          </label>

          <label className="mt-5 block text-sm">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none transition focus:border-[#C47A52]"
              placeholder="••••••••"
            />
          </label>

          <div className="mt-4 flex justify-end">
            <a
              href="/ar/auth/forgot-password"
              className="text-sm text-[#F1E9DC]/60 hover:text-[#C47A52]"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-[#C47A52] px-4 py-3 font-semibold text-[#090909] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>

          {message && (
            <div className="mt-4 rounded-2xl border border-[#183F46] bg-[#183F46]/20 p-4 text-sm leading-6">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage("");
              setError("");
            }}
            className="mt-5 w-full text-sm text-[#F1E9DC]/60 hover:text-[#C47A52]"
          >
            {mode === "signin"
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}