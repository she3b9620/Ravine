import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeRAVINEWorkType, toRAVINEWork } from "../lib/ravine-work-universe.ts";
import {
  canPublishRAVINEContent,
  canStartRAVINELive,
  getRAVINECreatorCapabilities,
} from "../lib/ravine-creator-capabilities.ts";

test("Viewer may publish Shorts without a tier quota, but not start live", () => {
  assert.deepEqual(canPublishRAVINEContent("viewer", "short", 500), {
    allowed: true,
    reason: "allowed",
  });
  assert.equal(canPublishRAVINEContent("viewer", "video", 9).allowed, true);
  assert.deepEqual(canPublishRAVINEContent("viewer", "video", 10), {
    allowed: false,
    reason: "monthly_quota_reached",
  });
  assert.equal(canPublishRAVINEContent("viewer", "podcast", 0).reason, "tier_restricted");
  assert.equal(canStartRAVINELive("viewer"), false);
});

test("Creator limits film formats and cannot publish podcasts or documentaries", () => {
  assert.equal(canPublishRAVINEContent("creator", "video", 999).allowed, true);
  assert.equal(canPublishRAVINEContent("creator", "short_film", 1).allowed, true);
  assert.equal(canPublishRAVINEContent("creator", "short_film", 2).reason, "monthly_quota_reached");
  assert.equal(canPublishRAVINEContent("creator", "feature_film", 0).allowed, true);
  assert.equal(canPublishRAVINEContent("creator", "feature_film", 1).reason, "monthly_quota_reached");
  assert.equal(canPublishRAVINEContent("creator", "documentary", 0).reason, "tier_restricted");
  assert.equal(canStartRAVINELive("creator"), true);
});

test("Elevated Creator has separate podcast and documentary quotas", () => {
  assert.equal(canPublishRAVINEContent("elevated_creator", "podcast", 4).allowed, true);
  assert.equal(canPublishRAVINEContent("elevated_creator", "podcast", 5).reason, "monthly_quota_reached");
  assert.equal(canPublishRAVINEContent("elevated_creator", "documentary", 4).allowed, true);
  assert.equal(canPublishRAVINEContent("elevated_creator", "documentary", 5).reason, "monthly_quota_reached");
});

test("Artist has no tier quota for ordinary work and caps feature films at three", () => {
  assert.equal(canPublishRAVINEContent("artist", "podcast", 999).allowed, true);
  assert.equal(canPublishRAVINEContent("artist", "short_film", 999).allowed, true);
  assert.equal(canPublishRAVINEContent("artist", "feature_film", 2).allowed, true);
  assert.equal(canPublishRAVINEContent("artist", "feature_film", 3).reason, "monthly_quota_reached");
});

test("Elevated Artist has no tier-based monthly quota across all work types", () => {
  const capabilities = getRAVINECreatorCapabilities("elevated_artist");
  for (const [contentType, policy] of Object.entries(capabilities.content)) {
    assert.equal(policy.allowed, true, `${contentType} should be allowed`);
    assert.equal(policy.monthlyLimit, null, `${contentType} should have no tier quota`);
    assert.equal(
      canPublishRAVINEContent("elevated_artist", contentType, 100000).allowed,
      true,
    );
  }
});

test("A zero limit means tier-restricted; a reached positive limit means quota reached", () => {
  assert.equal(canPublishRAVINEContent("viewer", "short_film", 0).reason, "tier_restricted");
  assert.equal(canPublishRAVINEContent("viewer", "video", 10).reason, "monthly_quota_reached");
});


test("Work universe normalizes every dedicated format while preserving legacy film records", () => {
  assert.equal(normalizeRAVINEWorkType("short"), "short");
  assert.equal(normalizeRAVINEWorkType("video"), "video");
  assert.equal(normalizeRAVINEWorkType("podcast"), "podcast");
  assert.equal(normalizeRAVINEWorkType("documentary"), "documentary");
  assert.equal(normalizeRAVINEWorkType("short_film"), "short_film");
  assert.equal(normalizeRAVINEWorkType("feature_film"), "feature_film");
  assert.equal(normalizeRAVINEWorkType("film"), "film");
  assert.equal(normalizeRAVINEWorkType("unknown"), "video");
});


test("Legacy Studio film subtype is preserved by the Work Universe adapter", () => {
  const shortFilm = toRAVINEWork({
    id: 101,
    title: "Short film",
    description: null,
    thumbnail_url: null,
    video_url: "https://media.example/short-film.mp4",
    duration: 120,
    content_type: "film",
    work_format: "short_film",
    published: true,
    visibility: "public",
    discovery_enabled: true,
    creator_id: 1,
  });
  const featureFilm = toRAVINEWork({
    id: 102,
    title: "Feature film",
    description: null,
    thumbnail_url: null,
    video_url: "https://media.example/feature-film.mp4",
    duration: 5400,
    content_type: "film",
    work_format: "feature_film",
    published: true,
    visibility: "public",
    discovery_enabled: true,
    creator_id: 1,
  });
  assert.equal(shortFilm.type, "short_film");
  assert.equal(featureFilm.type, "feature_film");
});


test("re-publishing a work with a changed type checks destination quota", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261017130000_ravine_creator_publish_rpc.sql", import.meta.url),
    "utf8",
  );
  assert.match(
    migration,
    /and not exists\s*\([\s\S]*?where work_id = v_work_id\s+and quota_month = v_month\s+and work_type = p_work_type\s*\)/,
  );
});
