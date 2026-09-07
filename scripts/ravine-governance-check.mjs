import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const required = [
  "app/[locale]/layout.tsx",
  "app/[locale]/ravine-sidebar.css",
  "app/[locale]/ravine-sidebar-position-finish.css",
  "app/[locale]/ravine-logo-motion-finish.css",
  "components/RavineLogoMotion.tsx",
  "components/RAVINEPlayer.tsx",
  "components/RAVINEPlayerRuntime.tsx",
  "components/RAVINEPlayer.module.css",
  "components/RAVINEWorkPlayer.tsx",
  "components/RAVINEShortsPlayer.tsx",
  "components/RAVINEVideoPlayer.tsx",
  "components/RAVINEPodcastPlayer.tsx",
  "components/RAVINEDocumentaryPlayer.tsx",
  "components/RAVINEUniverseHub.tsx",
  "components/RAVINEUniverseSurface.tsx",
  "lib/ravine-playback-core.ts",
  "lib/ravine-work-universe.ts",
  "lib/ravine-platform.ts",
  "lib/ravine-ai-gateway.ts",
  "lib/ravine-trust-engine.ts",
  "lib/ravine-discovery.ts",
  "lib/ravine-access.ts",
  "lib/ravine-live-provider.ts",
  "lib/ravine-economy.ts",
  "app/[locale]/work/[id]/page.tsx",
  "app/[locale]/universe/page.tsx",
  "app/[locale]/universe/module/page.tsx",
  "app/[locale]/messages/page.tsx",
  "app/[locale]/collections/page.tsx",
  "app/[locale]/events/page.tsx",
  "app/[locale]/spaces/page.tsx",
  "app/[locale]/opportunities/page.tsx",
  "app/[locale]/intelligence/page.tsx",
  "app/[locale]/trust/page.tsx",
  "app/[locale]/admin/page.tsx",
  "components/RAVINEWorkContext.tsx",
  "components/RAVINEWorkContext.module.css",
  "supabase/migrations/20260907120000_ravine_platform_domain_foundation.sql",
  "supabase/migrations/20260907130000_ravine_social_community_operations_foundation.sql",
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required RAVINE file: ${file}`);
}

const layout = read("app/[locale]/layout.tsx");
const sidebar = read("app/[locale]/ravine-sidebar-position-finish.css");
const logo = read("app/[locale]/ravine-logo-motion-finish.css");
const logoMotion = read("components/RavineLogoMotion.tsx");
const playbackCore = read("lib/ravine-playback-core.ts");
const playerRuntime = read("components/RAVINEPlayerRuntime.tsx");
const workPlayer = read("components/RAVINEWorkPlayer.tsx");
const workUniverse = read("lib/ravine-work-universe.ts");
const workPage = read("app/[locale]/work/[id]/page.tsx");
const workContext = read("components/RAVINEWorkContext.tsx");
const platform = read("lib/ravine-platform.ts");
const aiGateway = read("lib/ravine-ai-gateway.ts");
const trust = read("lib/ravine-trust-engine.ts");
const discovery = read("lib/ravine-discovery.ts");
const access = read("lib/ravine-access.ts");
const live = read("lib/ravine-live-provider.ts");
const economy = read("lib/ravine-economy.ts");
const universe = read("components/RAVINEUniverseSurface.tsx");
const socialMigration = read("supabase/migrations/20260907130000_ravine_social_community_operations_foundation.sql");
const domainMigration = read("supabase/migrations/20260907120000_ravine_platform_domain_foundation.sql");

if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== "ravine/clean-rebuild") throw new Error(`Expected ravine/clean-rebuild, got ${process.env.GITHUB_REF_NAME}`);
if (!layout.includes('import "./ravine-sidebar-position-finish.css";')) throw new Error("Sidebar finish stylesheet not loaded.");
if (!layout.includes('import "./ravine-logo-motion-finish.css";')) throw new Error("Logo motion stylesheet not loaded.");
if (!sidebar.includes("inset-block-start: 78px !important") || !sidebar.includes("height: calc(100dvh - 78px) !important") || !sidebar.includes("padding-top: 36px !important")) throw new Error("Sidebar geometry guard failed.");
if (!logo.includes("ravineLogoQuietSweep") || !logo.includes("mask-image:url('/اللوجو.png')") || !logo.includes("mask-image:url('/التايبو.png')") || !logo.includes('data-ravine-auth="authenticated"')) throw new Error("Logo motion guard failed.");
if (!logoMotion.includes("ravine-logo-motion-change")) throw new Error("Logo motion event wiring missing.");
if (!playbackCore.includes("export function resolveWorkPlaybackUrl") || !playbackCore.includes("export function resolveAssetPlaybackUrl") || !playbackCore.includes("toCloudinaryBrowserVideoUrl")) throw new Error("Playback contract guard failed.");
if (!playerRuntime.includes('data-ravine-playback-runtime="deterministic"') || !playerRuntime.includes("}, [activeSrc, duration]);") || playerRuntime.includes("[activeSrc, syncPlaying]") || !playerRuntime.includes("playingRef.current")) throw new Error("Playback lifecycle guard failed.");
if (!workPlayer.includes("RAVINEShortsPlayer") || !workPlayer.includes("RAVINEPodcastPlayer") || !workPlayer.includes("RAVINEDocumentaryPlayer")) throw new Error("Work player dispatch guard failed.");
if (!workUniverse.includes("RAVINE_WORK_TYPES") || !workUniverse.includes("isPlayableRAVINEWork")) throw new Error("Work Universe guard failed.");
if (!workPage.includes("toRAVINEWork") || !workPage.includes("RAVINEWorkContext")) throw new Error("Work surface guard failed.");
if (!workContext.includes("Access")) throw new Error("Work context access guard failed.");
if (!platform.includes("RAVINE_PLATFORM_MODULES") || !platform.includes("RAVINE_OPEN_DECISIONS") || !platform.includes("RAVINE_AI_RULES")) throw new Error("Platform contract guard failed.");
if (!aiGateway.includes("shouldExecuteRAVINEAI") || !aiGateway.includes("confidenceBand")) throw new Error("AI gateway guard failed.");
if (!trust.includes("resolveRAVINETrustDecision") || !trust.includes("requiresHumanReview")) throw new Error("Trust engine guard failed.");
if (!discovery.includes("rankRAVINEWithExplicitWeights")) throw new Error("Discovery contract must require explicit ranking weights.");
if (!access.includes("canAccessRAVINEWork") || !access.includes("canPublishAsCreator")) throw new Error("Access contract guard failed.");
if (!live.includes("RAVINELiveProviderAdapter") || !live.includes("assertRAVINELiveProviderConfigured")) throw new Error("Live provider must remain adapter-based while open.");
if (!economy.includes("RAVINEEconomyAdapter") || !economy.includes("assertRAVINEEconomyConfigured")) throw new Error("Economy provider must remain adapter-based while open.");
if (!universe.includes("RAVINE_PLATFORM_MODULES")) throw new Error("Universe surface must use canonical registry.");
if (!domainMigration.includes("alter table public.ravine_next_works enable row level security")) throw new Error("Staged domain migration RLS guard failed.");
if (!socialMigration.includes("ravine_next_connections") || !socialMigration.includes("ravine_next_notifications") || !socialMigration.includes("ravine_next_messages") || !socialMigration.includes("ravine_next_community_posts") || !socialMigration.includes("ravine_next_spaces") || !socialMigration.includes("ravine_next_ai_audit_events")) throw new Error("Social/community/operations foundation guard failed.");

const appDir = path.join(root, "app");
const stack = [appDir];
while (stack.length) {
  const current = stack.pop();
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) stack.push(full);
    else if (/\.(tsx|ts|css|md|json)$/.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      for (const phrase of ["مساحة للاكتشاف، مش مجرد بحث.", "A discovery layer, not just a search box."]) {
        if (source.includes(phrase)) throw new Error(`Forbidden Search copy found in ${path.relative(root, full)}: ${phrase}`);
      }
    }
  }
}
console.log("RAVINE governance checks passed.");
