import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const publicVisibility = /\.eq\("visibility", "public"\)/;

test("discover and search only return published public works", () => {
  for (const path of ["../app/[locale]/discover/page.tsx", "../app/[locale]/search/page.tsx"]) {
    const source = read(path);
    assert.match(source, /\.eq\("published", true\)/, path + " must exclude drafts");
    assert.match(source, publicVisibility, path + " must exclude restricted visibility");
  }
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


test("watch history and legacy library hide unpublished and restricted work", () => {
  for (const path of ["../app/[locale]/history/page.tsx", "../app/[locale]/library/page.tsx"]) {
    const source = read(path);
    assert.match(source, /\.eq\("videos\.published", true\)/, path);
    assert.match(source, /\.eq\("videos\.visibility", "public"\)/, path);
  }
});
