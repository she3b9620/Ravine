"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "ravine-home-welcome-login-session-v3";
const USER_KEY = "ravine-home-welcome-user-v3";
const CONSUMED_KEY = "ravine-home-welcome-consumed-v3";

function isHomeRoute(pathname: string) {
  const path = pathname.replace(/\/$/, "");
  return path === "/ar" || path === "/en";
}

function applySettled(hero: HTMLElement) {
  hero.classList.remove("ravine-home-welcome-settling");
  hero.classList.add("ravine-home-welcome-settled");
}

function getHero() {
  return document.querySelector<HTMLElement>(".home-viewer-hero");
}

function createLoginMarker(userId: string) {
  const token = `${Date.now()}-${crypto.randomUUID()}`;
  sessionStorage.setItem(SESSION_KEY, token);
  sessionStorage.setItem(USER_KEY, userId);
  sessionStorage.removeItem(CONSUMED_KEY);
  return token;
}

function clearWelcomeState() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(CONSUMED_KEY);
}

export default function HomeWelcomeMotion() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let cleanupRun: (() => void) | undefined;

    const runForHome = (userId: string) => {
      if (cancelled || !isHomeRoute(pathname)) return;

      const hero = getHero();
      if (!hero) return;

      const loginSession = sessionStorage.getItem(SESSION_KEY);
      const storedUserId = sessionStorage.getItem(USER_KEY);
      const consumedSession = sessionStorage.getItem(CONSUMED_KEY);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!loginSession || storedUserId !== userId) {
        createLoginMarker(userId);
        hero.classList.remove("ravine-home-welcome-settling", "ravine-home-welcome-settled");
      }

      const activeSession = sessionStorage.getItem(SESSION_KEY);
      if (!activeSession) return;

      if (consumedSession === activeSession || reduceMotion) {
        applySettled(hero);
        return;
      }

      if (hero.dataset.ravineWelcomeMotionBound === activeSession) return;
      hero.dataset.ravineWelcomeMotionBound = activeSession;

      const settleTimer = window.setTimeout(() => {
        if (cancelled || sessionStorage.getItem(SESSION_KEY) !== activeSession) return;
        hero.classList.add("ravine-home-welcome-settling");

        const finishTimer = window.setTimeout(() => {
          if (cancelled || sessionStorage.getItem(SESSION_KEY) !== activeSession) return;
          applySettled(hero);
          sessionStorage.setItem(CONSUMED_KEY, activeSession);
          delete hero.dataset.ravineWelcomeFinishTimer;
        }, 1500);

        hero.dataset.ravineWelcomeFinishTimer = String(finishTimer);
      }, 3000);

      cleanupRun = () => {
        window.clearTimeout(settleTimer);
        const finishTimer = hero.dataset.ravineWelcomeFinishTimer;
        if (finishTimer) window.clearTimeout(Number(finishTimer));
        delete hero.dataset.ravineWelcomeFinishTimer;
        if (hero.dataset.ravineWelcomeMotionBound === activeSession) delete hero.dataset.ravineWelcomeMotionBound;
      };
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        cleanupRun?.();
        cleanupRun = undefined;
        clearWelcomeState();
        const hero = getHero();
        if (hero) {
          hero.classList.remove("ravine-home-welcome-settling", "ravine-home-welcome-settled");
          delete hero.dataset.ravineWelcomeMotionBound;
        }
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        const existingSession = sessionStorage.getItem(SESSION_KEY);
        const existingUserId = sessionStorage.getItem(USER_KEY);
        if (!existingSession || existingUserId !== session.user.id) {
          createLoginMarker(session.user.id);
        }
        window.setTimeout(() => runForHome(session.user.id), 0);
      }
    });

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted || cancelled) return;
      const user = data.session?.user;
      if (!user) {
        clearWelcomeState();
        return;
      }

      // sessionStorage survives reloads/navigation in the same tab. Do not invent a new login marker during reload.
      if (sessionStorage.getItem(USER_KEY) !== user.id || !sessionStorage.getItem(SESSION_KEY)) {
        createLoginMarker(user.id);
      }

      window.setTimeout(() => runForHome(user.id), 0);
    });

    return () => {
      mounted = false;
      cancelled = true;
      cleanupRun?.();
      authListener.subscription.unsubscribe();
    };
  }, [pathname]);

  return null;
}
