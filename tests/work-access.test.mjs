import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("video access distinguishes public, unlisted, follower-only, and owner-only visibility", () => {
  const policy = read("../lib/ravine-access.ts");
  const videoAccess = read("../lib/ravine-video-access.ts");
  assert.match(policy, /"public" \| "unlisted" \| "followers"/);
  assert.match(policy, /case "unlisted": return true/);
  assert.match(policy, /context\.authenticated && context\.followsCreator/);
  assert.match(videoAccess, /if \(video\.published !== true && !creatorIdentityOwner\) return false/);
  assert.match(videoAccess, /from\("follows"\)/);
  assert.match(videoAccess, /custom: "private"/);
  assert.match(videoAccess, /member: false/);
  assert.match(videoAccess, /invited: false/);
});

test("video detail routes verify access before querying and exposing chapters or media assets", () => {
  for (const path of ["../app/[locale]/watch/[id]/page.tsx", "../app/[locale]/work/[id]/page.tsx"]) {
    const source = read(path);
    assert.match(source, /import \{ canAccessRAVINEVideo \} from "@\/lib\/ravine-video-access"/);
    assert.match(source, /await canAccessRAVINEVideo\(supabase,/);
    assert.ok(source.indexOf("await canAccessRAVINEVideo(supabase,") < source.indexOf("from(\"work_media_assets\")"));
  }
});

test("RAVINE work details show stored access settings and allow authorized direct-link playback", () => {
  const universe = read("../lib/ravine-work-universe.ts");
  const context = read("../components/RAVINEWorkContext.tsx");
  assert.match(universe, /access: access \?\? normalizeRAVINEWorkAccess\(source\.visibility\)/);
  assert.match(universe, /return Boolean\(work\.mediaUrl\)/);
  assert.match(context, /unlisted: \{ ar: "غير مُدرج", en: "Unlisted" \}/);
  assert.match(context, /custom: \{ ar: "جمهور مخصص", en: "Custom audience" \}/);
});
