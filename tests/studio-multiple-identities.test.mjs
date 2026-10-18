import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/[locale]/studio/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/[locale]/studio/studio.module.css", import.meta.url), "utf8");

test("Studio loads every creator identity owned by the signed-in account", () => {
  assert.match(page, /from\("creators"\)\.select\("id,name,username,specialty,followers"\)\.eq\("user_id", auth\.user\.id\)\.order\("created_at", \{ ascending: true \}\)/);
  assert.match(page, /const creators = \(creatorRows \?\? \[\]\) as CreatorIdentity\[\]/);
  assert.doesNotMatch(page, /from\("creators"\)[\s\S]{0,150}\.maybeSingle\(\)/);
  assert.match(page, /creatorsError/);
  assert.match(page, /Creator identities could not be loaded/);
});

test("a selected creator identity must belong to the current user's returned creator list", () => {
  assert.match(page, /searchParams: Promise<\{ workPage\?: string \| string\[\]; creatorId\?: string \| string\[\]; workSearch\?: string \| string\[\]; workStatus\?: string \| string\[\]; workType\?: string \| string\[\]; workSort\?: string \| string\[\] \}>/);
  assert.match(page, /const selectedCreatorId = rawCreatorId \? Number\(rawCreatorId\) : null/);
  assert.match(page, /!creators\.some\(\(item\) => item\.id === selectedCreatorId\)/);
  assert.match(page, /redirect\(/);
  assert.match(page, /creators\.find\(\(item\) => item\.id === selectedCreatorId\)/);
});

test("identity switch links keep the current creator selected across Studio pagination", () => {
  assert.match(page, /creators\.length > 1/);
  assert.match(page, /Choose creator identity/);
  assert.match(page, /اختيار هوية المبدع/);
  assert.match(page, /creatorId=.*identity\.id/);
  assert.match(page, /studioPageHref\(currentPage - 1\)/);
  assert.match(page, /studioPageHref\(currentPage \+ 1\)/);
  assert.match(page, /params\.set\("creatorId", String\(creator\.id\)\)/);
  assert.match(page, /params\.set\("workSearch", workSearch\)/);
  assert.match(page, /params\.set\("workStatus", workStatus\)/);
  assert.match(page, /params\.set\("workType", workType\)/);
  assert.match(page, /params\.set\("workSort", workSort\)/);
  assert.match(page, /aria-current=\{identity\.id === creator\.id/);
  assert.match(page, /Open public profile/);
});

test("creator identity choices are responsive and keyboard accessible", () => {
  assert.match(styles, /\.creatorSwitchOptions/);
  assert.match(styles, /\.creatorOptionActive/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
