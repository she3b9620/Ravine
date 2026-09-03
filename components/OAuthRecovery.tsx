"use client";

import { useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function OAuthRecovery() {
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    async function recover() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!active) return;
        if (!error) {
          window.history.replaceState({}, document.title, `/${locale}`);
          window.location.replace(`/${locale}`);
        }
        return;
      }

      const signedIn = Boolean((await supabase.auth.getUser()).data.user);
      if (!active || !signedIn) return;

      if (
        window.location.pathname === `/${locale}/auth` &&
        (url.searchParams.has("error") || window.location.hash)
      ) {
        window.history.replaceState({}, document.title, `/${locale}`);
        window.location.replace(`/${locale}`);
      }
    }

    void recover();

    return () => {
      active = false;
    };
  }, [locale, supabase]);

  return null;
}
