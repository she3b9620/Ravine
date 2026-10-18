import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manager = readFileSync(new URL("../components/StudioWorkManager.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../components/StudioWorkManager.module.css", import.meta.url), "utf8");

test("Studio work manager provides local search, status and format filters, and sorting", () => {
  assert.match(manager, /const \[query, setQuery\] = useState/);
  assert.match(manager, /const \[statusFilter, setStatusFilter\] = useState/);
  assert.match(manager, /const \[typeFilter, setTypeFilter\] = useState/);
  assert.match(manager, /const \[sortMode, setSortMode\] = useState/);
  assert.match(manager, /const visibleWorks = useMemo/);
  assert.match(manager, /visibleWorks\.map\(\(work\)/);
  assert.match(manager, /if \(sortMode === "views"\)/);
  assert.match(manager, /if \(sortMode === "likes"\)/);
  assert.match(manager, /if \(sortMode === "title"\)/);
});

test("Studio work manager has responsive bilingual discovery and no-result states", () => {
  assert.match(manager, /البحث في أعمالك/);
  assert.match(manager, /Search your work/);
  assert.match(manager, /لا توجد أعمال مطابقة/);
  assert.match(manager, /No matching work/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /data-theme="light"/);
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


test("Studio explains why a work with retained financial records can only be hidden, not deleted", () => {
  assert.match(manager, /RAVINE_WORK_HAS_FINANCIAL_RECORDS/);
  assert.match(manager, /لا يمكن حذف هذا العمل نهائيًا لوجود سجل مالي مرتبط به/);
  assert.match(manager, /Use “Unpublish” to hide it instead/);
});
