"use client";

import { useEffect } from "react";

const STORAGE_KEY = "ravine-home-welcome-collapse-v1";
const LEGACY_WELCOME_KEY = "ravine-home-welcome-seen-v1";

function isHomeRoute() {
  const path = window.location.pathname.replace(/\/$/, "");
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
  useEffect(() => {
    if (!isHomeRoute() || !isAuthenticated()) return;

    const hero = document.querySelector<HTMLElement>(".home-viewer-hero");
    if (!hero || hero.dataset.ravineWelcomeMotionBound === "1") return;
    hero.dataset.ravineWelcomeMotionBound = "1";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Prevent the legacy paragraph-only welcome animation from competing with the full hero transition.
    sessionStorage.setItem(LEGACY_WELCOME_KEY, "1");

    if (reduceMotion || sessionStorage.getItem(STORAGE_KEY) === "1") {
      applySettled(hero);
      return;
    }

    const settleTimer = window.setTimeout(() => {
      hero.classList.add("ravine-home-welcome-settling");

      window.setTimeout(() => {
        applySettled(hero);
        sessionStorage.setItem(STORAGE_KEY, "1");
      }, 900);
    }, 3000);

    return () => {
      window.clearTimeout(settleTimer);
    };
  }, []);

  return null;
}
