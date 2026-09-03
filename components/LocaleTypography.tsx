"use client";

import { useEffect } from "react";

const ARABIC_LETTERS = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_LETTERS = /[A-Za-z]/;
const ASCII_DIGITS = /[0-9]/g;
const ARABIC_INDIC_DIGITS = /[\u0660-\u0669]/g;

function toArabicIndic(value: string) {
  return value.replace(ASCII_DIGITS, (digit) => String.fromCharCode(0x0660 + Number(digit)));
}

function toLatinDigits(value: string) {
  return value.replace(ARABIC_INDIC_DIGITS, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function shouldSkipTextNode(node: Text) {
  const element = node.parentElement;
  if (!element) return true;
  return Boolean(element.closest("script, style, noscript, code, pre"));
}

function normalizeTextNode(node: Text, defaultArabic: boolean) {
  if (shouldSkipTextNode(node)) return;

  const text = node.nodeValue ?? "";
  if (!text) return;

  const explicitLocale = node.parentElement?.closest("[lang]")?.getAttribute("lang");
  const isArabic = explicitLocale === "ar" || (!explicitLocale && ARABIC_LETTERS.test(text));
  const isEnglish = explicitLocale === "en" || (!explicitLocale && !ARABIC_LETTERS.test(text) && LATIN_LETTERS.test(text));

  let normalized = text;
  if (isArabic) normalized = toArabicIndic(normalized);
  else if (isEnglish) normalized = toLatinDigits(normalized);
  else if (defaultArabic) normalized = toArabicIndic(normalized);

  if (normalized !== text) node.nodeValue = normalized;
}

function normalizeInputValue(element: HTMLInputElement | HTMLTextAreaElement, defaultArabic: boolean) {
  if (element.type === "number") return;

  const value = element.value;
  if (!value) return;

  const explicitLocale = element.closest("[lang]")?.getAttribute("lang");
  const hasArabic = explicitLocale === "ar" || (!explicitLocale && ARABIC_LETTERS.test(value));
  const hasEnglish = explicitLocale === "en" || (!explicitLocale && !ARABIC_LETTERS.test(value) && LATIN_LETTERS.test(value));

  let normalized = value;
  if (hasArabic) normalized = toArabicIndic(normalized);
  else if (hasEnglish) normalized = toLatinDigits(normalized);
  else if (defaultArabic && ARABIC_INDIC_DIGITS.test(value)) normalized = toArabicIndic(normalized);

  ARABIC_INDIC_DIGITS.lastIndex = 0;
  ASCII_DIGITS.lastIndex = 0;

  if (normalized !== value) {
    const selectionStart = element.selectionStart;
    const selectionEnd = element.selectionEnd;
    element.value = normalized;
    if (selectionStart !== null && selectionEnd !== null) {
      element.setSelectionRange(selectionStart, selectionEnd);
    }
  }
}

export default function LocaleTypography() {
  useEffect(() => {
    const root = document.documentElement;
    const defaultArabic = root.lang === "ar";

    const normalizeTree = (container: Node) => {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let current: Node | null;
      while ((current = walker.nextNode())) nodes.push(current as Text);
      nodes.forEach((node) => normalizeTextNode(node, defaultArabic));
    };

    normalizeTree(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) normalizeTextNode(node as Text, defaultArabic);
          else if (node.nodeType === Node.ELEMENT_NODE) normalizeTree(node);
        });
        if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
          normalizeTextNode(mutation.target as Text, defaultArabic);
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const handleInput = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        normalizeInputValue(target, defaultArabic);
      }
    };

    document.addEventListener("input", handleInput, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", handleInput, true);
    };
  }, []);

  return null;
}
