"use client";

import { useEffect, useRef, useState } from "react";

type Category = { id: number; name: string; slug: string | null };
type Locale = "ar" | "en";

type Props = {
  locale: Locale;
  query: string;
  category: string;
  type: string;
  categories: Category[];
};

const types = [
  { value: "video", ar: "فيديو", en: "Video" },
  { value: "short", ar: "قصير", en: "Short" },
  { value: "podcast", ar: "بودكاست", en: "Podcast" },
  { value: "live", ar: "مباشر", en: "Live" },
];

export default function DiscoverFilters({ locale, query, category, type, categories }: Props) {
  const isArabic = locale === "ar";
  const [open, setOpen] = useState<"category" | "type" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedType, setSelectedType] = useState(type);
  const rootRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const categoryLabel = selectedCategory
    ? categories.find((item) => String(item.id) === selectedCategory)?.name ?? (isArabic ? "تصنيف" : "Category")
    : isArabic ? "كل التصنيفات" : "All categories";
  const typeLabel = selectedType
    ? types.find((item) => item.value === selectedType)?.[locale] ?? selectedType
    : isArabic ? "كل الأنواع" : "All types";

  return (
    <form ref={rootRef} className="discover-filters" action={`/${locale}/discover`}>
      <label className="discover-search">
        <span aria-hidden="true">⌕</span>
        <input
          name="q"
          defaultValue={query}
          placeholder={isArabic ? "ابحث عن عمل أو فكرة..." : "Search work or ideas..."}
        />
      </label>

      <div className="discover-filter-field">
        <button
          className={`discover-filter-trigger${open === "category" ? " is-open" : ""}`}
          type="button"
          aria-expanded={open === "category"}
          onClick={() => setOpen(open === "category" ? null : "category")}
        >
          <span className="discover-filter-copy">
            <small>{isArabic ? "التصنيف" : "Category"}</small>
            <strong>{categoryLabel}</strong>
          </span>
          <span className="discover-chevron" aria-hidden="true">⌄</span>
        </button>
        {open === "category" && (
          <div className="discover-filter-menu" role="listbox" aria-label={isArabic ? "اختيار التصنيف" : "Choose category"}>
            <button
              type="button"
              className={!selectedCategory ? "is-selected" : ""}
              onClick={() => { setSelectedCategory(""); setOpen(null); }}
            >
              <span>{isArabic ? "كل التصنيفات" : "All categories"}</span>
              {!selectedCategory && <i>✓</i>}
            </button>
            {categories.map((item) => {
              const active = String(item.id) === selectedCategory;
              return (
                <button
                  type="button"
                  className={active ? "is-selected" : ""}
                  key={item.id}
                  onClick={() => { setSelectedCategory(String(item.id)); setOpen(null); }}
                >
                  <span>{item.name}</span>
                  {active && <i>✓</i>}
                </button>
              );
            })}
          </div>
        )}
        <input type="hidden" name="category" value={selectedCategory} />
      </div>

      <div className="discover-filter-field">
        <button
          className={`discover-filter-trigger${open === "type" ? " is-open" : ""}`}
          type="button"
          aria-expanded={open === "type"}
          onClick={() => setOpen(open === "type" ? null : "type")}
        >
          <span className="discover-filter-copy">
            <small>{isArabic ? "النوع" : "Type"}</small>
            <strong>{typeLabel}</strong>
          </span>
          <span className="discover-chevron" aria-hidden="true">⌄</span>
        </button>
        {open === "type" && (
          <div className="discover-filter-menu" role="listbox" aria-label={isArabic ? "اختيار النوع" : "Choose type"}>
            <button
              type="button"
              className={!selectedType ? "is-selected" : ""}
              onClick={() => { setSelectedType(""); setOpen(null); }}
            >
              <span>{isArabic ? "كل الأنواع" : "All types"}</span>
              {!selectedType && <i>✓</i>}
            </button>
            {types.map((item) => {
              const active = item.value === selectedType;
              return (
                <button
                  type="button"
                  className={active ? "is-selected" : ""}
                  key={item.value}
                  onClick={() => { setSelectedType(item.value); setOpen(null); }}
                >
                  <span>{item[locale]}</span>
                  {active && <i>✓</i>}
                </button>
              );
            })}
          </div>
        )}
        <input type="hidden" name="type" value={selectedType} />
      </div>

      <button className="button primary discover-submit" type="submit">
        {isArabic ? "اكتشف" : "Discover"}
      </button>
    </form>
  );
}
