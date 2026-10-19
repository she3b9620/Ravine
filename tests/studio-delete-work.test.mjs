import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../app/api/studio/delete-work/route.ts", import.meta.url), "utf8");

test("work deletion checks the current user and creator ownership before loading or deleting media", () => {
  const authCheck = route.indexOf("supabase.auth.getUser()");
  const ownershipCheck = route.indexOf("if (!ownsViaCreator)");
  const relatedMediaLookup = route.indexOf('from("work_media_assets")');
  const workDelete = route.indexOf('.from("videos")\n      .delete()');

  assert.ok(authCheck >= 0);
  assert.ok(ownershipCheck > authCheck);
  assert.ok(relatedMediaLookup > ownershipCheck);
  assert.ok(workDelete > relatedMediaLookup);
  assert.match(route, /\.eq\("work_id", videoId\)/);
  assert.match(route, /Cache-Control.*no-store/);
});

test("deletion only removes Cloudinary media from the configured account", () => {
  assert.match(route, /url\.hostname\.toLowerCase\(\) !== CLOUDINARY_HOST/);
  assert.match(route, /parts\[0\] === cloudName/);
  assert.match(route, /extractCloudinaryPublicId\(asset\.media_url, cloudName\)/);
  assert.match(route, /cloudinaryOwnedUrls\.some\(\(url\) => !extractCloudinaryPublicId/);
  assert.doesNotMatch(route, /asset\.public_id/);
  assert.match(route, /new Set\(\[\.\.\.auxiliaryPublicIds, mainPublicId\]/);
  assert.match(route, /video\/destroy/);
  assert.match(route, /AbortSignal\.timeout\(20_000\)/);
  assert.match(route, /CLOUDINARY_API_SECRET/);
  assert.match(route, /isCreatorWorkPublicId/);
  assert.ok(route.includes('const expectedPrefix = "ravine/creators/" + creatorId + "/works/" + creatorId + "-"'));
});

test("media cleanup fails closed and keeps the database work when an asset cannot be removed", () => {
  assert.match(route, /Cloud media cleanup is unavailable; the work was not deleted/);
  assert.match(route, /A media URL could not be verified for safe cleanup; the work was not deleted/);
  assert.match(route, /Could not remove every media asset; the work was not deleted/);
  const cleanupFailure = route.indexOf("if (!destroyed)");
  const workDelete = route.indexOf('.from("videos")\n      .delete()');
  assert.ok(cleanupFailure >= 0 && workDelete > cleanupFailure);
  assert.doesNotMatch(route, /payload\.error\?\.message/);
  assert.doesNotMatch(route, /deleteError\.message/);
});

test("destructive Cloudinary cleanup is restricted to UUID-v4 assets signed for the work's exact creator folder", () => {
  assert.match(route, /select\("id,creator_id,video_url,series_id,creators!inner\(user_id\)"\)/);
  assert.match(route, /const creatorId = Number\(work\.creator_id\)/);
  assert.match(route, /function isCreatorWorkPublicId\(publicId: string, creatorId: number\)/);
  assert.ok(route.includes('return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suffix);'));
  assert.match(route, /cloudinaryOwnedIds\.some\(\(id\) => !isCreatorWorkPublicId\(id as string, creatorId\)\)/);
  const folderGuard = route.indexOf("cloudinaryOwnedIds.some((id) => !isCreatorWorkPublicId");
  const destroyLoop = route.indexOf("for (const publicId of publicIds)");
  assert.ok(folderGuard >= 0 && destroyLoop > folderGuard);
  assert.match(route, /A media asset is outside this creator's verified RAVINE folder; the work was not deleted/);
});

test("deleting the last public episode updates the visibility of its parent series", () => {
  const workDelete = route.indexOf('.from("videos")\n      .delete()');
  const seriesLookup = route.indexOf('from("ravine_series_titles")');
  assert.ok(seriesLookup > workDelete);
  assert.match(route, /\.eq\("series_id", seriesId\)/);
  assert.match(route, /\.eq\("content_type", "series"\)/);
  assert.match(route, /\.eq\("published", true\)/);
  assert.match(route, /\.eq\("visibility", "public"\)/);
  assert.match(route, /published: Boolean\(remainingEpisodes\?\.length\)/);
  assert.match(route, /\.eq\("user_id", auth\.user\.id\)/);
});


test("financially referenced works cannot be physically deleted before media cleanup", () => {
  const auth = route.indexOf("supabase.auth.getUser()");
  const earningsCheck = route.indexOf('from("creator_earnings")');
  const assetsLookup = route.indexOf('from("work_media_assets")');
  const cleanupLoop = route.indexOf("for (const publicId of publicIds)");
  const deleteWork = route.indexOf('.from("videos")\n      .delete()');

  assert.ok(earningsCheck > auth);
  assert.ok(assetsLookup > earningsCheck);
  assert.ok(cleanupLoop > earningsCheck);
  assert.ok(deleteWork > cleanupLoop);
  assert.match(route, /\.eq\("content_id", videoId\)/);
  assert.match(route, /This work has financial records and cannot be permanently deleted/);
  assert.match(route, /Could not verify financial records; the work was not deleted/);
  assert.match(route, /payload\.result === "ok" \|\| payload\.result === "not found"/);
});

test("the deletion API mirrors the creator-owner database policy and does not trust work.user_id alone", () => {
  assert.match(route, /if \(!ownsViaCreator\)/);
  assert.doesNotMatch(route, /ownsViaWork/);
  assert.doesNotMatch(route, /work\.user_id/);
  assert.match(route, /creators!inner\(user_id\)/);
});
