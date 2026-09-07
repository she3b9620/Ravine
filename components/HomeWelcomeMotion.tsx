"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "ravine-home-welcome-collapse-v1";
const LEGACY_WELCOME_KEY = "ravine-home-welcome-seen-v1";

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

export default function HomeWelcomeMotion() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!isHomeRoute(pathname)) return;

    if (!isAuthenticated()) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_WELCOME_KEY);
      return;
    }

    const hero = document.querySelector<HTMLElement>(".home-viewer-hero");
    if (!hero || hero.dataset.ravineWelcomeMotionBound === "1") return;
    hero.dataset.ravineWelcomeMotionBound = "1";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The full-scene transition supersedes the older paragraph-only welcome effect.
    sessionStorage.setItem(LEGACY_WELCOME_KEY, "1");

    if (reduceMotion || sessionStorage.getItem(STORAGE_KEY) === "1") {
      applySettled(hero);
      return;
    }

    // Let the signed-in welcome composition breathe briefly before resolving into For You.
    const settleTimer = window.setTimeout(() => {
      hero.classList.add("ravine-home-welcome-settling");

      const finishTimer = window.setTimeout(() => {
        applySettled(hero);
        sessionStorage.setItem(STORAGE_KEY, "1");
      }, 1050);

      hero.dataset.ravineWelcomeFinishTimer = String(finishTimer);
    }, 1200);

    return () => {
      window.clearTimeout(settleTimer);
      const finishTimer = hero.dataset.ravineWelcomeFinishTimer;
      if (finishTimer) window.clearTimeout(Number(finishTimer));
      delete hero.dataset.ravineWelcomeFinishTimer;
    };
  }, [pathname]);

  return null;
}
