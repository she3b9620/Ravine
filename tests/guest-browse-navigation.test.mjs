import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("guest navigation exposes public browse pages without forcing sign-in first", () => {
  const primary = read("../components/PrimaryNav.tsx");
  const sidebar = read("../components/SidebarNav.tsx");
  const mobile = read("../components/MobileNav.tsx");

  assert.doesNotMatch(primary, /GUEST_GATED|ravine-nav-gated|requestRavineAuth|LockKeyhole/);
  assert.doesNotMatch(sidebar, /GUEST_GATED|requestRavineAuth/);
  assert.doesNotMatch(mobile, /GUEST_GATED/);

  assert.match(primary, /navigation\.map[\s\S]*?<Link/);
  assert.match(sidebar, /groups\.map[\s\S]*?items\.map[\s\S]*?<Link/);
  assert.match(mobile, /navigation\.map\(\(\[slug, en, arLabel\]\) => \([\s\S]*?<Link/);
  assert.match(mobile, /!authenticated \? <button/);
  assert.match(mobile, /requestRavineAuth/);

  for (const slug of ["shorts", "videos", "live", "podcasts", "documentaries"]) {
    assert.ok(primary.includes('["' + slug + '"'), "Primary navigation should expose " + slug);
  }
  for (const slug of ["shorts", "videos", "podcasts", "documentaries", "short-films", "films", "series", "live", "events", "spaces", "collections", "community"]) {
    assert.ok(sidebar.includes('["' + slug + '"'), "Sidebar should expose " + slug);
    assert.ok(mobile.includes('["' + slug + '"'), "Mobile navigation should expose " + slug);
  }
});

test("personal tools remain inside the authenticated sidebar groups", () => {
  const sidebar = read("../components/SidebarNav.tsx");
  assert.match(sidebar, /authenticated \? \[\.\.\.publicGroups, \.\.\.privateGroups/);
  assert.match(sidebar, /CREATE & MANAGE/);
});
