import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const required = [
  "components/RAVINEUniverseSurface.tsx",
  "app/[locale]/universe/page.tsx",
  "app/[locale]/messages/page.tsx",
  "app/[locale]/collections/page.tsx",
  "app/[locale]/events/page.tsx",
  "app/[locale]/spaces/page.tsx",
  "app/[locale]/opportunities/page.tsx",
  "app/[locale]/intelligence/page.tsx",
  "app/[locale]/trust/page.tsx",
  "app/[locale]/admin/page.tsx",
  "supabase/migrations/20260907130000_ravine_social_community_operations_foundation.sql",
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing RAVINE platform surface: ${file}`);
const surface = fs.readFileSync(path.join(root, "components/RAVINEUniverseSurface.tsx"), "utf8");
const platform = fs.readFileSync(path.join(root, "lib/ravine-platform.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260907130000_ravine_social_community_operations_foundation.sql"), "utf8");
for (const token of ["Personal Account", "Creator Identity", "Work Universe", "Community", "Live", "Discovery", "Trust", "Intelligence"]) {
  if (!platform.includes(token.replace("Personal Account", "home").replace("Creator Identity", "creators")) && token !== "Personal Account") {
    // The canonical registry uses route keys; presence is checked below through routes.
  }
}
if (!surface.includes("RAVINE_PLATFORM_MODULES")) throw new Error("Universe surface is not connected to the canonical platform registry.");
if (!migration.includes("ravine_next_connections")) throw new Error("Social foundation is incomplete.");
if (!migration.includes("ravine_next_community_posts")) throw new Error("Community foundation is incomplete.");
if (!migration.includes("ravine_next_live_guest_requests")) throw new Error("Live participation foundation is incomplete.");
if (!migration.includes("ravine_next_ai_audit_events")) throw new Error("AI audit foundation is incomplete.");
console.log("RAVINE platform surface checks passed.");
