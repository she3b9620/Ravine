"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Locale = "ar" | "en";
type Category = { id: number; name: string; slug: string | null };

type Props = { locale: Locale; categories: Category[] };

const types = [
  { value: "video", ar: "فيديو", en: "Video" },
  { value: "short", ar: "قصير", en: "Short" },
  { value: "film", ar: "فيلم", en: "Film" },
  { value: "documentary", ar: "وثائقي", en: "Documentary" },
  { value: "podcast", ar: "بودكاست", en: "Podcast" },
  { value: "live", ar: "مباشر", en: "Live" },
] as const;

const durations = [
  { value: "under-5", ar: "أقل من 5 دقائق", en: "Under 5 min" },
  { value: "5-20", ar: "5–20 دقيقة", en: "5–20 min" },
  { value: "20-60", ar: "20–60 دقيقة", en: "20–60 min" },
  { value: "over-60", ar: "أكثر من 60 دقيقة", en: "Over 60 min" },
] as const;

const formats = [
  { value: "16:9", ar: "أفقي · 16:9", en: "Landscape · 16:9" },
  { value: "9:16", ar: "عمودي · 9:16", en: "Portrait · 9:16" },
  { value: "1:1", ar: "مربع · 1:1", en: "Square · 1:1" },
] as const;

const qualities = [
  { value: "1080p", ar: "1080p", en: "1080p" },
  { value: "1440p", ar: "1440p", en: "1440p" },
  { value: "4K", ar: "4K", en: "4K" },
] as const;

const arabicCategoryNames: Record<string, string> = {
  film: "سينما",
  cinema: "سينما",
  photography: "تصوير",
  editing: "مونتاج",
  motion: "موشن",
  vfx: "مؤثرات بصرية",
  documentary: "وثائقي",
  music: "موسيقى",
  podcasts: "برامج صوتية",
  podcast: "برامج صوتية",
  gaming: "ألعاب",
};

function categoryLabel(category: Category, locale: Locale) {
  if (locale !== "ar") return category.name;
  return arabicCategoryNames[category.slug?.toLowerCase() || ""] || category.name;
}

export default function SearchLauncher({ locale, categories }: Props) {
  const ar = locale === "ar";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [duration, setDuration] = useState("");
  const [format, setFormat] = useState("");
  const [quality, setQuality] = useState("");

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (advanced && duration) params.set("duration", duration);
    if (advanced && format) params.set("format", format);
    if (advanced && quality) params.set("quality", quality);
    setOpen(false);
    setAdvanced(false);
    router.push(`/${locale}/discover${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const label = ar ? "بحث" : "Search";

  return (
    <>
      <button type="button" className="ravine-minor-link ravine-search-trigger" onClick={() => setOpen(true)} aria-label={label}>
        <Search size={15} aria-hidden="true" />
        <span>{label}</span>
      </button>

      {open ? (
        <div className="ravine-search-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
          <div className={`ravine-search-dialog${advanced ? " is-advanced" : ""}`} role="dialog" aria-modal="true" aria-labelledby="ravine-search-title" dir={ar ? "rtl" : "ltr"}>
            <div className="ravine-search-dialog-head">
              <div>
                <div className="eyebrow">{ar ? "رَافِين / البحث" : "RAVINE / SEARCH"}</div>
                <h2 id="ravine-search-title">{ar ? "ابحث داخل عالم رَافِين." : "Search inside the RAVINE world."}</h2>
              </div>
              <button type="button" className="ravine-search-close" onClick={() => setOpen(false)} aria-label={ar ? "إغلاق البحث" : "Close search"}><X size={18} /></button>
            </div>

            <form onSubmit={submit} className="ravine-search-form">
              <label className="ravine-search-input">
                <Search size={18} aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder={ar ? "اسم عمل، فكرة، مبدع، موضوع..." : "A work, idea, creator, topic..."} />
              </label>

              <div className="ravine-search-field-grid two">
                <label className="ravine-search-field">
                  <span>{ar ? "التصنيف" : "Category"}</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option value="">{ar ? "كل التصنيفات" : "All categories"}</option>
                    {categories.map((item) => <option key={item.id} value={String(item.id)}>{categoryLabel(item, locale)}</option>)}
                  </select>
                </label>
                <label className="ravine-search-field">
                  <span>{ar ? "النوع" : "Type"}</span>
                  <select value={type} onChange={(event) => setType(event.target.value)}>
                    <option value="">{ar ? "كل الأنواع" : "All types"}</option>
                    {types.map((item) => <option key={item.value} value={item.value}>{item[locale]}</option>)}
                  </select>
                </label>
              </div>

              <button type="button" className={`ravine-advanced-search-toggle${advanced ? " active" : ""}`} onClick={() => setAdvanced(!advanced)}>
                <SlidersHorizontal size={16} />
                <span>{ar ? "بحث متقدم" : "Advanced search"}</span>
              </button>

              <div className={`ravine-search-advanced${advanced ? " open" : ""}`} aria-hidden={!advanced}>
                <div className="ravine-search-field-grid three">
                  <label className="ravine-search-field"><span>{ar ? "المدة" : "Duration"}</span><select value={duration} onChange={(event) => setDuration(event.target.value)} disabled={!advanced}><option value="">{ar ? "كل المدد" : "Any duration"}</option>{durations.map((item) => <option key={item.value} value={item.value}>{item[locale]}</option>)}</select></label>
                  <label className="ravine-search-field"><span>{ar ? "النسبة" : "Format"}</span><select value={format} onChange={(event) => setFormat(event.target.value)} disabled={!advanced}><option value="">{ar ? "كل النسب" : "Any format"}</option>{formats.map((item) => <option key={item.value} value={item.value}>{item[locale]}</option>)}</select></label>
                  <label className="ravine-search-field"><span>{ar ? "الجودة" : "Quality"}</span><select value={quality} onChange={(event) => setQuality(event.target.value)} disabled={!advanced}><option value="">{ar ? "كل الجودات" : "Any quality"}</option>{qualities.map((item) => <option key={item.value} value={item.value}>{item[locale]}</option>)}</select></label>
                </div>
              </div>

              <div className="ravine-search-actions">
                <button type="button" className="button secondary" onClick={() => { setQuery(""); setCategory(""); setType(""); setDuration(""); setFormat(""); setQuality(""); }}>{ar ? "مسح" : "Clear"}</button>
                <button type="submit" className="button primary">{ar ? "بحث" : "Search"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
