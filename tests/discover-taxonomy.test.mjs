import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Discover filter types include every structured media catalog type", () => {
  const filters = read("../components/DiscoverFilters.tsx");
  const page = read("../app/[locale]/discover/page.tsx");
  for (const type of ["video", "short", "short_film", "film", "series", "documentary", "podcast", "live"]) {
    assert.ok(filters.includes('value: "' + type + '"'), "Missing filter option: " + type);
    assert.ok(page.includes('"' + type + '"'), "Discover does not allow: " + type);
  }
});

test("Search API accepts the full Discover media taxonomy", () => {
  const route = read("../app/api/search/route.ts");
  for (const type of ["video", "short", "short_film", "film", "series", "documentary", "podcast", "live"]) {
    assert.ok(route.includes('"' + type + '"'), "Search API does not allow: " + type);
  }
});

test("Search API and Discover sanitize PostgREST delimiters and wildcard characters", () => {
  const route = read("../app/api/search/route.ts");
  const discover = read("../app/[locale]/discover/page.tsx");
  assert.ok(route.includes('replace(/[,()%*]/g, " ")'));
  assert.ok(route.includes('replace(/\\s+/g, " ")'));
  assert.ok(discover.includes('replace(/[,()%*]/g, " ")'));
  assert.ok(discover.includes('replace(/\\s+/g, " ")'));
  assert.ok(discover.includes("slice(0, 120)"));
});


test("Discover searches published work and creator identities together", () => {
  const page = read("../app/[locale]/discover/page.tsx");
  assert.ok(page.includes("creatorRequest"));
  assert.ok(page.includes('from("creators")'));
  assert.ok(page.includes("name.ilike.%"));
  assert.ok(page.includes('discover-result-section discover-creator-results'));
  assert.ok(page.includes("Matching creators"));
  assert.ok(page.includes("المبدعون المطابقون"));
  assert.ok(page.includes('.eq("visibility", "public")'));
});


test("Discover includes public creator identities, categories, scheduled events, and public communities", () => {
  const page = read("../app/[locale]/discover/page.tsx");
  assert.ok(page.includes('from("creators")'));
  assert.ok(page.includes('from("categories")'));
  assert.ok(page.includes('from("live_events")'));
  assert.ok(page.includes('from("communities")'));
  assert.ok(page.includes('.eq("is_active", true)'));
  assert.ok(page.includes('.eq("privacy", "public")'));
  assert.ok(page.includes('className="discover-category-list"'));
  assert.ok(page.includes('discover-result-section discover-event-results'));
  assert.ok(page.includes('discover-result-section discover-community-results'));
  assert.ok(page.includes('eq("visibility", "public")'));
  assert.ok(page.includes("<RAVINEEventsCatalog locale={locale} items={eventItems} />"));
});


test("Search launcher offers the full media taxonomy and only quality/format values accepted by the API", () => {
  const launcher = read("../components/SearchLauncher.tsx");
  const route = read("../app/api/search/route.ts");
  for (const type of ["video", "short", "short_film", "film", "series", "documentary", "podcast", "live"]) {
    assert.ok(launcher.includes('value: "' + type + '"'), "Missing modal type: " + type);
    assert.ok(route.includes('"' + type + '"'), "API does not accept: " + type);
  }
  for (const quality of ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2k", "4K"]) {
    assert.ok(launcher.includes('value: "' + quality + '"'), "Missing modal quality: " + quality);
    assert.ok(route.includes('"' + quality + '"'), "API does not accept: " + quality);
  }
  assert.ok(launcher.includes('value: "other"'));
  assert.ok(route.includes('"other"'));
});
