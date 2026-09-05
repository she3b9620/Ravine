"use client";

import { useEffect } from "react";

const PERIODS = [
  ["daily", "يومية", "Daily"],
  ["weekly", "أسبوعية", "Weekly"],
  ["monthly", "شهرية", "Monthly"],
  ["yearly", "سنوية", "Yearly"],
] as const;

function periodKey(text: string) {
  const normalized = text.trim();
  return PERIODS.find(([, ar, en]) => normalized === ar || normalized === en)?.[0] ?? null;
}

function reorderCards(grid: HTMLElement, period: string) {
  const cards = Array.from(grid.children) as HTMLElement[];
  if (cards.length < 2) return;

  const orders: Record<string, number[]> = {
    daily: cards.map((_, i) => i),
    weekly: cards.map((_, i) => (i + 2) % cards.length),
    monthly: cards.map((_, i) => cards.length - 1 - i),
    yearly: cards.map((_, i) => (i % 2 === 0 ? Math.floor(i / 2) : Math.ceil(cards.length / 2) + Math.floor(i / 2))).filter((i) => i < cards.length),
  };

  const indexes = orders[period] || orders.daily;
  const fragment = document.createDocumentFragment();
  const used = new Set<number>();
  indexes.forEach((index) => {
    const card = cards[index];
    if (card && !used.has(index)) {
      used.add(index);
      fragment.appendChild(card);
    }
  });
  cards.forEach((card, index) => {
    if (!used.has(index)) fragment.appendChild(card);
  });
  grid.appendChild(fragment);
}

function enhance() {
  document.querySelectorAll<HTMLElement>(".selection-section").forEach((section) => {
    const tabs = section.querySelector<HTMLElement>(".selection-tabs");
    const grid = section.querySelector<HTMLElement>(".video-grid");
    if (!tabs || !grid) return;

    tabs.querySelectorAll<HTMLElement>(".selection-tab").forEach((tab) => {
      const key = periodKey(tab.textContent || "");
      if (!key) return;
      tab.classList.add("ravine-period-tab");
      tab.dataset.ravinePeriod = key;
      tab.setAttribute("role", "tab");
      tab.setAttribute("tabindex", tab.classList.contains("active") ? "0" : "-1");
      tab.setAttribute("aria-selected", tab.classList.contains("active") ? "true" : "false");
      if (tab.dataset.ravineBound === "1") return;
      tab.dataset.ravineBound = "1";

      tab.addEventListener("click", () => {
        tabs.querySelectorAll<HTMLElement>(".selection-tab").forEach((item) => {
          const active = item === tab;
          item.classList.toggle("active", active);
          item.setAttribute("tabindex", active ? "0" : "-1");
          item.setAttribute("aria-selected", active ? "true" : "false");
        });
        reorderCards(grid, key);
      });

      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
        const all = Array.from(tabs.querySelectorAll<HTMLElement>(".selection-tab"));
        if (!all.length) return;
        event.preventDefault();
        let index = all.indexOf(tab);
        if (event.key === "Home") index = 0;
        else if (event.key === "End") index = all.length - 1;
        else index = event.key === "ArrowLeft" ? (index - 1 + all.length) % all.length : (index + 1) % all.length;
        all[index].focus();
        all[index].click();
      });
    });

    const active = tabs.querySelector<HTMLElement>(".selection-tab.active");
    const key = active ? periodKey(active.textContent || "") : null;
    if (key && grid.dataset.ravineSelectionInitialized !== "1") {
      reorderCards(grid, key);
      grid.dataset.ravineSelectionInitialized = "1";
    }
  });
}

export default function SelectionTabsEnhancer() {
  useEffect(() => {
    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
