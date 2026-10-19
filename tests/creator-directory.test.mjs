import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Following view requires authentication and queries only the current user's followed creator IDs", () => {
  const page = read("../app/[locale]/creators/page.tsx");
  assert.match(page, /searchParams: Promise<CreatorDirectoryQuery>/);
  assert.match(page, /firstParam\(query\.tab\) === "following"/);
  assert.match(page, /auth\?next=/);
  assert.match(page, /from\("follows"\)/);
  assert.match(page, /\.eq\("follower_id", auth\.user\.id\)/);
  assert.match(page, /\.in\("id", ids\)/);
  assert.match(page, /<RAVINECreatorDirectory/);
});

test("creator directory supports localized search, sorting, and empty following states", () => {
  const component = read("../components/RAVINECreatorDirectory.tsx");
  assert.match(component, /type="search"/);
  assert.match(component, /Most followed/);
  assert.match(component, /Name A–Z/);
  assert.match(component, /You do not follow any creators yet/);
  assert.match(component, /لا تتابع مبدعين بعد/);
  assert.ok(component.includes('href={"/" + locale + "/creators/" + creator.id}'));
  assert.match(component, /aria-live="polite"/);
});


test("creator public user profiles expose follow with a return path and prevent following the owner", () => {
  const page = read("../app/[locale]/u/[username]/page.tsx");
  const component = read("../components/FollowCreator.tsx");
  assert.match(page, /import FollowCreator from "@\/components\/FollowCreator"/);
  assert.match(page, /let creatorIdentity: Creator \| null = null/);
  assert.match(page, /creatorIdentity = creator/);
  assert.match(page, /<FollowCreator creatorId=\{creatorIdentity\.id\} creatorUserId=\{creatorIdentity\.user_id\} locale=\{locale\} returnPath=\{/);
  assert.match(page, /encodeURIComponent\(handle\)/);
  assert.match(component, /creatorUserId === auth\.user\.id/);
  assert.match(component, /creatorUserId === userId/);
});


test("the public creator directory searches the complete server-side catalog and paginates exact matches", () => {
  const page = read("../app/[locale]/creators/page.tsx");
  const component = read("../components/RAVINECreatorDirectory.tsx");
  assert.match(page, /const pageSize = 24/);
  assert.match(page, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.ok(page.includes("name.ilike.%"));
  assert.ok(page.includes("username.ilike.%"));
  assert.ok(page.includes("specialty.ilike.%"));
  assert.ok(page.includes("bio.ilike.%"));
  assert.match(page, /\.range\(\(currentPage - 1\) \* pageSize, currentPage \* pageSize - 1\)/);
  assert.match(page, /currentPage = Math\.min\(requestedPage, pageCount\)/);
  assert.match(page, /\.order\("name", \{ ascending: true, nullsFirst: false \}\)/);
  assert.match(page, /\.order\("followers", \{ ascending: false, nullsFirst: false \}\)/);
  assert.match(component, /router\.replace\(directoryHref\(locale, query, sort, 1\)/);
  assert.match(component, /href=\{directoryHref\(locale, query, sort, page - 1\)\}/);
  assert.match(component, /href=\{directoryHref\(locale, query, sort, page \+ 1\)\}/);
  assert.match(component, /params\.set\("page", String\(page\)\)/);
  assert.match(component, /Showing .*creators/);
});
