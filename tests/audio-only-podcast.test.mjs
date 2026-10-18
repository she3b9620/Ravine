import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("audio media URLs remain audio instead of receiving Cloudinary MP4 video transforms", () => {
  const core = read("../lib/ravine-playback-core.ts");
  assert.match(core, /export function isAudioMediaUrl/);
  assert.match(core, /isAudioMimeType\(mimeType\) \|\| isAudioMediaUrl\(value\)/);
  assert.match(core, /isAudioMimeType\(asset\.mime_type\) \|\| isAudioMediaUrl\(asset\.media_url\)/);
  assert.match(core, /Audio should remain audio/);
  assert.match(core, /return url\.toString\(\);[\s\S]*?const hasExtension/);
});

test("Podcast player detects audio MIME type and requests an audio-only cinematic runtime", () => {
  const podcast = read("../components/RAVINEPodcastPlayer.tsx");
  const runtime = read("../components/RAVINEPlayerRuntime.tsx");
  const styles = read("../components/RAVINEPlayer.module.css");
  assert.match(podcast, /mainAsset\?\.mime_type\?\.toLowerCase\(\)\.startsWith\("audio\/"\)/);
  assert.match(podcast, /audioOnly=\{mainAudio\}/);
  assert.match(runtime, /audioOnly = false/);
  assert.match(runtime, /<audio/);
  assert.match(runtime, /styles\.audioCanvas/);
  assert.match(runtime, /styles\.audioWave/);
  assert.match(styles, /\.audioCanvas/);
  assert.match(styles, /ravine-audio-element/);
});

test("podcast playback progress persistence accepts audio and video media elements", () => {
  const actions = read("../components/WatchActions.tsx");
  assert.match(actions, /querySelector<HTMLMediaElement>\("\.watch-video"\)/);
  assert.match(actions, /watch_history/);
  assert.match(actions, /progress_seconds/);
});
