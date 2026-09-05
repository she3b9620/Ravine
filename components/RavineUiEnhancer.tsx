"use client";

import { useEffect } from "react";

const FOLLOW_PERMISSION = /permission denied for table follows/i;
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const USER_IDENTITY_SELECTOR = [
  "[data-preserve-numerals]",
  "[data-username]",
  "[data-user-name]",
  "[data-handle]",
  "[data-user-handle]",
  ".username",
  ".user-name",
  ".user_name",
  ".handle",
  ".user-handle",
  ".creator-username",
  ".creator-handle",
  ".handleLine",
  ".nameRow",
  ".profile-name",
  ".profile-username",
  '[class*="username"]',
  '[class*="user-name"]',
  '[class*="handle"]',
].join(",");

function walkTextNodes(root: Node, replace: (value: string, node: Text) => string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null = walker.nextNode();
  while (current) {
    if (current.nodeValue) nodes.push(current as Text);
    current = walker.nextNode();
  }
  for (const node of nodes) {
    const next = replace(node.nodeValue || "", node);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}

function toArabicIndicDigits(value: string) {
  return value.replace(/[0-9]/g, (digit) => ARABIC_DIGITS[Number(digit)]);
}

function shouldPreserveNumerals(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;

  if (parent.closest(USER_IDENTITY_SELECTOR)) return true;
  if (parent.closest("input, textarea, code, pre, kbd, samp, script, style")) return true;
  if (parent.closest("[data-numeric-literal]")) return true;

  return false;
}

function localizeArabicNumerals() {
  const shell = document.querySelector('.ravine-shell[lang="ar"]');
  if (!shell) return;

  walkTextNodes(shell, (value, node) => {
    if (shouldPreserveNumerals(node)) return value;
    return toArabicIndicDigits(value);
  });
}

function localizeFollowErrors() {
  const shell = document.querySelector('.ravine-shell[lang="ar"]');
  if (!shell) return;
  walkTextNodes(shell, (value) => {
    if (FOLLOW_PERMISSION.test(value)) return value.replace(FOLLOW_PERMISSION, "لا تملك صلاحية الوصول إلى المتابعات حاليًا.");
    return value;
  });
}

function enhanceSelectionTabs() {
  const labels = new Map([
    ["يومية", "daily"], ["أسبوعية", "weekly"], ["شهرية", "monthly"], ["سنوية", "yearly"],
    ["Daily", "daily"], ["Weekly", "weekly"], ["Monthly", "monthly"], ["Yearly", "yearly"],
  ]);

  document.querySelectorAll(".selection-tabs button, .selection-tabs a").forEach((element) => {
    const text = element.textContent?.trim() || "";
    const key = labels.get(text);
    if (!key) return;
    element.classList.add("ravine-period-tab");
    element.setAttribute("data-ravine-period", key);
    if (!element.hasAttribute("aria-pressed")) element.setAttribute("aria-pressed", element.classList.contains("active") ? "true" : "false");
    if (element.dataset.ravineBound === "1") return;
    element.dataset.ravineBound = "1";
    element.addEventListener("click", () => {
      const container = element.closest(".selection-tabs");
      container?.querySelectorAll(".ravine-period-tab").forEach((tab) => {
        const active = tab === element;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-pressed", active ? "true" : "false");
      });
    });
  });
}

function appendGuestAbout() {
  const main = document.querySelector(".guest-shell .ravine-main");
  if (!main || main.querySelector(".ravine-guest-about")) return;
  const locale = document.documentElement.lang === "en" ? "en" : "ar";

  const section = document.createElement("section");
  section.className = "section about-section ravine-guest-about";
  section.innerHTML = locale === "ar"
    ? `<div class="home-feed-label">رَافِين / عن المنصة</div><div class="about-grid"><div><h2>مساحة تعطي العمل حقّه.</h2></div><div><p class="about-lead">رَافِين منصة إبداعية سينمائية تُبنى حول العمل نفسه: كيف صُنِع، من يقف خلفه، ما الذي ألهمه، وما الحوار الذي يفتحه. نريد اكتشافًا أهدأ، هوية أوضح للمبدعين، وسياقًا يجعل كل عمل جزءًا من قصة أكبر.</p><div class="about-principles"><div><strong>العمل أولًا</strong><span>الضجيج والأرقام وسائل للاكتشاف، لا معيارًا وحيدًا للقيمة.</span></div><div><strong>المبدع كاملًا</strong><span>الهوية والاعتمادات ومسار الأعمال تعيش معًا بدل أن تتجزأ في قنوات منفصلة.</span></div><div><strong>رحلة مترابطة</strong><span>من العمل إلى المجتمع والجلسات المباشرة والبرامج الصوتية ثم العودة إلى الحوار.</span></div></div></div></div>`
    : `<div class="home-feed-label">RAVINE / ABOUT</div><div class="about-grid"><div><h2>A space that gives the work its due.</h2></div><div><p class="about-lead">RAVINE is a cinematic creative platform built around the work itself: how it was made, who stands behind it, what shaped it, and what conversation it can open. We want calmer discovery, clearer creator identity, and enough context for every work to belong to a larger story.</p><div class="about-principles"><div><strong>Work first</strong><span>Noise and numbers can aid discovery without becoming the sole measure of value.</span></div><div><strong>Creators in full</strong><span>Identity, credits and the body of work live together instead of splitting across separate channels.</span></div><div><strong>A connected journey</strong><span>Move from work to community, Live and Podcast, then back into conversation.</span></div></div></div></div>`;

  main.appendChild(section);
}

export default function RavineUiEnhancer() {
  useEffect(() => {
    localizeArabicNumerals();
    localizeFollowErrors();
    enhanceSelectionTabs();
    appendGuestAbout();

    const observer = new MutationObserver(() => {
      localizeArabicNumerals();
      localizeFollowErrors();
      enhanceSelectionTabs();
      appendGuestAbout();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
