import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Events page uses only supported scheduled, live, and ended event records", () => {
  const page = read("../app/[locale]/events/page.tsx");
  assert.match(page, /\.from\("live_events"\)/);
  assert.match(page, /\.in\("status", \["scheduled", "live", "ended"\]\)/);
  assert.match(page, /recordingRows/);
  assert.match(page, /\.eq\("published", true\)\.eq\("visibility", "public"\)/);
  assert.match(page, /<RAVINEEventsCatalog locale=\{locale\} items=\{items\}/);
});

test("Events catalog provides search, status filters, responsive layout, and only public recording links", () => {
  const component = read("../components/RAVINEEventsCatalog.tsx");
  const css = read("../components/RAVINEEventsCatalog.module.css");
  assert.match(component, /type Filter = "all" \| "upcoming" \| "live" \| "ended"/);
  assert.match(component, /type="search"/);
  assert.match(component, /aria-pressed=\{filter === item\.id\}/);
  assert.match(component, /event\.recordingHref/);
  assert.match(component, /\/creators\/"\s*\+\s*event\.creatorId/);
  assert.match(css, /@media\(max-width:1080px\)/);
  assert.match(css, /@media\(max-width:660px\)/);
});


test("Spaces page exposes the staged schedule without inventing a live provider", () => {
  const page = read("../app/[locale]/spaces/page.tsx");
  const component = read("../components/RAVINEEventsCatalog.tsx");
  assert.match(page, /\.from\("ravine_spaces"\)/);
  assert.match(page, /\.in\("status", \["scheduled", "live", "ended"\]\)/);
  assert.match(page, /recordingHref: null/);
  assert.match(page, /live participation remains dependent on the selected provider/i);
  assert.match(page, /<RAVINEEventsCatalog locale=\{locale\} items=\{items\}/);
  assert.match(component, /creatorId: number \| null/);
  assert.match(component, /town_hall/);
});

test("shared event catalogue accepts string IDs for UUID-backed Spaces and numeric IDs for live events", () => {
  const component = read("../components/RAVINEEventsCatalog.tsx");
  const spaces = read("../app/[locale]/spaces/page.tsx");
  assert.match(component, /id: number \| string/);
  assert.match(spaces, /id: space\.id/);
});
