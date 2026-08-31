"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/ar/auth/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "If an account exists for this email, a password reset link has been sent."
      );
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mb-6 text-3xl font-black tracking-[0.18em] text-[#C47A52]">
            RAVINE
          </div>

          <h1 className="text-3xl font-bold">Forgot password?</h1>

          <p className="mt-3 text-sm text-[#F1E9DC]/60">
            Enter your email and we&apos;ll send you a secure reset link.
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

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-[#C47A52] px-4 py-3 font-semibold text-[#090909] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
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