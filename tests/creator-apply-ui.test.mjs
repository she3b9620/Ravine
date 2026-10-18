import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../app/[locale]/creator/apply/page.tsx");
const styles = read("../app/[locale]/creator/creator-flow.module.css");
const workflow = read("../.github/workflows/clean-rebuild-build.yml");

test("every CSS module class used by the creator application page has a selector", () => {
  const referenced = [...page.matchAll(/styles\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]);
  const missing = [...new Set(referenced.filter((name) => !new RegExp("\\." + name + "(?=[\\s:{,])").test(styles)))];
  assert.deepEqual(missing, [], "creator application styles must not silently reference undefined CSS module classes");
});

test("creator application retains its four-step, bilingual evidence-first flow", () => {
  assert.match(page, /STEP_DEFINITIONS/);
  assert.match(page, /هويتك الإبداعية/);
  assert.match(page, /Creative identity/);
  assert.match(page, /Show your work, not your follower count\./);
  assert.match(page, /creator_applications/);
  assert.match(page, /work_samples/);
});

test("creator application layout includes responsive and keyboard-accessible states", () => {
  assert.match(styles, /@media\(max-width:860px\)/);
  assert.match(styles, /@media\(max-width:560px\)/);
  assert.match(styles, /\.railStep:focus-visible/);
  assert.match(styles, /\.specialtyChip:focus-visible/);
  assert.match(styles, /\.statusSteps \.statusStep\s*\{/);
});

test("light-theme validation and rejected-application messages have explicit contrast styles", () => {
  assert.match(styles, /:global\(html\[data-theme="light"\]\) \.formMessage/);
  assert.match(styles, /:global\(html\[data-theme="light"\]\) \.rejectedNotice p/);
});

test("the creator application UI regression test is part of CI", () => {
  assert.match(workflow, /node --test tests\/creator-apply-ui\.test\.mjs/);
});

test("creator application and status screens use a centered wrapper with visible side gutters", () => {
  assert.match(styles, /\.applyPage\s*\{[^}]*max-width:\s*1440px/s);
  assert.match(styles, /\.applyPage\s*\{[^}]*box-sizing:\s*border-box/s);
  assert.match(styles, /\.applyPage\s*\{[^}]*margin-inline:\s*auto/s);
  assert.match(styles, /\.applyPage\s*\{[^}]*padding-inline:\s*clamp\(32px,5\.4vw,84px\)/s);
  assert.match(styles, /\.statusPage\s*\{[^}]*max-width:\s*1480px/s);
  assert.match(styles, /@media\(max-width:860px\)[\s\S]*?\.applyPage\{padding-inline:clamp\(16px,3vw,26px\)\}/);
  assert.match(styles, /@media\(max-width:560px\)[\s\S]*?\.applyPage\{padding-inline:16px/);
  assert.match(styles, /@media\(max-width:560px\)[\s\S]*?\.statusPage\{padding:30px 16px\}/);
});
