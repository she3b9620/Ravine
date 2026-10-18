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
