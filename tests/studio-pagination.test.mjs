import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/[locale]/studio/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/[locale]/studio/studio.module.css", import.meta.url), "utf8");

test("Creator Studio uses query-driven, server-side pagination instead of silently truncating at 50 works", () => {
  assert.match(page, /searchParams: Promise/);
  assert.match(page, /workPage\?: string/);
  assert.match(page, /const pageSize = 50/);
  assert.match(page, /\.range\(\(currentPage - 1\) \* pageSize, currentPage \* pageSize - 1\)/);
  assert.match(page, /count: "exact"/);
  assert.doesNotMatch(page, /\.limit\(50\)/);
  assert.match(page, /Showing /);
  assert.match(page, /عرض /);
});

test("the Studio summary counts all published works and drafts, independent of the visible page", () => {
  assert.match(page, /\.eq\("published", true\)/);
  assert.match(page, /\.eq\("published", false\)/);
  assert.match(page, /publishedCountResult\.count/);
  assert.match(page, /draftCountResult\.count/);
  assert.match(page, /statisticsError/);
  assert.match(page, /Statistics unavailable/);
});

test("pagination navigation is accessible, localized, and keeps page numbers bounded", () => {
  assert.match(page, /Math\.max\(1, Math\.ceil\(safeTotalWorks \/ pageSize\)\)/);
  assert.match(page, /if \(currentPage > pageCount\) currentPage = pageCount/);
  assert.match(page, /workPage=\$\{currentPage - 1\}/);
  assert.match(page, /workPage=\$\{currentPage \+ 1\}/);
  assert.match(page, /aria-label=\{ar \? "صفحات الأعمال" : "Work pages"\}/);
  assert.match(page, /aria-current="page"/);
  assert.match(page, /"السابق"/);
  assert.match(page, /"Next"/);
});

test("pagination styling responds to small screens and reduced-motion preferences", () => {
  assert.match(styles, /\.pagination/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
