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
const workCatalog = read("../components/RAVINEWorkCatalog.tsx");
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

test("series is discoverable in the sidebar and public browsing remains available to guests", () => {
  assert.match(nav, /\["series", "Series", "المسلسلات", Tv\]/);
  assert.doesNotMatch(nav, /GUEST_GATED|requestRavineAuth/);
  assert.match(nav, /return \([\s\S]*?<Link key=\{slug\} href=\{href\}/);
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
  assert.match(catalog, /RAVINEMediaCatalogType = "short" \| "short_film" \| "film" \| "podcast" \| "video" \| "documentary"/);
  assert.match(catalog, /enTitle:\s*"Podcasts\."/);
  assert.match(catalog, /\.eq\("published",\s*true\)\.eq\("visibility",\s*"public"\)\.eq\("content_type",\s*contentType\)/);
  assert.match(catalog, /href:.*watch.*work\.id/);
  assert.match(workCatalog, /<Link href=\{work\.href\}/);
  assert.match(podcastStyles, /ravine-podcast-pill/);
});

test("Shorts viewers can switch between a standard grid and a vertical reels feed", () => {
  assert.match(mediaCatalog, /\.select\("id,title,description,thumbnail_url,video_url,duration,views,likes,quality,created_at"\)/);
  assert.match(mediaCatalog, /contentType\s*===\s*"short"\s*\?\s*<RAVINEShortsBrowse locale=\{locale\} works=\{works\}\s*\/>/);
  assert.match(shortsBrowse, /type ViewMode = "grid" \| "reels"/);
  assert.match(shortsBrowse, /ravine\.shorts\.view-mode\.v1/);
  assert.match(shortsBrowse, /localStorage\.getItem\(PREFERENCE_KEY\)/);
  assert.match(shortsBrowse, /localStorage\.setItem\(PREFERENCE_KEY, next\)/);
  assert.match(shortsBrowse, /IntersectionObserver/);
  assert.match(shortsBrowse, /visibilityRatiosRef/);
  assert.match(shortsBrowse, /manuallyPausedRef/);
  assert.match(shortsBrowse, /ratio >= 0\.25/);
  assert.match(shortsBrowse, /if \(id !== workId\) other\.pause\(\)/);
  assert.match(shortsBrowse, /activeRef\.current === rawId && !video\.paused/);
  assert.match(shortsBrowse, /activeRef\.current === workId && !video\.paused/);
  assert.match(shortsBrowse, /video\.play\(\)/);
  assert.match(shortsBrowse, /video\.pause\(\)/);
  assert.match(shortsBrowse, /resolveWorkPlaybackUrl\(work\.id, work\.video_url\)/);
  assert.match(shortsStyles, /scroll-snap-type: y proximity/);
  assert.match(shortsStyles, /@media \(max-width: 620px\)/);
});

test("film, podcast, and series catalogues share searchable and sortable results", () => {
  assert.match(workCatalog, /const \[query, setQuery\] = useState/);
  assert.match(workCatalog, /Most viewed/);
  assert.match(workCatalog, /Most liked/);
  assert.match(workCatalog, /visibleItems\.length === 0/);
  assert.match(workCatalog, /items\.filter/);
  assert.match(page, /RAVINEWorkCatalog locale=\{locale\} items=\{seriesItems\}/);
  assert.match(catalog, /RAVINEWorkCatalog locale=\{locale\} items=\{items\}/);
});

test("Shorts keep both view modes and add local search plus sort options", () => {
  assert.match(shortsBrowse, /const \[searchQuery, setSearchQuery\] = useState/);
  assert.match(shortsBrowse, /const \[sortMode, setSortMode\] = useState/);
  assert.match(shortsBrowse, /filteredWorks/);
  assert.match(shortsBrowse, /Search Shorts/);
  assert.match(shortsBrowse, /Most viewed/);
});



test("regular videos and documentaries use the shared public searchable catalog", () => {
  const videosPage = read("../app/[locale]/videos/page.tsx");
  const documentariesPage = read("../app/[locale]/documentaries/page.tsx");
  assert.match(videosPage, /RAVINEMediaCatalog locale=\{rawLocale === "en" \? "en" : "ar"\} contentType="video"/);
  assert.match(documentariesPage, /RAVINEMediaCatalog locale=\{rawLocale === "en" \? "en" : "ar"\} contentType="documentary"/);
  assert.match(catalog, /\.eq\("published",true\)\.eq\("visibility","public"\)\.eq\("content_type",contentType\)/);
  assert.match(catalog, /enTitle: "Videos\."/);
  assert.match(catalog, /enTitle: "Documentaries\."/);
});


const seriesDetail = read("../app/[locale]/series/[id]/page.tsx");
const seriesDetailStyles = read("../app/[locale]/series/series.module.css");

test("public series detail route resolves the series card destination and hides restricted titles", () => {
  assert.match(seriesDetail, /params: Promise<\{ locale: string; id: string \}>/);
  assert.match(seriesDetail, /Number\.isSafeInteger\(seriesId\)/);
  assert.match(seriesDetail, /from\("ravine_series_titles"\)/);
  assert.match(seriesDetail, /\.eq\("id", seriesId\)/);
  assert.match(seriesDetail, /\.eq\("published", true\)/);
  assert.match(seriesDetail, /\.eq\("visibility", "public"\)/);
  assert.match(seriesDetail, /if \(seriesError \|\| !seriesData\) notFound\(\)/);
});

test("series detail separates episodes by season and enforces public episode visibility", () => {
  assert.match(seriesDetail, /function groupEpisodes\(/);
  assert.match(seriesDetail, /\.eq\("series_id", series\.id\)/);
  assert.match(seriesDetail, /\.eq\("content_type", "series"\)/);
  assert.match(seriesDetail, /\.eq\("published", true\)/);
  assert.match(seriesDetail, /\.eq\("visibility", "public"\)/);
  assert.match(seriesDetail, /\.order\("season_number", \{ ascending: true \}\)/);
  assert.match(seriesDetail, /\.order\("episode_number", \{ ascending: true \}\)/);
  assert.match(seriesDetail, /seasonEpisodes\.sort/);
});

test("series detail provides bilingual season headings, episode playback links, and responsive styling", () => {
  assert.match(seriesDetail, /الموسم/);
  assert.match(seriesDetail, /Season/);
  assert.match(seriesDetail, /الحلقة/);
  assert.ok(seriesDetail.includes("watch/${work.id}"));
  assert.match(seriesDetail, /detailEmptyState/);
  assert.match(seriesDetailStyles, /\.detailHero/);
  assert.match(seriesDetailStyles, /\.episodeGrid/);
  assert.match(seriesDetailStyles, /@media \(max-width: 720px\)/);
  assert.match(seriesDetailStyles, /@media \(max-width: 480px\)/);
});


test("public catalog failures show localized recovery guidance instead of raw provider errors", () => {
  assert.doesNotMatch(catalog, /\{error\.message\}/);
  assert.match(catalog, /The catalogue could not retrieve works right now/);
  assert.match(catalog, /تعذّر جلب الأعمال الآن/);
  assert.doesNotMatch(page, /legacyResult\.error\.message/);
  assert.match(page, /The series catalogue could not be retrieved right now/);
  assert.match(page, /تعذّر استرجاع قائمة المسلسلات الآن/);
});


test("watching a public series episode provides a privacy-safe return link to its series", () => {
  const watchPage = read("../app/[locale]/watch/[id]/page.tsx");
  const watchStyles = read("../app/[locale]/watch/[id]/watch-creator.module.css");
  assert.match(watchPage, /series_id,season_number,episode_number/);
  assert.match(watchPage, /from\("ravine_series_titles"\)[\s\S]*?\.eq\("published", true\)[\s\S]*?\.eq\("visibility", "public"\)/);
  assert.ok(watchPage.includes("/${locale}/series/${seriesRecord.id}"));
  assert.match(watchPage, /seriesContext/);
  assert.match(watchStyles, /\.seriesContext/);
});
