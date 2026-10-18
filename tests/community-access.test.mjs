import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("community directory only publishes active public communities", () => {
  const source = read("../app/[locale]/community/page.tsx");
  assert.match(source, /\.eq\("is_active", true\)/);
  assert.match(source, /\.eq\("privacy", "public"\)/);
});

test("private and invite-only communities require membership before loading posts", () => {
  const source = read("../app/[locale]/community/[slug]/page.tsx");
  const membershipCheck = source.indexOf('if (dbCommunity.privacy !== "public" && !isMember) notFound()');
  const postsQuery = source.indexOf('.from("community_posts")', membershipCheck);
  assert.ok(membershipCheck > 0);
  assert.ok(postsQuery > membershipCheck, "Posts must not be queried before privacy is checked");
});

test("creating a community post requires an active membership and applies a body length limit", () => {
  const source = read("../app/[locale]/community/[slug]/page.tsx");
  const start = source.indexOf("export async function createCommunityPostAction");
  const end = source.indexOf("export default async function CommunityDetailPage", start);
  const action = source.slice(start, end);
  assert.match(action, /body\.length > 5000/);
  assert.match(action, /\.from\("community_members"\)/);
  assert.match(action, /\.eq\("community_id", community\.id\)/);
  assert.match(action, /\.eq\("user_id", user\.id\)/);
  assert.match(action, /membership\?\.status !== "active"/);
});


test("guest navigation allows the public community preview without unlocking member actions", () => {
  for (const path of ["../components/PrimaryNav.tsx", "../components/SidebarNav.tsx", "../components/MobileNav.tsx"]) {
    const source = read(path);
    const gatedStart = source.indexOf("const GUEST_GATED = new Set(");
    const gatedEnd = source.indexOf(");", gatedStart);
    assert.ok(gatedStart >= 0 && gatedEnd > gatedStart);
    assert.doesNotMatch(source.slice(gatedStart, gatedEnd), /community/);
  }
  const detail = read("../app/[locale]/community/[slug]/page.tsx");
  assert.match(detail, /canJoin = Boolean\(user\)/);
  assert.match(detail, /const canPost = Boolean\(user\) && isMember/);
});
