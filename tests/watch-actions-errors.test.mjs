import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Like mutations report rejected requests and always clear the busy state", () => {
  const source = read("../components/WatchActions.tsx");
  const start = source.indexOf("async function toggleLike()");
  const end = source.indexOf("async function toggleSave()", start);
  const handler = source.slice(start, end);
  assert.match(handler, /try \{/);
  assert.match(handler, /catch \(error\)/);
  assert.match(handler, /finally \{\s*setBusy\(null\)/);
  assert.match(handler, /video_likes/);
  assert.match(handler, /localizeSupabaseError\(error, locale/);
});

test("Save mutations report rejected requests and always clear the busy state", () => {
  const source = read("../components/WatchActions.tsx");
  const start = source.indexOf("async function toggleSave()");
  const end = source.indexOf("async function share()", start);
  const handler = source.slice(start, end);
  assert.match(handler, /try \{/);
  assert.match(handler, /catch \(error\)/);
  assert.match(handler, /finally \{\s*setBusy\(null\)/);
  assert.match(handler, /video_saves/);
  assert.match(handler, /localizeSupabaseError\(error, locale/);
});
