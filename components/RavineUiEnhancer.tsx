"use client";

import { useEffect } from "react";

const FOLLOW_PERMISSION = /permission denied for table follows/i;
const VIDEOS_RECURSION = /infinite recursion detected in policy for relation [\"']videos[\"']/i;
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const USER_IDENTITY_SELECTOR = ["[data-preserve-numerals]", "[data-username]", "[data-user-name]", "[data-display-name]", "[data-handle]", "[data-user-handle]", ".username", ".user-name", ".user_name", ".handle", ".user-handle", ".creator-username", ".creator-handle", ".handleLine", ".nameRow", ".profile-name", ".profile-username", "[class*='username']", "[class*='user-name']", "[class*='handle']"].join(",");

function walkTextNodes(root: Node, replace: (value: string, node: Text) => string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null = walker.nextNode();
  while (current) { if (current.nodeValue) nodes.push(current as Text); current = walker.nextNode(); }
  for (const node of nodes) { const next = replace(node.nodeValue || "", node); if (next !== node.nodeValue) node.nodeValue = next; }
}
function toArabicIndicDigits(value: string) { return value.replace(/[0-9]/g, (digit) => ARABIC_DIGITS[Number(digit)]); }
function shouldPreserveNumerals(node: Text) { const parent = node.parentElement; if (!parent) return true; if (parent.closest(USER_IDENTITY_SELECTOR)) return true; if (parent.closest("input, textarea, code, pre, kbd, samp, script, style")) return true; if (parent.closest("[data-numeric-literal]")) return true; if (parent.closest("a[href]") && parent.textContent?.trim() === node.nodeValue?.trim() && /(?:https?:\/\/|\/\b(?:ar|en)\b\/|^@)/i.test(node.nodeValue || "")) return true; return false; }
function localizeArabicNumerals() { const shell = document.querySelector('.ravine-shell[lang="ar"]'); if (!shell) return; walkTextNodes(shell, (value, node) => shouldPreserveNumerals(node) ? value : toArabicIndicDigits(value)); }
function localizeFollowErrors() { const shell = document.querySelector('.ravine-shell[lang="ar"]'); if (!shell) return; walkTextNodes(shell, (value) => FOLLOW_PERMISSION.test(value) ? value.replace(FOLLOW_PERMISSION, "لا تملك صلاحية الوصول إلى المتابعات حاليًا.") : value); }
function localizeVideosPolicyError() { if (document.documentElement.lang !== "ar") return; const root = document.querySelector('.ravine-shell[lang="ar"]') || document.body; walkTextNodes(root, (value) => VIDEOS_RECURSION.test(value) ? "تعذر تحميل بعض الأعمال مؤقتًا بسبب خطأ في صلاحيات قاعدة البيانات. تم إصلاح المشكلة، حدّث الصفحة وحاول مرة أخرى." : value); }

const PAGE_ICONS: Record<string, string> = {
  discover: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M17.8 6.2 15 9l-3 3-3 3-2.8 2.8"/></svg>',
  videos: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>',
  cuts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 4 12 16M18 4 6 20"/><circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><path d="M9 9h3m-3 6h3"/></svg>',
  podcasts: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>',
  documentaries: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m9 8 6 4-6 4z"/></svg>',
  live: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="m10 9 5 3-5 3z"/><path d="M8 3 6 5M16 3l2 2"/></svg>',
  creators: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M15 11a3 3 0 1 0 0-6M15 15.5a5.5 5.5 0 0 1 5.5 4.5"/></svg>',
  community: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v2"/><path d="M10 21h8a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3h-5a3 3 0 0 0-3 3v6z"/></svg>',
};

function enhanceContentPageHeadingIcons() {
  const path = window.location.pathname.split("/").filter(Boolean).pop() || ""; const iconMarkup = PAGE_ICONS[path]; if (!iconMarkup) return;
  const candidates = document.querySelectorAll(".section > h1, .discover-page h1, .live-page h1, .creators-page h1, .cuts-page h1"); const heading = Array.from(candidates).find((item) => !item.classList.contains("ravine-page-heading")); if (!(heading instanceof HTMLElement)) return;
  heading.classList.add("ravine-page-heading"); const icon = document.createElement("span"); icon.className = "ravine-page-heading-icon"; icon.innerHTML = iconMarkup; heading.prepend(icon);
}
function enhanceSelectionTabs() {
  const labels = new Map([["يومية", "daily"], ["أسبوعية", "weekly"], ["شهرية", "monthly"], ["سنوية", "yearly"], ["Daily", "daily"], ["Weekly", "weekly"], ["Monthly", "monthly"], ["Yearly", "yearly"]]);
  document.querySelectorAll(".selection-tabs button, .selection-tabs a").forEach((element) => { const key = labels.get(element.textContent?.trim() || ""); if (!key || !(element instanceof HTMLElement)) return; element.classList.add("ravine-period-tab"); element.setAttribute("data-ravine-period", key); if (!element.hasAttribute("aria-pressed")) element.setAttribute("aria-pressed", element.classList.contains("active") ? "true" : "false"); if (element.dataset.ravineBound === "1") return; element.dataset.ravineBound = "1"; element.addEventListener("click", () => { const container = element.closest(".selection-tabs"); container?.querySelectorAll(".ravine-period-tab").forEach((tab) => { const active = tab === element; tab.classList.toggle("active", active); tab.setAttribute("aria-pressed", active ? "true" : "false"); }); }); });
}
function isHomeRoute() { const path = window.location.pathname.replace(/\/$/, ""); return path === "/ar" || path === "/en"; }
function syncGuestAbout() {
  const existing = document.querySelectorAll(".ravine-guest-about"); if (!isHomeRoute()) { existing.forEach((section) => section.remove()); return; }
  const main = document.querySelector(".guest-shell .ravine-main"); if (!main || main.querySelector(".ravine-guest-about")) return;
  const shell = document.querySelector(".ravine-shell"); const locale = shell?.getAttribute("lang") === "en" ? "en" : "ar"; const section = document.createElement("section"); section.className = "section about-section ravine-guest-about";
  section.innerHTML = locale === "ar" ? `<div class="home-feed-label">رَافِين / عن المنصة</div><div class="about-grid"><div><h2>مساحة تعطي العمل حقّه.</h2></div><div><p class="about-lead">رَافِين منصة إبداعية سينمائية تُبنى حول العمل نفسه: كيف صُنِع، من يقف خلفه، ما الذي ألهمه، وما الحوار الذي يفتحه. نريد اكتشافًا أهدأ، هوية أوضح للمبدعين، وسياقًا يجعل كل عمل جزءًا من قصة أكبر.</p><div class="about-principles"><div><strong>العمل أولًا</strong><span>الضجيج والأرقام وسائل للاكتشاف، لا معيارًا وحيدًا للقيمة.</span></div><div><strong>المبدع كاملًا</strong><span>الهوية والاعتمادات ومسار الأعمال تعيش معًا بدل أن تتجزأ في قنوات منفصلة.</span></div><div><strong>رحلة مترابطة</strong><span>من العمل إلى المجتمع والجلسات المباشرة والبرامج الصوتية ثم العودة إلى الحوار.</span></div></div></div></div>` : `<div class="home-feed-label">RAVINE / ABOUT</div><div class="about-grid"><div><h2>A space that gives the work its due.</h2></div><div><p class="about-lead">RAVINE is a cinematic creative platform built around the work itself: how it was made, who stands behind it, what shaped it, and what conversation it can open. We want calmer discovery, clearer creator identity, and enough context for every work to belong to a larger story.</p><div class="about-principles"><div><strong>Work first</strong><span>Noise and numbers can aid discovery without becoming the sole measure of value.</span></div><div><strong>Creators in full</strong><span>Identity, credits and the body of work live together instead of splitting across separate channels.</span></div><div><strong>A connected journey</strong><span>Move from work to community, Live and Podcast, then back into conversation.</span></div></div></div></div>`;
  main.appendChild(section);
}

function enhanceViewerWelcome() {
  if (!isHomeRoute() || window.location.pathname.includes("/discover")) return;
  const block = document.querySelector<HTMLElement>(".home-viewer-welcome-copy"); if (!block || block.dataset.ravineWelcomeBound === "1") return;
  if (!document.querySelector(".ravine-shell:not(.guest-shell)")) return;
  block.dataset.ravineWelcomeBound = "1";
  const seenKey = "ravine-home-welcome-seen-v1";
  const paragraph = block.querySelector<HTMLParagraphElement>("p");
  if (!paragraph || sessionStorage.getItem(seenKey) === "1") { if (paragraph) paragraph.classList.add("is-settled"); return; }
  const ar = document.querySelector(".ravine-shell")?.getAttribute("lang") === "ar";
  window.setTimeout(() => {
    paragraph.classList.add("is-fading");
    window.setTimeout(() => {
      paragraph.textContent = ar ? "نرشّح لك أهم ما يستحق المشاهدة الآن، بناءً على جودة العمل وسياقه والإشارات التي تساعدك على اكتشاف شيء جديد." : "Here are the most important works to watch now, guided by craft, context, and signals that help you discover something new.";
      paragraph.classList.remove("is-fading"); paragraph.classList.add("is-recommendation", "is-settled");
      sessionStorage.setItem(seenKey, "1");
    }, 620);
  }, 3000);
}

export default function RavineUiEnhancer() {
  useEffect(() => {
    localizeArabicNumerals(); localizeFollowErrors(); localizeVideosPolicyError(); enhanceSelectionTabs(); syncGuestAbout(); enhanceContentPageHeadingIcons(); enhanceViewerWelcome();
    const observer = new MutationObserver(() => { localizeArabicNumerals(); localizeFollowErrors(); localizeVideosPolicyError(); enhanceSelectionTabs(); syncGuestAbout(); enhanceContentPageHeadingIcons(); enhanceViewerWelcome(); });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
