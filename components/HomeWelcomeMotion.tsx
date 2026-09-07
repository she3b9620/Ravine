"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const COMPLETED_KEY = "ravine-home-welcome-login-cycle-v1";
const LOGIN_SIGNAL_KEY = "ravine-login-cycle-started";
const LOGIN_COOKIE = "ravine_login_cycle=1";
const SETTLE_DELAY_MS = 3000;
const EXIT_DURATION_MS = 3000;

function isHomeRoute(pathname: string) {
  const path = pathname.replace(/\/$/, "");
  return path === "/ar" || path === "/en";
}

function getHero() {
  return document.querySelector<HTMLElement>(".home-viewer-hero");
}

function clearHero(hero?: HTMLElement | null) {
  if (!hero) return;
  hero.classList.remove("ravine-home-welcome-settling", "ravine-home-welcome-settled");
  delete hero.dataset.ravineWelcomeMotionBound;
  delete hero.dataset.ravineWelcomeFinishTimer;
}

function consumeLoginSignal() {
  const sessionSignal = sessionStorage.getItem(LOGIN_SIGNAL_KEY) === "1";
  const cookieSignal = document.cookie.split(";").some((part) => part.trim() === LOGIN_COOKIE);
  if (!sessionSignal && !cookieSignal) return false;
  sessionStorage.removeItem(LOGIN_SIGNAL_KEY);
  if (cookieSignal) document.cookie = "ravine_login_cycle=; Max-Age=0; Path=/; SameSite=Lax";
  return true;
}

export default function HomeWelcomeMotion() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!isHomeRoute(pathname)) return;

    const supabase = createClient();
    let cancelled = false;
    let settleTimer: number | null = null;
    let finishTimer: number | null = null;

    const reset = () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      if (finishTimer !== null) window.clearTimeout(finishTimer);
      settleTimer = null;
      finishTimer = null;
      clearHero(getHero());
    };

    const runAfterLogin = (userId: string) => {
      if (cancelled || !isHomeRoute(pathname)) return;
      const hero = getHero();
      if (!hero) return;

      const key = `${COMPLETED_KEY}:${userId}`;
      if (sessionStorage.getItem(key) === "1") {
        hero.classList.add("ravine-home-welcome-settled");
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        sessionStorage.setItem(key, "1");
        hero.classList.add("ravine-home-welcome-settled");
        return;
      }

      reset();
      hero.dataset.ravineWelcomeMotionBound = "1";

      settleTimer = window.setTimeout(() => {
        if (cancelled) return;
        hero.classList.add("ravine-home-welcome-settling");

        finishTimer = window.setTimeout(() => {
          if (cancelled) return;
          hero.classList.remove("ravine-home-welcome-settling");
          hero.classList.add("ravine-home-welcome-settled");
          sessionStorage.setItem(key, "1");
          finishTimer = null;
          settleTimer = null;
        }, EXIT_DURATION_MS);
      }, SETTLE_DELAY_MS);
    };

    const maybeRunFromLoginSignal = async () => {
      if (!consumeLoginSignal()) return;
      const { data } = await supabase.auth.getUser();
      if (data.user) window.setTimeout(() => runAfterLogin(data.user!.id), 0);
    };

    const clearLoginCycle = () => {
      reset();
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(`${COMPLETED_KEY}:`))
        .forEach((key) => sessionStorage.removeItem(key));
      sessionStorage.removeItem(LOGIN_SIGNAL_KEY);
      document.cookie = "ravine_login_cycle=; Max-Age=0; Path=/; SameSite=Lax";
    };

    void maybeRunFromLoginSignal();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearLoginCycle();
        return;
      }
      if (event === "SIGNED_IN" && session?.user) {
        if (sessionStorage.getItem(LOGIN_SIGNAL_KEY) === "1") void maybeRunFromLoginSignal();
        else window.setTimeout(() => runAfterLogin(session.user.id), 0);
      }
    });

    return () => {
      cancelled = true;
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      if (finishTimer !== null) window.clearTimeout(finishTimer);
      authListener.subscription.unsubscribe();
    };
  }, [pathname]);

  return null;
}
