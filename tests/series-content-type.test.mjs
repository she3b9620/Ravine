import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../app/[locale]/series/page.tsx");
const nav = read("../components/SidebarNav.tsx");
const upload = read("../components/StudioUpload.tsx");
const manager = read("../components/StudioWorkManager.tsx");
const publisher = read("../app/api/studio/publish-work/route.ts");
const studioPage = read("../app/[locale]/studio/page.tsx");
const workModel = read("../lib/ravine-work-universe.ts");
const player = read("../components/RAVINEWorkPlayer.tsx");
const workContext = read("../components/RAVINEWorkContext.tsx");
const migration = read("../supabase/migrations/20261017100000_ravine_series_content_type.sql");

test("series page lists published series work and links to its RAVINE watch page", () => {
  assert.match(page, /\.eq\("published", true\)/);
  assert.match(page, /\.eq\("content_type", "series"\)/);
  assert.match(page, /\/\$\{locale\}\/watch\/\$\{work\.id\}/);
  assert.match(page, /No series published yet/);
});

test("series is discoverable in the sidebar and follows guest gating", () => {
  assert.match(nav, /\["series", "Series", "المسلسلات", Tv\]/);
  assert.match(nav, /\["series", "Series", "المسلسلات", Tv\]/);
  assert.match(nav, /new Set\(\["community", "cuts", "videos", "series", "live"/);
});

test("only the existing creator-owner publishing path is used for series", () => {
  assert.match(upload, /<option value="series">\{ar \? "مسلسل" : "Series"\}<\/option>/);
  assert.match(upload, /contentType === "series"/);
  assert.match(manager, /"film", "series"/);
  assert.match(publisher, /"film", "series"/);
  assert.match(publisher, /creator\.user_id !== auth\.user\.id/);
  assert.match(studioPage, /if \(!creator\)/);
  assert.match(studioPage, /<StudioUpload creatorId=\{creator\.id\}/);
});

test("series uses the canonical RAVINE work type and standard video player", () => {
  assert.match(workModel, /"film",\s*"series",\s*"documentary"/);
  assert.match(workModel, /value === "series"\) return "series"/);
  assert.match(player, /case "series":/);
  assert.match(workContext, /series: \{ ar: "مسلسل", en: "Series" \}/);
});

test("series content type shares existing video quota; no separate permission bypass", () => {
  assert.match(migration, /'documentary','series'/);
  assert.match(migration, /'video','film','documentary','series'/);
  assert.match(migration, /new\.user_id <> actor and not is_ravine_admin\(\)/);
  assert.match(migration, /where c\.id = new\.creator_id and c\.user_id = actor/);
});
