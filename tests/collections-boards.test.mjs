import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("collections page provides owned/public boards, creation, editing, and item management", () => {
  const page = read("../app/[locale]/collections/page.tsx");
  assert.match(page, /from\("ravine_collections"\)/);
  assert.match(page, /from\("ravine_collection_items"\)/);
  for (const action of ["createCollectionAction", "addCollectionItemAction", "removeCollectionItemAction", "updateCollectionDetailsAction", "updateCollectionVisibilityAction", "deleteCollectionAction"]) {
    assert.ok(page.includes(action), "Missing collection action: " + action);
  }
  assert.match(page, /\.eq\("published", true\)/);
  assert.match(page, /\.eq\("visibility", "public"\)/);
  assert.match(page, /visibility\.eq\.public/);
});

test("collection access migration limits boards and item writes to authorized owners and public work", () => {
  const migration = read("../supabase/migrations/20261018052000_ravine_collection_access_policies.sql");
  assert.match(migration, /visibility = 'public'/);
  assert.match(migration, /owner_user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /v\.published = true and v\.visibility = 'public'/);
  assert.match(migration, /ravine_collection_items_owner_insert_public_work/);
  assert.match(migration, /ravine_collection_items_owner_delete/);
  assert.match(migration, /members-only boards are restricted to their owner/i);
});

test("collection owners can safely edit titles and descriptions", () => {
  const page = read("../app/[locale]/collections/page.tsx");
  const actionStart = page.indexOf("export async function updateCollectionDetailsAction");
  const actionEnd = page.indexOf("export async function updateCollectionVisibilityAction", actionStart);
  const action = page.slice(actionStart, actionEnd);
  assert.ok(actionStart >= 0 && actionEnd > actionStart);
  assert.match(action, /title = String\(formData\.get\("title"\) \?\? ""\)\.trim\(\)\.slice\(0, 120\)/);
  assert.match(action, /description = String\(formData\.get\("description"\) \?\? ""\)\.trim\(\)\.slice\(0, 1000\)/);
  assert.match(action, /resolveManagedCollection\(supabase, auth\.user\.id, collectionId\)/);
  assert.match(action, /\.update\(\{ title, description: description \|\| null/);
  assert.match(page, /className=\{styles\.detailsForm\}/);
  assert.match(page, /defaultValue=\{collectionRow\.title\}/);
});

test("collections directory supports search, visibility filters and sorting", () => {
  const page = read("../app/[locale]/collections/page.tsx");
  const component = read("../components/RAVINECollectionsDirectory.tsx");
  assert.match(page, /<RAVINECollectionsDirectory/);
  assert.match(component, /type VisibilityFilter = "all" \| "public" \| "private" \| "members"/);
  assert.match(component, /type="search"/);
  assert.match(component, /itemCount/);
  assert.match(component, /aria-pressed=\{visibility === item\.id\}/);
  assert.match(component, /value="works"/);
  assert.match(component, /private && item\.owned/);
});
