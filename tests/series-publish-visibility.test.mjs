import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publisher = readFileSync(new URL("../app/api/studio/publish-work/route.ts", import.meta.url), "utf8");
const seriesCatalog = readFileSync(new URL("../app/[locale]/series/page.tsx", import.meta.url), "utf8");
const seriesDetail = readFileSync(new URL("../app/[locale]/series/[seriesId]/page.tsx", import.meta.url), "utf8");

test("publishing any series episode synchronizes the parent series against actually public episodes", () => {
  assert.match(publisher, /if \(contentType === "series" && seriesIdForPublish\)/);
  assert.match(publisher, /\.eq\("series_id", seriesIdForPublish\)/);
  assert.match(publisher, /\.eq\("content_type", "series"\)/);
  assert.match(publisher, /\.eq\("published", true\)/);
  assert.match(publisher, /\.eq\("visibility", "public"\)/);
  assert.match(publisher, /const seriesIsPublic = Boolean\(remainingPublicEpisodes\?\.length\)/);
  assert.match(publisher, /published: seriesIsPublic/);
  assert.match(publisher, /\.eq\("creator_id", creator\.id\)/);
  assert.match(publisher, /\.eq\("user_id", auth\.user\.id\)/);
});

test("non-public episode visibility cannot leave a public series card with no public episodes", () => {
  assert.doesNotMatch(publisher, /contentType === "series" && visibility === "public" && seriesIdForPublish/);
  assert.match(publisher, /Could not verify public episodes/);
  assert.match(publisher, /Could not synchronize series visibility/);
  assert.match(publisher, /published: Boolean\(work\.published\)/);
  assert.match(publisher, /visibility: work\.visibility \|\| "public"/);
});

test("public series catalogue and detail page both require public, published records", () => {
  assert.match(seriesCatalog, /from\("ravine_series_titles"\)[\s\S]*?\.eq\("published", true\)[\s\S]*?\.eq\("visibility", "public"\)/);
  assert.match(seriesCatalog, /\.eq\("published", true\)\.eq\("visibility", "public"\)\.eq\("content_type", "series"\)/);
  assert.match(seriesDetail, /from\("ravine_series_titles"\)[\s\S]*?\.eq\("published", true\)[\s\S]*?\.eq\("visibility", "public"\)/);
  assert.match(seriesDetail, /\.eq\("published", true\)/);
  assert.match(seriesDetail, /\.eq\("visibility", "public"\)/);
});
