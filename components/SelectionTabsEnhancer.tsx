"use client";

import { useEffect } from "react";

const PERIODS = [
  ["daily", "يومية", "Daily"],
  ["weekly", "أسبوعية", "Weekly"],
  ["monthly", "شهرية", "Monthly"],
  ["yearly", "سنوية", "Yearly"],
] as const;

type PeriodKey = (typeof PERIODS)[number][0];

const originalOrders = new WeakMap<HTMLElement, HTMLElement[]>();
let scheduledEnhance = false;

function periodKey(text: string): PeriodKey | null {
  const normalized = text.trim();
  return PERIODS.find(([, ar, en]) => normalized === ar || normalized === en)?.[0] ?? null;
}

function rememberOriginalOrder(grid: HTMLElement) {
  if (!originalOrders.has(grid)) originalOrders.set(grid, Array.from(grid.children) as HTMLElement[]);
  const remembered = originalOrders.get(grid) ?? [];
  const current = Array.from(grid.children) as HTMLElement[];
  for (const card of current) if (!remembered.includes(card)) remembered.push(card);
  originalOrders.set(grid, remembered);
  return remembered;
}

function getIndexes(length: number, period: PeriodKey) {
  if (length < 2) return Array.from({ length }, (_, index) => index);
  if (period === "daily") return Array.from({ length }, (_, index) => index);
  if (period === "weekly") return Array.from({ length }, (_, index) => (index + 2) % length);
  if (period === "monthly") return Array.from({ length }, (_, index) => length - 1 - index);
  return Array.from({ length }, (_, index) => (index % 2 === 0 ? Math.floor(index / 2) : Math.ceil(length / 2) + Math.floor(index / 2))).filter((index) => index < length);
}

function animateReorder(grid: HTMLElement, ordered: HTMLElement[]) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const before = new Map<HTMLElement, DOMRect>();
  for (const card of ordered) before.set(card, card.getBoundingClientRect());

  const fragment = document.createDocumentFragment();
  ordered.forEach((card) => fragment.appendChild(card));
  grid.appendChild(fragment);

  const after = new Map<HTMLElement, DOMRect>();
  for (const card of ordered) after.set(card, card.getBoundingClientRect());

  grid.dataset.ravineSelectionAnimating = "1";
  for (const card of ordered) {
    const from = before.get(card);
    const to = after.get(card);
    if (!from || !to) continue;
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    card.style.transition = "none";
    card.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    card.style.opacity = "0.72";
  }

  void grid.offsetHeight;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (const card of ordered) {
        card.style.transition = "transform .62s cubic-bezier(.22,1,.36,1), opacity .42s ease";
        card.style.transform = "translate3d(0, 0, 0)";
        card.style.opacity = "1";
      }

      window.setTimeout(() => {
        for (const card of ordered) {
          card.style.transition = "";
          card.style.transform = "";
          card.style.opacity = "";
        }
        delete grid.dataset.ravineSelectionAnimating;
      }, 700);
    });
  });
}

function reorderCards(grid: HTMLElement, period: PeriodKey, animate = true) {
  const remembered = rememberOriginalOrder(grid);
  const current = new Set(Array.from(grid.children) as HTMLElement[]);
  const source = remembered.filter((card) => current.has(card));
  const indexes = getIndexes(source.length, period);
  const ordered = indexes.map((index) => source[index]).filter((card): card is HTMLElement => Boolean(card));

  source.forEach((card) => {
    if (!ordered.includes(card)) ordered.push(card);
  });

  if (animate) animateReorder(grid, ordered);
  else {
    const fragment = document.createDocumentFragment();
    ordered.forEach((card) => fragment.appendChild(card));
    grid.appendChild(fragment);
  }

  grid.dataset.ravineSelectionPeriod = period;
}

function bindTab(tab: HTMLElement, tabs: HTMLElement, grid: HTMLElement) {
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
    reorderCards(grid, key, true);
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
}

function enhance() {
  document.querySelectorAll<HTMLElement>(".selection-section").forEach((section) => {
    const tabs = section.querySelector<HTMLElement>(".selection-tabs");
    const grid = section.querySelector<HTMLElement>(".video-grid");
    if (!tabs || !grid) return;

    rememberOriginalOrder(grid);
    tabs.querySelectorAll<HTMLElement>(".selection-tab").forEach((tab) => bindTab(tab, tabs, grid));

    if (grid.dataset.ravineSelectionInitialized !== "1") {
      const active = tabs.querySelector<HTMLElement>(".selection-tab.active") ?? tabs.querySelector<HTMLElement>(".selection-tab");
      const key = active ? periodKey(active.textContent || "") : null;
      if (key) reorderCards(grid, key, false);
      grid.dataset.ravineSelectionInitialized = "1";
    }
  });
}

export default function SelectionTabsEnhancer() {
  useEffect(() => {
    enhance();
    const observer = new MutationObserver(() => {
      if (scheduledEnhance) return;
      scheduledEnhance = true;
      requestAnimationFrame(() => {
        scheduledEnhance = false;
        enhance();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
