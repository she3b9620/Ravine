"use client";

import { useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function AuthSessionRecovery() {
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    async function recover() {
      const currentUrl = new URL(window.location.href);
      const code = currentUrl.searchParams.get("code");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!active) return;
          if (!error) {
            window.history.replaceState({}, document.title, `/${locale}`);
            window.location.replace(`/${locale}`);
            return;
          }
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!active) return;
          if (!error) {
            window.history.replaceState({}, document.title, `/${locale}`);
            window.location.replace(`/${locale}`);
            return;
          }
        }
      } catch {
        // Leave normal auth state handling in place; do not trap the user on a callback URL.
      }
    }

    void recover();
    return () => {
      active = false;
    };
  }, [locale, supabase]);

  return null;
}
