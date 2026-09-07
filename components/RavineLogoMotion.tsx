"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export const RAVINE_LOGO_MOTION_KEY = "ravine-logo-motion";

function applyLogoMotion(enabled: boolean, authenticated: boolean) {
  const root = document.documentElement;
  root.dataset.ravineAuth = authenticated ? "authenticated" : "guest";
  root.dataset.ravineLogoMotion = authenticated && enabled ? "on" : "off";
}

export default function RavineLogoMotion() {
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const sync = async (authenticatedHint?: boolean) => {
      const authenticated = authenticatedHint ?? Boolean((await supabase.auth.getUser()).data.user);
      if (!active) return;
      const stored = window.localStorage.getItem(RAVINE_LOGO_MOTION_KEY);
      applyLogoMotion(stored !== "off", authenticated);
    };

    void sync(false);
    void supabase.auth.getUser().then(({ data }) => sync(Boolean(data.user)));

    const onChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      if (typeof customEvent.detail?.enabled !== "boolean") return;
      void supabase.auth.getUser().then(({ data }) => {
        if (!active) return;
        applyLogoMotion(customEvent.detail!.enabled!, Boolean(data.user));
      });
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== RAVINE_LOGO_MOTION_KEY) return;
      void supabase.auth.getUser().then(({ data }) => {
        if (!active) return;
        applyLogoMotion(event.newValue !== "off", Boolean(data.user));
      });
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        applyLogoMotion(false, false);
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        const stored = window.localStorage.getItem(RAVINE_LOGO_MOTION_KEY);
        applyLogoMotion(stored !== "off", Boolean(session?.user));
      }
    });

    window.addEventListener("ravine-logo-motion-change", onChange);
    window.addEventListener("storage", onStorage);

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener("ravine-logo-motion-change", onChange);
      window.removeEventListener("storage", onStorage);
      applyLogoMotion(false, false);
    };
  }, []);

  return null;
}
