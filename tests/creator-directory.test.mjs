import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Following view requires authentication and queries only the current user's followed creator IDs", () => {
  const page = read("../app/[locale]/creators/page.tsx");
  assert.match(page, /searchParams: Promise<\{ tab\?: string \}>/);
  assert.match(page, /query\.tab === "following"/);
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
  assert.match(component, //creators/);
  assert.match(component, /aria-live="polite"/);
});
