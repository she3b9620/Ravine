import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/[locale]/studio/page.tsx", import.meta.url), "utf8");
const manager = readFileSync(new URL("../components/StudioWorkManager.tsx", import.meta.url), "utf8");
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
  assert.match(page, /Math\.max\(1, Math\.ceil\(safeFilteredTotalWorks \/ pageSize\)\)/);
  assert.match(page, /const currentPage = Math\.min\(validRequestedPage, pageCount\)/);
  assert.match(page, /const validRequestedPage = Number\.isSafeInteger\(requestedPage\) && requestedPage > 0 \? requestedPage : 1/);
  assert.match(page, /studioPageHref\(currentPage - 1, creator\.id\)/);
  assert.match(page, /studioPageHref\(currentPage \+ 1, creator\.id\)/);
  assert.match(page, /aria-label=\{ar \? "صفحات الأعمال" : "Work pages"\}/);
  assert.match(page, /aria-current="page"/);
  assert.match(page, /"السابق"/);
  assert.match(page, /"Next"/);
});

test("invalid and very large page numbers are normalized before the works range query", () => {
  const countQuery = page.indexOf('select("id", { count: "exact", head: true }).eq("creator_id", creator.id)');
  const rangeQuery = page.indexOf('.range((currentPage - 1) * pageSize, currentPage * pageSize - 1)');
  assert.ok(countQuery >= 0 && rangeQuery > countQuery);
  assert.match(page, /const currentPage = Math\.min\(validRequestedPage, pageCount\)/);
  assert.doesNotMatch(page, /const \[\{ data: initialWorks, count: totalWorks/);
});

test("pagination styling responds to small screens and reduced-motion preferences", () => {
  assert.match(styles, /\.pagination/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});


test("Studio search, status, type, and sort filters are applied before pagination across the full catalogue", () => {
  assert.ok(page.includes("const filteredCountQuery = supabase"));
  assert.ok(page.includes("filteredCountQuery.or("));
  assert.ok(page.includes("pageRequest.or("));
  assert.ok(page.includes('pageRequest.eq("published", true)'));
  assert.ok(page.includes('pageRequest.eq("published", false)'));
  assert.ok(page.includes('pageRequest.eq("content_type", workType)'));
  assert.ok(page.includes('pageRequest.order("views"'));
  assert.ok(page.includes('pageRequest.order("likes"'));
  assert.ok(page.includes('pageRequest.order("title"'));
  assert.ok(page.includes("safeFilteredTotalWorks / pageSize"));
});

test("pagination links preserve search and filters while form submissions start from page one", () => {
  for (const name of ["workSearch", "workStatus", "workType", "workSort"]) {
    assert.ok(page.includes(`params.set("${name}"`));
  }
  assert.ok(manager.includes('name="workPage" value="1"'));
  assert.ok(page.includes('new URLSearchParams({ creatorId: String(creatorId), workPage: String(pageNumber) })'));
});
