"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "ravine-home-welcome-login-session-v2";
const CONSUMED_KEY = "ravine-home-welcome-consumed-v2";
const LEGACY_WELCOME_KEY = "ravine-home-welcome-seen-v1";
const LEGACY_COLLAPSE_KEY = "ravine-home-welcome-collapse-v1";

function isHomeRoute(pathname: string) {
  const path = pathname.replace(/\/$/, "");
  return path === "/ar" || path === "/en";
}

function isAuthenticated() {
  return Boolean(document.querySelector(".ravine-shell:not(.guest-shell)"));
}

function applySettled(hero: HTMLElement) {
  hero.classList.remove("ravine-home-welcome-settling");
  hero.classList.add("ravine-home-welcome-settled");
}

function prepareFreshLoginSession() {
  const token = `${Date.now()}-${crypto.randomUUID()}`;
  sessionStorage.setItem(SESSION_KEY, token);
  sessionStorage.removeItem(CONSUMED_KEY);
  sessionStorage.removeItem(LEGACY_COLLAPSE_KEY);
  return token;
}

export default function HomeWelcomeMotion() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const runForHome = () => {
      if (cancelled || !isHomeRoute(pathname)) return;

      if (!isAuthenticated()) {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(CONSUMED_KEY);
        sessionStorage.removeItem(LEGACY_WELCOME_KEY);
        sessionStorage.removeItem(LEGACY_COLLAPSE_KEY);
        return;
      }

      const hero = document.querySelector<HTMLElement>(".home-viewer-hero");
      if (!hero || hero.dataset.ravineWelcomeMotionBound === "1") return;
      hero.dataset.ravineWelcomeMotionBound = "1";

      const loginSession = sessionStorage.getItem(SESSION_KEY);
      const consumedSession = sessionStorage.getItem(CONSUMED_KEY);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      sessionStorage.setItem(LEGACY_WELCOME_KEY, "1");

      // A session token is created only by SIGNED_IN. Returning to Home during the same
      // authenticated session therefore skips the welcome scene after it has been consumed.
      if (!loginSession || consumedSession === loginSession || reduceMotion) {
        applySettled(hero);
        return;
      }

      // Keep the full welcome composition visible for three seconds after login.
      const settleTimer = window.setTimeout(() => {
        if (cancelled) return;
        hero.classList.add("ravine-home-welcome-settling");

        const finishTimer = window.setTimeout(() => {
          if (cancelled) return;
          applySettled(hero);
          const activeSession = sessionStorage.getItem(SESSION_KEY);
          if (activeSession) sessionStorage.setItem(CONSUMED_KEY, activeSession);
        }, 1200);

        hero.dataset.ravineWelcomeFinishTimer = String(finishTimer);
      }, 3000);

      return () => {
        window.clearTimeout(settleTimer);
        const finishTimer = hero.dataset.ravineWelcomeFinishTimer;
        if (finishTimer) window.clearTimeout(Number(finishTimer));
        delete hero.dataset.ravineWelcomeFinishTimer;
      };
    };

    const cleanupRun = runForHome();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        prepareFreshLoginSession();
        sessionStorage.removeItem(LEGACY_WELCOME_KEY);
        window.setTimeout(runForHome, 0);
      } else if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(CONSUMED_KEY);
        sessionStorage.removeItem(LEGACY_WELCOME_KEY);
        sessionStorage.removeItem(LEGACY_COLLAPSE_KEY);
        const hero = document.querySelector<HTMLElement>(".home-viewer-hero");
        if (hero) {
          hero.classList.remove("ravine-home-welcome-settling", "ravine-home-welcome-settled");
          delete hero.dataset.ravineWelcomeMotionBound;
        }
      }
    });

    return () => {
      cancelled = true;
      cleanupRun?.();
      authListener.subscription.unsubscribe();
    };
  }, [pathname]);

  return null;
}
