"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";

type Category = { id: number; name: string; slug: string | null };
type Locale = "ar" | "en";
type FilterKey = "category" | "type";
type Props = { locale: Locale; query: string; category: string; type: string; duration: string; format: string; quality: string; sort: string; categories: Category[] };

const types = [
  { value: "video", ar: "فيديو", en: "Video" }, { value: "short", ar: "قصير", en: "Short" }, { value: "film", ar: "فيلم", en: "Film" },
  { value: "documentary", ar: "وثائقي", en: "Documentary" }, { value: "podcast", ar: "بودكاست", en: "Podcast" }, { value: "live", ar: "مباشر", en: "Live" },
];
const durations = [
  { value: "under-5", ar: "أقل من 5 دقائق", en: "Under 5 min" }, { value: "5-20", ar: "5–20 دقيقة", en: "5–20 min" },
  { value: "20-60", ar: "20–60 دقيقة", en: "20–60 min" }, { value: "over-60", ar: "أكثر من 60 دقيقة", en: "Over 60 min" },
];
const formats = [
  { value: "16:9", ar: "أفقي · 16:9", en: "Landscape · 16:9" }, { value: "9:16", ar: "عمودي · 9:16", en: "Portrait · 9:16" },
  { value: "1:1", ar: "مربع · 1:1", en: "Square · 1:1" }, { value: "other", ar: "نسبة أخرى", en: "Other ratio" },
];
const qualities = [{ value: "1080p", ar: "1080p", en: "1080p" }, { value: "1440p", ar: "1440p", en: "1440p" }, { value: "4K", ar: "4K", en: "4K" }];
const sorts = [{ value: "newest", ar: "الأحدث", en: "Newest" }, { value: "oldest", ar: "الأقدم", en: "Oldest" }];

export default function DiscoverFilters({ locale, query, category, type, duration, format, quality, sort, categories }: Props) {
  const isArabic = locale === "ar";
  const [open, setOpen] = useState<FilterKey | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedType, setSelectedType] = useState(type);
  const [selectedDuration, setSelectedDuration] = useState(duration);
  const [selectedFormat, setSelectedFormat] = useState(format);
  const [selectedQuality, setSelectedQuality] = useState(quality);
  const [selectedSort, setSelectedSort] = useState(sort || "newest");
  const rootRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!rootRef.current?.contains(target)) {
        setOpen(null); setAdvancedOpen(false); return;
      }
      if (!target.closest(".discover-filter-field") && !target.closest(".discover-more-trigger") && !target.closest(".discover-filter-sheet")) {
        setOpen(null); setAdvancedOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(null); setAdvancedOpen(false); } };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, []);

  const categoryLabel = selectedCategory ? categories.find((item) => String(item.id) === selectedCategory)?.name ?? (isArabic ? "تصنيف" : "Category") : isArabic ? "كل التصنيفات" : "All categories";
  const typeLabel = selectedType ? types.find((item) => item.value === selectedType)?.[locale] ?? selectedType : isArabic ? "كل الأنواع" : "All types";
  const advancedCount = [selectedDuration, selectedFormat, selectedQuality].filter(Boolean).length;

  function clearFilters() { setSelectedCategory(""); setSelectedType(""); setSelectedDuration(""); setSelectedFormat(""); setSelectedQuality(""); setSelectedSort("newest"); }

  return (
    <form ref={rootRef} className="discover-filters" action={`/${locale}/discover`}>
      <label className="discover-search"><span aria-hidden="true">⌕</span><input name="q" defaultValue={query} placeholder={isArabic ? "ابحث عن عمل أو فكرة..." : "Search work or ideas..."} /></label>
      <div className="discover-filter-field">
        <button className={`discover-filter-trigger${open === "category" ? " is-open" : ""}`} type="button" aria-expanded={open === "category"} onClick={() => { setAdvancedOpen(false); setOpen(open === "category" ? null : "category"); }}>
          <span className="discover-filter-copy"><small>{isArabic ? "التصنيف" : "Category"}</small><strong>{categoryLabel}</strong></span><span className="discover-chevron" aria-hidden="true"><ChevronDown size={16} /></span>
        </button>
        {open === "category" ? <div className="discover-filter-menu" role="listbox" aria-label={isArabic ? "اختيار التصنيف" : "Choose category"}>
          <button type="button" className={!selectedCategory ? "is-selected" : ""} onClick={() => { setSelectedCategory(""); setOpen(null); }}><span>{isArabic ? "كل التصنيفات" : "All categories"}</span>{!selectedCategory && <Check size={15} />}</button>
          {categories.map((item) => { const active = String(item.id) === selectedCategory; return <button type="button" className={active ? "is-selected" : ""} key={item.id} onClick={() => { setSelectedCategory(String(item.id)); setOpen(null); }}><span>{item.name}</span>{active && <Check size={15} />}</button>; })}
        </div> : null}
        <input type="hidden" name="category" value={selectedCategory} />
      </div>
      <div className="discover-filter-field">
        <button className={`discover-filter-trigger${open === "type" ? " is-open" : ""}`} type="button" aria-expanded={open === "type"} onClick={() => { setAdvancedOpen(false); setOpen(open === "type" ? null : "type"); }}>
          <span className="discover-filter-copy"><small>{isArabic ? "النوع" : "Type"}</small><strong>{typeLabel}</strong></span><span className="discover-chevron" aria-hidden="true"><ChevronDown size={16} /></span>
        </button>
        {open === "type" ? <div className="discover-filter-menu" role="listbox" aria-label={isArabic ? "اختيار النوع" : "Choose type"}>
          <button type="button" className={!selectedType ? "is-selected" : ""} onClick={() => { setSelectedType(""); setOpen(null); }}><span>{isArabic ? "كل الأنواع" : "All types"}</span>{!selectedType && <Check size={15} />}</button>
          {types.map((item) => { const active = item.value === selectedType; return <button type="button" className={active ? "is-selected" : ""} key={item.value} onClick={() => { setSelectedType(item.value); setOpen(null); }}><span>{item[locale]}</span>{active && <Check size={15} />}</button>; })}
        </div> : null}
        <input type="hidden" name="type" value={selectedType} />
      </div>
      <button className={`discover-more-trigger${advancedOpen ? " is-open" : ""}${advancedCount ? " has-active" : ""}`} type="button" aria-expanded={advancedOpen} onClick={() => { setOpen(null); setAdvancedOpen(!advancedOpen); }}><SlidersHorizontal size={17} /><span>{isArabic ? "فلاتر إضافية" : "More filters"}</span>{advancedCount > 0 ? <b>{advancedCount}</b> : null}</button>
      <button className="button primary discover-submit" type="submit">{isArabic ? "اكتشف" : "Discover"}</button>
      <div className={`discover-filter-sheet${advancedOpen ? " is-open" : ""}`} aria-hidden={!advancedOpen}>
        <div className="discover-filter-backdrop" onClick={() => setAdvancedOpen(false)} />
        <aside className="discover-filter-panel" role="dialog" aria-modal="true" aria-label={isArabic ? "فلاتر الاكتشاف" : "Discover filters"}>
          <div className="discover-filter-panel-head"><div><span>RAVINE / FILTERS</span><h2>{isArabic ? "شكّل طريق اكتشافك." : "Shape your discovery path."}</h2></div><button type="button" className="discover-filter-close" onClick={() => setAdvancedOpen(false)} aria-label={isArabic ? "إغلاق الفلاتر" : "Close filters"}><X size={18} /></button></div>
          <div className="discover-filter-panel-grid">
            <FilterSelect locale={locale} label={isArabic ? "المدة" : "Duration"} value={selectedDuration} options={durations} onChange={setSelectedDuration} />
            <FilterSelect locale={locale} label={isArabic ? "النسبة" : "Format"} value={selectedFormat} options={formats} onChange={setSelectedFormat} />
            <FilterSelect locale={locale} label={isArabic ? "الجودة" : "Quality"} value={selectedQuality} options={qualities} onChange={setSelectedQuality} />
            <FilterSelect locale={locale} label={isArabic ? "الترتيب" : "Order"} value={selectedSort} options={sorts} onChange={setSelectedSort} />
          </div>
          <div className="discover-filter-panel-foot"><button type="button" className="discover-clear" onClick={clearFilters}><RotateCcw size={15} />{isArabic ? "مسح الفلاتر" : "Reset filters"}</button><button type="button" className="button primary discover-apply" onClick={() => setAdvancedOpen(false)}>{isArabic ? "تم" : "Done"}</button></div>
        </aside>
      </div>
      <input type="hidden" name="duration" value={selectedDuration} /><input type="hidden" name="format" value={selectedFormat} /><input type="hidden" name="quality" value={selectedQuality} /><input type="hidden" name="sort" value={selectedSort} />
    </form>
  );
}

function FilterSelect({ locale, label, value, options, onChange }: { locale: Locale; label: string; value: string; options: Array<{ value: string; ar: string; en: string }>; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value);
  const isArabic = locale === "ar";
  useEffect(() => { const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("pointerdown", onPointerDown); return () => document.removeEventListener("pointerdown", onPointerDown); }, []);
  return <div className="discover-panel-field" ref={rootRef}><small>{label}</small><button type="button" className={`discover-panel-select${open ? " is-open" : ""}${value ? " has-value" : ""}`} onClick={() => setOpen(!open)} aria-expanded={open}><span>{current ? current[locale] : (isArabic ? "كل الخيارات" : "Any")}</span><ChevronDown size={16} /></button>{open ? <div className="discover-panel-menu" role="listbox"><button type="button" className={!value ? "is-selected" : ""} onClick={() => { onChange(""); setOpen(false); }}><span>{isArabic ? "كل الخيارات" : "Any"}</span>{!value && <Check size={15} />}</button>{options.map((option) => <button type="button" key={option.value} className={value === option.value ? "is-selected" : ""} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option[locale]}</span>{value === option.value && <Check size={15} />}</button>)}</div> : null}</div>;
}
