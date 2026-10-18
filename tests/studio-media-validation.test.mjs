import assert from "node:assert/strict";
import test from "node:test";
import { classifyRavineMediaFile, isAllowedRavineMediaFile } from "../lib/ravine-media-validation.mjs";

test("supported video types are accepted as standard work media", () => {
  for (const file of [
    { name: "film.mp4", type: "video/mp4" },
    { name: "clip.webm", type: "video/webm" },
    { name: "camera.mov", type: "video/quicktime" },
    { name: "master.mkv", type: "video/x-matroska" },
    { name: "unknown.mkv", type: "application/octet-stream" },
  ]) {
    assert.equal(classifyRavineMediaFile(file), "video");
    assert.equal(isAllowedRavineMediaFile(file, false), true);
  }
});
test("audio files are limited to podcast/audio-enabled slots", () => {
  const audio = { name: "episode.mp3", type: "audio/mpeg" };
  assert.equal(classifyRavineMediaFile(audio), "audio");
  assert.equal(isAllowedRavineMediaFile(audio, false), false);
  assert.equal(isAllowedRavineMediaFile(audio, true), true);
  assert.equal(isAllowedRavineMediaFile({ name: "voice.wav", type: "" }, true), true);
});
test("mismatched extensions and unsupported files are rejected before upload", () => {
  assert.equal(classifyRavineMediaFile({ name: "video.pdf", type: "video/mp4" }), null);
  assert.equal(classifyRavineMediaFile({ name: "audio.txt", type: "audio/mpeg" }), null);
  assert.equal(classifyRavineMediaFile({ name: "cover.png", type: "image/png" }), null);
  assert.equal(classifyRavineMediaFile({ name: "", type: "video/mp4" }), null);
  assert.equal(classifyRavineMediaFile(null), null);
  assert.equal(isAllowedRavineMediaFile({ name: "track.mp3", type: "audio/mpeg" }, false), false);
});
