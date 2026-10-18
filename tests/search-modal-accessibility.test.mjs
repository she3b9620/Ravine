import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("global search modal exposes dialog relationships, focus trapping, and focus restoration", () => {
  const source = read("../components/SearchLauncher.tsx");
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-controls="ravine-search-dialog"/);
  assert.match(source, /id="ravine-search-dialog"/);
  assert.match(source, /const triggerRef = useRef/);
  assert.match(source, /const dialogRef = useRef/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /event\.shiftKey && document\.activeElement === first/);
  assert.match(source, /!event\.shiftKey && document\.activeElement === last/);
  assert.match(source, /triggerRef\.current\?\.focus\(\)/);
  assert.match(source, /item\.getClientRects\(\)\.length > 0/);
});
