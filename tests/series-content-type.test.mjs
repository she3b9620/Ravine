import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../app/[locale]/series/page.tsx");
const podcastsPage = read("../app/[locale]/podcasts/page.tsx");
const mediaCatalog = read("../components/RAVINEMediaCatalog.tsx");
const shortsBrowse = read("../components/RAVINEShortsBrowse.tsx");
const shortsStyles = read("../components/RAVINEShortsBrowse.module.css");
const catalog = read("../components/RAVINEMediaCatalog.tsx");
const podcastStyles = read("../app/[locale]/podcasts/podcasts.module.css");
const nav = read("../components/SidebarNav.tsx");
const upload = read("../components/StudioUpload.tsx");
const manager = read("../components/StudioWorkManager.tsx");
const publisher = read("../app/api/studio/publish-work/route.ts");
const studioPage = read("../app/[locale]/studio/page.tsx");
const workModel = read("../lib/ravine-work-universe.ts");
const player = read("../components/RAVINEWorkPlayer.tsx");
const workContext = read("../components/RAVINEWorkContext.tsx");
const migration = read("../supabase/migrations/20261017140355_ravine_media_taxonomy_and_series_structure.sql");

test("series page lists published series work and links to its RAVINE watch page", () => {
  assert.match(page, /\.eq\("published", true\)/);
  assert.match(page, /\.eq\("content_type", "series"\)/);
  assert.match(page, /\/\$\{locale\}\/watch\/\$\{work\.id\}/);
  assert.match(page, /No series published yet/);
});

test("series is discoverable in the sidebar and follows guest gating", () => {
  assert.match(nav, /\["series", "Series", "المسلسلات", Tv\]/);
  assert.match(nav, /const GUEST_GATED = new Set\(\["community", "shorts", "cuts", "videos", "series", "live"/);
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
  assert.match(migration, /new\.content_type in \('video','film','short_film','documentary','series'\)/);
  assert.match(manager, /originalType === "series" \|\| editType === "series"/);
  assert.match(manager, /disabled=\{work\.content_type === "series"\}/);
  assert.match(manager, /value="series" disabled=\{work\.content_type !== "series"\}/);
  assert.match(migration, /new\.user_id <> actor and not is_ravine_admin\(\)/);
  assert.match(migration, /where c\.id = new\.creator_id and c\.user_id = actor/);
});

test("podcasts share the same public media-catalog layout used by film pages", () => {
  assert.match(podcastsPage, /RAVINEMediaCatalog locale=\{locale\} contentType="podcast"/);
  assert.match(catalog, /RAVINEMediaCatalogType = "short" \| "short_film" \| "film" \| "podcast"/);
  assert.match(catalog, /enTitle: "Podcasts\."/);
  assert.match(catalog, /\.eq\("published", true\)\.eq\("visibility", "public"\)\.eq\("content_type", contentType\)/);
  assert.match(catalog, /href=\{\`\/\$\{locale\}\/watch\/\$\{work\.id\}\`\}/);
  assert.match(podcastStyles, /ravine-podcast-pill/);
});

test("Shorts viewers can switch between a standard grid and a vertical reels feed", () => {
  assert.match(mediaCatalog, /\.select\("id,title,description,thumbnail_url,video_url,duration,views,likes,quality"\)/);
  assert.match(mediaCatalog, /contentType === "short" \? <RAVINEShortsBrowse locale=\{locale\} works=\{works\} \/>/);
  assert.match(shortsBrowse, /type ViewMode = "grid" \| "reels"/);
  assert.match(shortsBrowse, /ravine\.shorts\.view-mode\.v1/);
  assert.match(shortsBrowse, /localStorage\.getItem\(PREFERENCE_KEY\)/);
  assert.match(shortsBrowse, /localStorage\.setItem\(PREFERENCE_KEY, next\)/);
  assert.match(shortsBrowse, /IntersectionObserver/);
  assert.match(shortsBrowse, /video\.play\(\)/);
  assert.match(shortsBrowse, /video\.pause\(\)/);
  assert.match(shortsBrowse, /resolveWorkPlaybackUrl\(work\.id, work\.video_url\)/);
  assert.match(shortsStyles, /scroll-snap-type: y proximity/);
  assert.match(shortsStyles, /@media \(max-width: 620px\)/);
});
