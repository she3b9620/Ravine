"use client";

import { useEffect } from "react";

const PERIODS = [["daily", "يومية", "Daily"], ["weekly", "أسبوعية", "Weekly"], ["monthly", "شهرية", "Monthly"], ["yearly", "سنوية", "Yearly"]] as const;
type PeriodKey = (typeof PERIODS)[number][0];
const originalOrders = new WeakMap<HTMLElement, HTMLElement[]>();
const animationTimers = new WeakMap<HTMLElement, number>();
let scheduledEnhance = false;
function periodKey(text: string): PeriodKey | null { const normalized = text.trim(); return PERIODS.find(([, ar, en]) => normalized === ar || normalized === en)?.[0] ?? null; }
function rememberOriginalOrder(grid: HTMLElement) { if (!originalOrders.has(grid)) originalOrders.set(grid, Array.from(grid.children) as HTMLElement[]); const remembered = originalOrders.get(grid) ?? []; const current = Array.from(grid.children) as HTMLElement[]; for (const card of current) if (!remembered.includes(card)) remembered.push(card); originalOrders.set(grid, remembered); return remembered; }
function getIndexes(length: number, period: PeriodKey) { if (length < 2) return Array.from({ length }, (_, index) => index); if (period === "daily") return Array.from({ length }, (_, index) => index); if (period === "weekly") return Array.from({ length }, (_, index) => (index + 2) % length); if (period === "monthly") return Array.from({ length }, (_, index) => length - 1 - index); return Array.from({ length }, (_, index) => (index % 2 === 0 ? Math.floor(index / 2) : Math.ceil(length / 2) + Math.floor(index / 2))).filter((index) => index < length); }
function clearAnimation(grid: HTMLElement) { const timer = animationTimers.get(grid); if (timer) window.clearTimeout(timer); animationTimers.delete(grid); delete grid.dataset.ravineSelectionPhase; delete grid.dataset.ravineSelectionAnimating; }
function physicalReorder(grid: HTMLElement, ordered: HTMLElement[]) { const fragment = document.createDocumentFragment(); ordered.forEach((card) => fragment.appendChild(card)); grid.appendChild(fragment); }
function animateReorder(grid: HTMLElement, ordered: HTMLElement[]) {
  clearAnimation(grid);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { physicalReorder(grid, ordered); return; }
  grid.dataset.ravineSelectionAnimating = "1";
  grid.dataset.ravineSelectionPhase = "leaving";
  const leaveTimer = window.setTimeout(() => {
    physicalReorder(grid, ordered);
    grid.dataset.ravineSelectionPhase = "entering";
    const enterTimer = window.setTimeout(() => clearAnimation(grid), 680);
    animationTimers.set(grid, enterTimer);
  }, 190);
  animationTimers.set(grid, leaveTimer);
}
function reorderCards(grid: HTMLElement, period: PeriodKey, animate = true) {
  const remembered = rememberOriginalOrder(grid);
  const current = new Set(Array.from(grid.children) as HTMLElement[]);
  const source = remembered.filter((card) => current.has(card));
  const indexes = getIndexes(source.length, period);
  const ordered = indexes.map((index) => source[index]).filter((card): card is HTMLElement => Boolean(card));
  source.forEach((card) => { if (!ordered.includes(card)) ordered.push(card); });
  const currentOrder = Array.from(grid.children);
  const unchanged = ordered.length === currentOrder.length && ordered.every((card, index) => card === currentOrder[index]);
  if (unchanged) { grid.dataset.ravineSelectionPeriod = period; return; }
  if (animate) animateReorder(grid, ordered); else physicalReorder(grid, ordered);
  grid.dataset.ravineSelectionPeriod = period;
}
function bindTab(tab: HTMLElement, tabs: HTMLElement, grid: HTMLElement) {
  const key = periodKey(tab.textContent || ""); if (!key) return;
  tab.classList.add("ravine-period-tab"); tab.dataset.ravinePeriod = key; tab.setAttribute("role", "tab");
  tab.setAttribute("tabindex", tab.classList.contains("active") ? "0" : "-1");
  tab.setAttribute("aria-selected", tab.classList.contains("active") ? "true" : "false");
  if (tab.dataset.ravineBound === "1") return;
  tab.dataset.ravineBound = "1";
  tab.addEventListener("click", () => {
    tabs.querySelectorAll<HTMLElement>(".selection-tab").forEach((item) => { const active = item === tab; item.classList.toggle("active", active); item.setAttribute("tabindex", active ? "0" : "-1"); item.setAttribute("aria-selected", active ? "true" : "false"); });
    reorderCards(grid, key, true);
  });
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    const all = Array.from(tabs.querySelectorAll<HTMLElement>(".selection-tab")); if (!all.length) return;
    event.preventDefault(); let index = all.indexOf(tab);
    if (event.key === "Home") index = 0; else if (event.key === "End") index = all.length - 1; else index = event.key === "ArrowLeft" ? (index - 1 + all.length) % all.length : (index + 1) % all.length;
    all[index].focus(); all[index].click();
  });
}
function enhance() {
  document.querySelectorAll<HTMLElement>(".selection-section").forEach((section) => {
    const tabs = section.querySelector<HTMLElement>(".selection-tabs"); const grid = section.querySelector<HTMLElement>(".video-grid"); if (!tabs || !grid) return;
    rememberOriginalOrder(grid); tabs.querySelectorAll<HTMLElement>(".selection-tab").forEach((tab) => bindTab(tab, tabs, grid));
    if (grid.dataset.ravineSelectionInitialized !== "1") {
      const active = tabs.querySelector<HTMLElement>(".selection-tab.active") ?? tabs.querySelector<HTMLElement>(".selection-tab");
      const key = active ? periodKey(active.textContent || "") : null; if (key) reorderCards(grid, key, false);
      grid.dataset.ravineSelectionInitialized = "1";
    }
  });
}
export default function SelectionTabsEnhancer() { useEffect(() => { enhance(); const observer = new MutationObserver(() => { if (scheduledEnhance) return; scheduledEnhance = true; requestAnimationFrame(() => { scheduledEnhance = false; enhance(); }); }); observer.observe(document.body, { childList: true, subtree: true }); return () => observer.disconnect(); }, []); return null; }
