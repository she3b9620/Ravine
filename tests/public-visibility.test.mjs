import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const publicVisibility = /\.eq\("visibility", "public"\)/;

test("discover only returns published public works", () => {
  const source = read("../app/[locale]/discover/page.tsx");
  assert.match(source, /\.eq\("published", true\)/);
  assert.match(source, publicVisibility);
});

test("legacy search URLs redirect to the unified Discover experience", () => {
  const source = read("../app/[locale]/search/page.tsx");
  assert.ok(source.includes('redirect("/" + locale + "/discover" + suffix)'));
  assert.ok(source.includes('paramsOut.set("q", query)'));
  assert.ok(source.includes("paramsOut.toString()"));
});

test("live catalog and creator profile only include public published work", () => {
  for (const path of ["../app/[locale]/live/page.tsx", "../app/[locale]/creators/[id]/page.tsx"]) {
    const source = read(path);
    assert.match(source, /\.eq\("published", true\)/, path);
    assert.match(source, publicVisibility, path);
  }
});

test("work detail routes apply an explicit access check before returning media", () => {
  const watch = read("../app/[locale]/watch/[id]/page.tsx");
  const work = read("../app/[locale]/work/[id]/page.tsx");
  assert.match(watch, /await canAccessRAVINEVideo\(supabase, video\)/);
  assert.match(work, /await canAccessRAVINEVideo\(supabase, data\)/);
  const watchAccess = watch.indexOf("await canAccessRAVINEVideo(supabase, video)");
  const watchAssets = watch.indexOf('from("work_media_assets")');
  const workAccess = work.indexOf("await canAccessRAVINEVideo(supabase, data)");
  const workAssets = work.indexOf('from("work_media_assets")');
  const workRelatedVisibility = work.indexOf('.eq("visibility", "public")');
  assert.ok(watchAccess >= 0 && watchAssets > watchAccess);
  assert.ok(workAccess >= 0 && workAssets > workAccess);
  assert.ok(workRelatedVisibility > workAccess, "Related catalogue queries must filter to public works after the primary work passes its own access check.");
});

test("live search API filters public visibility as well as explicit search visibility", () => {
  const source = read("../app/api/search/route.ts");
  assert.match(source, /query\.eq\("published", true\)\.eq\("visibility", "public"\)\.eq\("search_visible", true\)/);
});


test("watch history hides unpublished or restricted work and library filters media rows", () => {
  const history = read("../app/[locale]/history/page.tsx");
  assert.match(history, /\.eq\("videos\.published", true\)/);
  assert.match(history, /\.eq\("videos\.visibility", "public"\)/);

  const library = read("../app/[locale]/library/page.tsx");
  assert.match(library, /\.eq\("published", true\)/);
  assert.match(library, /\.eq\("visibility", "public"\)/);
  assert.match(library, /const table: "video_likes" \| "video_saves" = mode === "liked" \? "video_likes" : "video_saves"/);
  assert.ok(library.includes('const table: "video_likes" | "video_saves" = mode === "liked" ? "video_likes" : "video_saves"'));
});

test("username-based public profile excludes unpublished and non-public creator work", () => {
  const source = read("../app/[locale]/u/[username]/page.tsx");
  assert.match(source, /\.eq\("published",true\)/);
  assert.match(source, /\.eq\("visibility","public"\)/);
});


test("public username profiles direct every visitor to Discover rather than another user's account", () => {
  const source = read("../app/[locale]/u/[username]/page.tsx");
  assert.ok(source.includes('href={`/${locale}/discover`}'));
  assert.ok(source.includes("استكشف رَافِين"));
  assert.ok(source.includes("Explore RAVINE"));
  assert.doesNotMatch(source, /href={`\/${locale}\/account`}[^\n]*Back to my account/);
});


test("public work-detail failures show localized recovery guidance instead of raw database errors", () => {
  const source = read("../app/[locale]/work/[id]/page.tsx");
  assert.doesNotMatch(source, /<span>\{error\.message\}<\/span>/);
  assert.match(source, /Work details could not be retrieved right now/);
  assert.match(source, /تعذّر جلب تفاصيل العمل الآن/);
});
