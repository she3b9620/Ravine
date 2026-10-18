import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manager = readFileSync(new URL("../components/StudioWorkManager.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/[locale]/studio/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../components/StudioWorkManager.module.css", import.meta.url), "utf8");

test("Studio filter form submits server-side search, status, type, and sort parameters", () => {
  assert.match(manager, /method="get"/);
  for (const name of ["workSearch", "workStatus", "workType", "workSort", "creatorId"]) {
    assert.ok(manager.includes(`name="${name}"`));
  }
  assert.ok(manager.includes('name="workPage" value="1"'));
  assert.ok(manager.includes("resultCount.toLocaleString"));
  assert.ok(manager.includes("works.map((work)"));
  assert.doesNotMatch(manager, /const visibleWorks = useMemo/);
  assert.ok(page.includes("full catalogue before pagination"));
});

test("Studio work manager has responsive bilingual discovery and no-result states", () => {
  assert.match(manager, /البحث في أعمالك/);
  assert.match(manager, /Search your work/);
  assert.match(manager, /لا توجد أعمال مطابقة/);
  assert.match(manager, /No matching work/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /data-theme="light"/);
  assert.match(styles, /\.applyFilters/);
});

test("creators can preview a draft or published work from the Studio manager", () => {
  assert.match(manager, /href=\{"\/" \+ locale \+ "\/watch\/" \+ work\.id\}/);
  assert.match(manager, /"معاينة"/);
  assert.match(manager, /"Preview"/);
});

test("Studio work actions use localized recovery messages instead of raw provider failures", () => {
  assert.match(manager, /function studioActionError\(ar: boolean, action: StudioAction\)/);
  assert.match(manager, /تعذّر حفظ تعديلات العمل/);
  assert.match(manager, /Could not save these changes/);
  assert.match(manager, /تعذّر نشر العمل/);
  assert.match(manager, /تعذّر إخفاء العمل/);
  assert.match(manager, /تعذّر حذف العمل/);
  assert.doesNotMatch(manager, /setError\(saveError instanceof Error \? saveError\.message/);
  assert.doesNotMatch(manager, /setError\(publishError instanceof Error \? publishError\.message/);
  assert.doesNotMatch(manager, /setError\(deleteError instanceof Error \? deleteError\.message/);
});

test("Studio metadata editor only offers quality values accepted by the database schema", () => {
  const qualityOptions = manager.match(/<select value=\{editQuality\}[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? "";
  assert.match(qualityOptions, /value="720p"/);
  assert.match(qualityOptions, /value="1080p"/);
  assert.match(qualityOptions, /value="2k"/);
  assert.match(qualityOptions, /value="4k"/);
  assert.doesNotMatch(qualityOptions, /1440p|2160p/);
});

test("Studio uses server-returned work as its source of truth and refreshes after mutations", () => {
  assert.ok(manager.includes("const works = initialWorks"));
  assert.ok(manager.includes("const router = useRouter()"));
  assert.ok(manager.includes("router.refresh()"));
  assert.doesNotMatch(manager, /setState synchronously within an effect/);
  assert.doesNotMatch(manager, /setWorks\(/);
});

test("Studio explains why a work with retained financial records can only be hidden, not deleted", () => {
  assert.match(manager, /RAVINE_WORK_HAS_FINANCIAL_RECORDS/);
  assert.match(manager, /لا يمكن حذف هذا العمل نهائيًا لوجود سجل مالي مرتبط به/);
  assert.match(manager, /Use “Unpublish” to hide it instead/);
});
