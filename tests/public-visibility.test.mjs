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

test("both work detail routes refuse non-public or unpublished media", () => {
  for (const path of ["../app/[locale]/watch/[id]/page.tsx", "../app/[locale]/work/[id]/page.tsx"]) {
    const source = read(path);
    assert.match(source, /\.eq\("published", true\)/, path);
    assert.match(source, publicVisibility, path);
  }
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
  assert.match(library, /from\("video_likes"\)/);
  assert.match(library, /from\("video_saves"\)/);
});

test("username-based public profile excludes unpublished and non-public creator work", () => {
  const source = read("../app/[locale]/u/[username]/page.tsx");
  assert.match(source, /\.eq\("published",true\)/);
  assert.match(source, /\.eq\("visibility","public"\)/);
});
