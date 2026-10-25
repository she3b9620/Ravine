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
      try {
        const authenticated = authenticatedHint ?? Boolean((await supabase.auth.getUser()).data.user);
        if (!active) return;
        const stored = window.localStorage.getItem(RAVINE_LOGO_MOTION_KEY);
        applyLogoMotion(stored !== "off", authenticated);
      } catch {
        if (!active) return;
        applyLogoMotion(false, false);
      }
    };

    void sync(false);
    void sync();

    const onChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      if (typeof customEvent.detail?.enabled !== "boolean") return;
      void sync().then(() => {
        if (!active) return;
        const enabled = customEvent.detail?.enabled ?? false;
        applyLogoMotion(enabled, document.documentElement.dataset.ravineAuth === "authenticated");
      });
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== RAVINE_LOGO_MOTION_KEY) return;
      void sync().then(() => {
        if (!active) return;
        applyLogoMotion(event.newValue !== "off", document.documentElement.dataset.ravineAuth === "authenticated");
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
