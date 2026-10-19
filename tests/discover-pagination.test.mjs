import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../app/[locale]/discover/page.tsx");
const css = read("../app/[locale]/discover/discover-enhancements.module.css");

test("Discover counts all matching public work and slices it into stable server-side pages", () => {
  assert.match(page, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(page, /const pageSize = 48/);
  assert.match(page, /\.range\(\(currentPage - 1\) \* pageSize, currentPage \* pageSize - 1\)/);
  assert.match(page, /\.order\("created_at", \{ ascending: firstParam\(filters\.sort\) === "oldest" \}\)/);
  assert.match(page, /sort === "views"/);
  assert.match(page, /sort === "likes"/);
  assert.match(page, /\.order\("views", \{ ascending: false, nullsFirst: false \}\)/);
  assert.match(page, /\.order\("likes", \{ ascending: false, nullsFirst: false \}\)/);
  assert.match(page, /\.order\("id", \{ ascending: false \}\)/);
  assert.match(page, /formatRavineNumber\(totalWorkCount, locale\)/);
});

test("Discover clamps invalid and oversized page values before applying the database range", () => {
  const pageValidation = page.indexOf("const requestedPage =");
  const count = page.indexOf("const workCountResult = await countRequest");
  const clamp = page.indexOf("const currentPage = Math.min(requestedPage, pageCount)");
  const range = page.indexOf(".range((currentPage - 1) * pageSize");
  assert.ok(pageValidation >= 0);
  assert.ok(count > pageValidation);
  assert.ok(clamp > count);
  assert.ok(range > clamp);
  assert.match(page, /Number\.isSafeInteger\(rawPage\) && rawPage > 0 \? rawPage : 1/);
});

test("pagination preserves safe active filters, search, and ordering and resets itself when filters change", () => {
  assert.match(page, /params\.set\("q", query\)/);
  assert.match(page, /params\.set\("category", String\(categoryId\)\)/);
  assert.match(page, /params\.set\("type", type\)/);
  assert.match(page, /params\.set\("duration", duration!\)/);
  assert.match(page, /params\.set\("format", format!\)/);
  assert.match(page, /params\.set\("quality", quality!\)/);
  assert.match(page, /\["oldest", "views", "likes"\]\.includes\(sort \|\| ""\)/);
  assert.match(page, /params\.set\("sort", sort!\)/);
  const filters = read("../components/DiscoverFilters.tsx");
  assert.match(filters, /value: "views", ar: "الأكثر مشاهدة", en: "Most viewed"/);
  assert.match(filters, /value: "likes", ar: "الأكثر إعجابًا", en: "Most liked"/);
  assert.match(page, /params\.set\("page", String\(targetPage\)\)/);
  assert.doesNotMatch(filters, /params\.set\("page"/);
});

test("page controls are bilingual, keyboard focusable, labelled, and responsive to light theme and reduced motion", () => {
  assert.match(page, /aria-label=\{isArabic \? "صفحات الأعمال" : "Work pages"\}/);
  assert.match(page, /aria-current="page"/);
  assert.match(page, /aria-disabled="true"/);
  assert.match(page, /"السابق" : "Previous"/);
  assert.match(page, /"التالي" : "Next"/);
  assert.match(css, /\.discover-pagination-link:focus-visible/);
  assert.match(css, /html\[data-theme="light"\] \.discover-pagination-link/);
  assert.match(css, /prefers-reduced-motion:reduce\).*discover-pagination-link/);
});
