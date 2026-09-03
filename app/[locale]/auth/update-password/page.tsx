"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Your password has been updated successfully.");
      setPassword("");
      setConfirmPassword("");
    }

    setLoading(false);
  }

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-[#090909 px-5 py-20 text-[#F1E9DC]">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mb-6 text-3xl font-black tracking-[0.18em] text-[#C47A52]">
            RAVINE
          </div>

          <h1 className="text-3xl font-bold">Set a new password</h1>

          <p className="mt-3 text-sm text-[#F1E9DC]/60">
            Choose a new password for your RAVINE account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6 shadow-2xl"
        >
          <label className="block text-sm">
            New password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none transition focus:border-[#C47A52]"
              placeholder="At least 8 characters"
            />
          </label>

          <label className="mt-5 block text-sm">
            Confirm password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none transition focus:border-[#C47A52]"
              placeholder="Repeat your password"
            />
          </label>

          <button
            type="submit"
            disabled={loading || !ready}
            className="mt-6 w-full rounded-2xl bg-[#C47A52] px-4 py-3 font-semibold text-[#090909] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!ready
              ? "Waiting for secure session..."
              : loading
                ? "Updating..."
                : "Update password"}
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
        </form>
      </div>
    </main>
  );
}