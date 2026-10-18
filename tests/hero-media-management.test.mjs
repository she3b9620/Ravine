import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manager = readFileSync(resolve(root, "components/HeroMediaManager.tsx"), "utf8");
const backdrop = readFileSync(resolve(root, "components/GuestCinematicBackdrop.tsx"), "utf8");
const migration = readFileSync(resolve(root, "supabase/migrations/20261018014356_ravine_hero_media_management.sql"), "utf8");
const videoMigration = readFileSync(resolve(root, "supabase/migrations/20261018015011_allow_hero_only_video_uploads.sql"), "utf8");

assert.match(manager, /ravine_hero_media_items/);
assert.match(manager, /ravine_hero_settings/);
assert.match(manager, /image\/upload/);
assert.match(manager, /sort_order/);
assert.match(manager, /use_curated_media/);
assert.match(backdrop, /loadCuratedHeroMedia/);
assert.match(backdrop, /item.video_id \\?\\? item.id/);
assert.match(backdrop, /heroCuratedMode/);
assert.match(migration, /enable row level security/i);
assert.match(migration, /is_ravine_admin\(\)/);
assert.match(migration, /grant select on table public\.ravine_hero_media_items to anon, authenticated/i);
console.log("Hero media management source checks passed.");
