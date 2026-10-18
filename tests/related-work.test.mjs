import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Work Universe offers related public work by creator and format", () => {
  const page = read("../app/[locale]/work/[id]/page.tsx");
  const catalog = read("../components/RAVINEWorkCatalog.tsx");
  assert.match(page, /creator_id/);
  assert.match(page, /\.eq\("content_type", data\.content_type\)/);
  assert.match(page, /relatedById\.size >= 6/);
  assert.match(page, /\.eq\("published", true\)/);
  assert.match(page, /\.eq\("visibility", "public"\)/);
  assert.match(page, /\.eq\("search_visible", true\)/);
  assert.match(page, /\.neq\("id", workId\)/);
  assert.match(page, /<RAVINEWorkCatalog locale=\{locale\} items=\{relatedItems\}/);
  assert.match(catalog, /type RAVINECatalogItem/);
});

test("related work metadata is fetched only after primary work access is verified", () => {
  const page = read("../app/[locale]/work/[id]/page.tsx");
  const accessCheck = page.indexOf("await canAccessRAVINEVideo(supabase, data)");
  const relatedQuery = page.lastIndexOf('from("videos")');
  assert.ok(accessCheck >= 0 && relatedQuery > accessCheck);
});


test("cinematic Watch experience also continues into related, public-only work", () => {
  const page = read("../app/[locale]/watch/[id]/page.tsx");
  assert.match(page, /await canAccessRAVINEVideo\(supabase, video\)/);
  assert.match(page, /\.eq\("creator_id", video\.creator_id\)/);
  assert.match(page, /\.eq\("content_type", video\.content_type\)/);
  assert.match(page, /\.eq\("published", true\)/);
  assert.match(page, /\.eq\("visibility", "public"\)/);
  assert.match(page, /\.eq\("search_visible", true\)/);
  assert.match(page, /\.neq\("id", videoId\)/);
  assert.match(page, /<RAVINEWorkCatalog locale=\{locale\} items=\{relatedItems\}/);
  const accessCheck = page.indexOf("await canAccessRAVINEVideo(supabase, video)");
  const relatedQuery = page.lastIndexOf('from("videos")');
  assert.ok(accessCheck >= 0 && relatedQuery > accessCheck);
});
