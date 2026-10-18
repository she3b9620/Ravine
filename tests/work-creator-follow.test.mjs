import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("watch page lets viewers follow the credited creator and return to the work after sign-in", () => {
  const page = read("../app/[locale]/watch/[id]/page.tsx");
  const component = read("../components/FollowCreator.tsx");
  assert.match(page, /import FollowCreator from "@\/components\/FollowCreator"/);
  assert.match(page, /select\("id,name,username,avatar_url,specialty,user_id"\)/);
  assert.match(page, /<FollowCreator[\s\S]*?creatorId=\{creatorRecord\.id\}[\s\S]*?creatorUserId=\{creatorRecord\.user_id\}/);
  assert.match(page, /video\.published \? \(/);
  assert.match(component, /returnPath\?: string/);
  assert.match(component, /requestRavineAuth\(returnPath \|\|/);
});

test("users cannot follow their own creator identity from a work page", () => {
  const component = read("../components/FollowCreator.tsx");
  assert.match(component, /creatorUserId === auth\.user\.id/);
  assert.match(component, /creatorUserId === userId/);
  assert.match(component, /Your creator identity/);
  assert.match(component, /هويتك الإبداعية/);
});

test("follow and unfollow mutations stay scoped to the current user and selected creator", () => {
  const component = read("../components/FollowCreator.tsx");
  assert.match(component, /from\("follows"\)[\s\S]*?eq\("follower_id", userId\)[\s\S]*?eq\("creator_id", creatorId\)/);
  assert.match(component, /insert\(\{ follower_id: userId, creator_id: creatorId \}\)/);
});

test("Work Universe detail verifies access before loading creator, chapter, or media metadata and exposes follow", () => {
  const page = read("../app/[locale]/work/[id]/page.tsx");
  const accessCheck = page.indexOf("await canAccessRAVINEVideo(supabase, data)");
  const creatorLookup = page.indexOf('from("creators")');
  const chapterLookup = page.indexOf('from("work_chapters")');
  const assetLookup = page.indexOf('from("work_media_assets")');
  assert.ok(accessCheck >= 0 && creatorLookup > accessCheck && chapterLookup > accessCheck && assetLookup > accessCheck);
  assert.match(page, /import FollowCreator from "@\/components\/FollowCreator"/);
  assert.match(page, /select\("id,name,username,avatar_url,specialty,user_id"\)/);
  assert.match(page, /<FollowCreator[\s\S]*?creatorId=\{creator\.id\}[\s\S]*?returnPath=\{["']/);
  assert.match(page, /aria-label=\{ar \? "المبدع صاحب العمل" : "Work creator"\}/);
});
