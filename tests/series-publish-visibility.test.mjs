import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publisher = readFileSync(new URL("../app/api/studio/publish-work/route.ts", import.meta.url), "utf8");
const studioManager = readFileSync(new URL("../components/StudioWorkManager.tsx", import.meta.url), "utf8");
const studioPage = readFileSync(new URL("../app/[locale]/studio/page.tsx", import.meta.url), "utf8");
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


test("editing a series episode's visibility synchronizes the parent card from all remaining public episodes", () => {
  assert.ok(studioPage.includes('select("id,series_id,title,description,content_type,quality,published,visibility,video_url,views,likes,created_at")'));
  assert.ok(studioPage.includes('select("id", { count: "exact", head: true }).eq("creator_id", creator.id)'));
  assert.ok(studioPage.includes('<StudioWorkManager works={works} locale={locale} creatorId={creator.id} />'));
  assert.ok(studioManager.includes('if (originalType === "series" && originalWork?.series_id)'));
  assert.ok(studioManager.includes('.eq("series_id", originalWork.series_id)'));
  assert.ok(studioManager.includes('.eq("published", true)'));
  assert.ok(studioManager.includes('.eq("visibility", "public")'));
  assert.ok(studioManager.includes("published: hasPublicEpisode"));
  assert.ok(studioManager.includes('.eq("creator_id", creatorId)'));
});

test("failed series-visibility verification or parent update restores the edited episode metadata", () => {
  assert.ok(studioManager.includes("if (publicEpisodesError) {"));
  assert.ok(studioManager.includes("if (seriesUpdateError || !updatedSeries) {"));
  assert.ok(studioManager.includes("title: originalWork.title"));
  assert.ok(studioManager.includes('.select("id")\n            .maybeSingle()'));
});

test("failed series synchronization during unpublish attempts to restore the original episode publication state", () => {
  assert.ok(publisher.includes("if (remainingError) {"));
  assert.ok(publisher.includes("if (seriesUpdateError || !updatedSeries) {"));
  assert.ok(publisher.includes(".update({ published: Boolean(work.published) })"));
  assert.ok(publisher.includes("Could not verify remaining public episodes; the unpublish change was reverted or needs review."));
  assert.ok(publisher.includes("Could not synchronize series visibility; the unpublish change was reverted or needs review."));
});
