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
  "lib/ravine-playback-core.ts",
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required RAVINE file: ${file}`);
  }
}

const layout = read("app/[locale]/layout.tsx");
const sidebar = read("app/[locale]/ravine-sidebar-position-finish.css");
const logo = read("app/[locale]/ravine-logo-motion-finish.css");
const logoMotion = read("components/RavineLogoMotion.tsx");
const watchPage = read("app/[locale]/watch/[id]/page.tsx");
const playbackCore = read("lib/ravine-playback-core.ts");
const playerRuntime = read("components/RAVINEPlayerRuntime.tsx");

if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== "ravine/clean-rebuild") {
  throw new Error(`RAVINE build guard expected ravine/clean-rebuild, got ${process.env.GITHUB_REF_NAME}`);
}
if (!layout.includes('import "./ravine-sidebar-position-finish.css";')) {
  throw new Error("Sidebar position finish stylesheet is not loaded by the locale layout.");
}
if (!layout.includes('import "./ravine-logo-motion-finish.css";')) {
  throw new Error("Logo motion finish stylesheet is not loaded by the locale layout.");
}
if (!sidebar.includes("inset-block-start: 78px !important")) {
  throw new Error("Sidebar container anchor must remain below the header at 78px.");
}
if (!sidebar.includes("height: calc(100dvh - 78px) !important")) {
  throw new Error("Sidebar height guard is missing.");
}
if (!sidebar.includes("padding-top: 36px !important")) {
  throw new Error("Sidebar options must use the approved 36px internal lift.");
}
if (!logo.includes("ravineLogoQuietSweep")) {
  throw new Error("Logo quiet motion animation is missing.");
}
if (!logo.includes("mask-image:url('/اللوجو.png')")) {
  throw new Error("Logo mark color-motion mask is missing.");
}
if (!logo.includes("mask-image:url('/التايبو.png')")) {
  throw new Error("Wordmark color-motion mask is missing.");
}
if (!logo.includes('data-ravine-auth="authenticated"')) {
  throw new Error("Logo motion must be explicitly scoped to authenticated users.");
}
if (!logoMotion.includes("ravine-logo-motion-change")) {
  throw new Error("Logo motion state-change event wiring is missing.");
}

if (!watchPage.includes('import RAVINEPlayerRuntime from "@/components/RAVINEPlayerRuntime";')) {
  throw new Error("Watch pages must use the deterministic RAVINE player runtime.");
}
if (!watchPage.includes("resolveWorkPlaybackUrl(videoId, video.video_url")) {
  throw new Error("Watch pages must resolve main media through the RAVINE playback contract.");
}
if (!watchPage.includes("resolveAssetPlaybackUrl(asset)")) {
  throw new Error("Watch pages must resolve auxiliary assets through the RAVINE playback contract.");
}
if (!playbackCore.includes("export function resolveWorkPlaybackUrl")) {
  throw new Error("Shared RAVINE playback core is missing work source resolution.");
}
if (!playbackCore.includes("export function resolveAssetPlaybackUrl")) {
  throw new Error("Shared RAVINE playback core is missing asset source resolution.");
}
if (!playbackCore.includes("toCloudinaryBrowserVideoUrl")) {
  throw new Error("Shared RAVINE playback core is missing browser delivery normalization.");
}
if (!playerRuntime.includes('data-ravine-playback-runtime="deterministic"')) {
  throw new Error("Deterministic RAVINE player runtime marker is missing.");
}
if (!playerRuntime.includes("}, [activeSrc, duration]);")) {
  throw new Error("Player media lifecycle must be keyed to the media source, not playing state.");
}
if (playerRuntime.includes("[activeSrc, syncPlaying]")) {
  throw new Error("Player must not reload media when the playing callback changes.");
}
if (!playerRuntime.includes("playingRef.current")) {
  throw new Error("Player control visibility must use a stable playing ref to avoid media lifecycle coupling.");
}

const searchForbidden = [
  "مساحة للاكتشاف، مش مجرد بحث.",
  "A discovery layer, not just a search box.",
];
const appDir = path.join(root, "app");
const stack = [appDir];
const textFiles = [];
while (stack.length) {
  const current = stack.pop();
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) stack.push(full);
    else if (/\.(tsx|ts|css|md|json)$/.test(entry.name)) textFiles.push(full);
  }
}
for (const file of textFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const phrase of searchForbidden) {
    if (source.includes(phrase)) {
      throw new Error(`Forbidden Search copy found in ${path.relative(root, file)}: ${phrase}`);
    }
  }
}

console.log("RAVINE governance checks passed.");
