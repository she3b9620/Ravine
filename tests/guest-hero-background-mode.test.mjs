import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const backdrop = read("../components/GuestCinematicBackdrop.tsx");
const controls = read("../components/VideoAudioToggle.tsx");
const styles = read("../app/[locale]/guest-cinematic-backdrop.css");
const controlStyles = read("../app/[locale]/ravine-hero-control-fixes.css");

test("guest hero defaults to video and can switch to its still image", () => {
  assert.match(backdrop, /useState<BackgroundMode>\("video"\)/);
  assert.match(backdrop, /detail\.action === "set-background-mode"/);
  assert.match(backdrop, /data-background-mode=\{backgroundMode\}/);
  assert.match(backdrop, /className="ravine-guest-cinematic-image"/);
  assert.match(backdrop, /className="ravine-guest-cinematic-video"/);
  assert.match(backdrop, /video\.pause\(\)/);
  assert.match(controls, /ravine-video-control-background-mode/);
  assert.match(controls, /set-background-mode/);
  assert.match(controls, /Switch background to image/);
  assert.match(controls, /Switch background to video/);
  assert.match(styles, /object-fit:cover!important/);
  assert.match(styles, /data-background-mode="video"/);
  assert.match(styles, /data-background-mode="image"/);
  assert.match(controlStyles, /ravine-video-control-background-mode/);
});

test("guest hero media order is stable and image mode browses still assets independently", () => {
  assert.match(backdrop, /function stableMix/);
  assert.doesNotMatch(backdrop, /Math\.random\(\)/);
  assert.match(backdrop, /\.eq\("visibility", "public"\)/);
  assert.match(backdrop, /const imageWorks = useMemo/);
  assert.match(backdrop, /setImageIndex\(\(index\) => imageWorks\.length/);
  assert.match(backdrop, /backgroundMode === "image" \? currentImage\?\.thumbnail_url/);
});

