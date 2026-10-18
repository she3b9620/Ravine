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


test("Live page unifies scheduled sessions with a public-only recording archive", () => {
  const page = read("../app/[locale]/live/page.tsx");
  assert.match(page, /\.from\("live_events"\)/);
  assert.match(page, /\.from\("videos"\)/);
  assert.match(page, /\.eq\("published",\s*true\)/);
  assert.match(page, /\.eq\("visibility",\s*"public"\)/);
  assert.match(page, /recordingHref:/);
  assert.match(page, /<RAVINEEventsCatalog locale=\{locale\} items=\{eventItems\}/);
  assert.match(page, /<RAVINEWorkCatalog locale=\{locale\} items=\{archiveItems\}/);
  assert.match(page, /selected provider and its policies/);
});


test("creator event scheduling validates identity ownership, time, and supported event formats", () => {
  const actions = read("../app/actions/ravine-live-events.ts");
  const form = read("../components/RAVINEEventCreateForm.tsx");
  const page = read("../app/[locale]/events/page.tsx");
  assert.match(actions, /allowedTypes = new Set/);
  assert.match(actions, /allowedModes = new Set/);
  assert.match(actions, /\.eq\("user_id", auth\.user\.id\)/);
  assert.match(actions, /timestamp <= Date\.now\(\)/);
  assert.match(actions, /status: "scheduled"/);
  assert.match(form, /new Date\(localDate\)/);
  assert.match(form, /parsed\.toISOString\(\)/);
  assert.match(form, /type="datetime-local"/);
  assert.match(page, /<RAVINEEventManagement locale=\{locale\} creators=\{hosts\} events=\{managedEvents\}/);
});

test("only the owner can cancel an event and only while it is scheduled", () => {
  const actions = read("../app/actions/ravine-live-events.ts");
  assert.match(actions, /\.eq\("status", "scheduled"\)/);
  assert.match(actions, /\.eq\("creator_id", creator\.id\)/);
  assert.match(actions, /status: "cancelled"/);
  assert.match(actions, /if \(event\.status !== "scheduled"\)/);
});

test("events, Spaces, and public collections are reachable from desktop and mobile navigation", () => {
  for (const path of ["../components/SidebarNav.tsx", "../components/MobileNav.tsx"]) {
    const source = read(path);
    for (const slug of ["events", "spaces", "collections"]) {
      assert.ok(source.includes('["' + slug + '"'), path + " is missing " + slug);
    }
  }
  const sidebar = read("../components/SidebarNav.tsx");
  assert.match(sidebar, /\["events", "Events & Premieres", "الأحداث والعروض", CalendarDays\]/);
  assert.match(sidebar, /\["spaces", "Spaces", "المساحات", Headphones\]/);
  assert.match(sidebar, /\["collections", "Collections & Boards", "المجموعات واللوحات", BookmarkPlus\]/);
});

test("creator profiles surface that creator's scheduled and live sessions", () => {
  const page = read("../app/[locale]/creators/[id]/page.tsx");
  assert.match(page, /from\("live_events"\)/);
  assert.match(page, /\.eq\("creator_id", creatorId\)/);
  assert.match(page, /\.in\("status", \["scheduled", "live"\]\)/);
  assert.match(page, /<RAVINEEventsCatalog locale=\{locale\} items=\{creatorEvents\}/);
  assert.match(page, /All events/);
});

test("scheduled events have a focused detail route linked from public event catalogues", () => {
  const detail = read("../app/[locale]/events/[id]/page.tsx");
  const catalog = read("../components/RAVINEEventsCatalog.tsx");
  const list = read("../app/[locale]/events/page.tsx");
  const discover = read("../app/[locale]/discover/page.tsx");
  const live = read("../app/[locale]/live/page.tsx");
  assert.match(detail, /\.from\("live_events"\)/);
  assert.match(detail, /\.in\("status",\s*\["scheduled",\s*"live",\s*"ended"\]\)/);
  assert.match(detail, /\.eq\("published", true\)/);
  assert.match(detail, /\.eq\("visibility", "public"\)/);
  assert.match(detail, /streaming setup is complete/);
  assert.match(catalog, /event\.detailHref \? <Link/);
  for (const page of [list, discover, live]) assert.match(page, /detailHref: "\/" \+ locale \+ "\/events\/" \+ event\.id/);
});
