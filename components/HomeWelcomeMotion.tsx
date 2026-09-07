"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const COMPLETED_KEY = "ravine-home-welcome-completed-v4";

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

export default function HomeWelcomeMotion() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let cleanupRun: (() => void) | undefined;

    const runForHome = () => {
      if (cancelled || !isHomeRoute(pathname)) return;

      const hero = getHero();
      if (!hero) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (localStorage.getItem(COMPLETED_KEY) === "1") {
        applySettled(hero);
        return;
      }

      if (reduceMotion) {
        applySettled(hero);
        localStorage.setItem(COMPLETED_KEY, "1");
        return;
      }

      if (hero.dataset.ravineWelcomeMotionBound === "1") return;
      hero.dataset.ravineWelcomeMotionBound = "1";

      const settleTimer = window.setTimeout(() => {
        if (cancelled) return;
        hero.classList.add("ravine-home-welcome-settling");

        const finishTimer = window.setTimeout(() => {
          if (cancelled) return;
          applySettled(hero);
          localStorage.setItem(COMPLETED_KEY, "1");
          delete hero.dataset.ravineWelcomeFinishTimer;
        }, 1600);

        hero.dataset.ravineWelcomeFinishTimer = String(finishTimer);
      }, 3000);

      cleanupRun = () => {
        window.clearTimeout(settleTimer);
        const finishTimer = hero.dataset.ravineWelcomeFinishTimer;
        if (finishTimer) window.clearTimeout(Number(finishTimer));
        delete hero.dataset.ravineWelcomeFinishTimer;
        if (hero.dataset.ravineWelcomeMotionBound === "1") {
          delete hero.dataset.ravineWelcomeMotionBound;
        }
      };
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        cleanupRun?.();
        cleanupRun = undefined;
        const hero = getHero();
        if (hero) {
          hero.classList.remove("ravine-home-welcome-settling", "ravine-home-welcome-settled");
          delete hero.dataset.ravineWelcomeMotionBound;
        }
        return;
      }

      if (event === "SIGNED_IN") {
        window.setTimeout(runForHome, 0);
      }
    });

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted || cancelled || !data.session?.user) return;
      window.setTimeout(runForHome, 0);
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
