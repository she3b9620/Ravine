"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import SearchResultsPanel from "./SearchResultsPanel";

type Locale = "ar" | "en";
type Category = { id: number; name: string; slug: string | null };
type Props = { locale: Locale; categories: Category[] };
type Option = { value: string; ar: string; en: string };
const TYPES: Option[] = [{ value: "video", ar: "فيديو", en: "Video" }, { value: "short", ar: "قصير", en: "Short" }, { value: "film", ar: "فيلم", en: "Film" }, { value: "documentary", ar: "وثائقي", en: "Documentary" }, { value: "podcast", ar: "بودكاست", en: "Podcast" }, { value: "live", ar: "مباشر", en: "Live" }];
const DURATIONS: Option[] = [{ value: "under-5", ar: "أقل من 5 دقائق", en: "Under 5 min" }, { value: "5-20", ar: "5–20 دقيقة", en: "5–20 min" }, { value: "20-60", ar: "20–60 دقيقة", en: "20–60 min" }, { value: "over-60", ar: "أكثر من 60 دقيقة", en: "Over 60 min" }];
const FORMATS: Option[] = [{ value: "16:9", ar: "أفقي · 16:9", en: "Landscape · 16:9" }, { value: "9:16", ar: "عمودي · 9:16", en: "Portrait · 9:16" }, { value: "1:1", ar: "مربع · 1:1", en: "Square · 1:1" }];
const QUALITIES: Option[] = [{ value: "144p", ar: "144p", en: "144p" }, { value: "240p", ar: "240p", en: "240p" }, { value: "360p", ar: "360p", en: "360p" }, { value: "480p", ar: "480p", en: "480p" }, { value: "720p", ar: "720p", en: "720p" }, { value: "1080p", ar: "1080p", en: "1080p" }, { value: "1440p", ar: "1440p", en: "1440p" }, { value: "4K", ar: "4K", en: "4K" }];
const ARABIC_CATEGORY_NAMES: Record<string, string> = { film: "سينما", cinema: "سينما", photography: "تصوير", editing: "مونتاج", motion: "موشن", vfx: "مؤثرات بصرية", documentary: "وثائقي", music: "موسيقى", podcast: "برامج صوتية", podcasts: "برامج صوتية", gaming: "ألعاب", education: "تعليم", tech: "تقنية", technology: "تقنية" };
function categoryLabel(category: Category, locale: Locale) { return locale === "en" ? category.name : ARABIC_CATEGORY_NAMES[category.slug?.toLowerCase() || ""] || category.name; }
const CLOSE_MS = 260;

export default function SearchLauncher({ locale, categories }: Props) {
  const ar = locale === "ar";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [duration, setDuration] = useState("");
  const [format, setFormat] = useState("");
  const [quality, setQuality] = useState("");
  const closeTimerRef = useRef<number | null>(null);
  const close = useCallback(() => {
    if (!open || closing) return;
    setClosing(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => { setOpen(false); setClosing(false); setAdvanced(false); closeTimerRef.current = null; }, CLOSE_MS);
  }, [open, closing]);

  useEffect(() => () => { if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current); }, []);

  useEffect(() => {
    if (!open) return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.documentElement.style.overflow = previousHtmlOverflow; document.body.style.overflow = previousBodyOverflow; document.body.style.paddingRight = previousPaddingRight; window.removeEventListener("keydown", onKeyDown); };
  }, [open, close]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const cleanQuery = query.trim();
    if (cleanQuery) params.set("q", cleanQuery);
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (advanced && duration) params.set("duration", duration);
    if (advanced && format) params.set("format", format);
    if (advanced && quality) params.set("quality", quality);
    const search = params.toString();
    const destination = `/${locale}/discover${search ? `?${search}` : ""}`;
    close();
    window.setTimeout(() => router.push(destination, { scroll: false }), CLOSE_MS);
  }

  function clear() { setQuery(""); setCategory(""); setType(""); setDuration(""); setFormat(""); setQuality(""); }

  const modal = open ? (
    <div className={`ravine-search-overlay${closing ? " is-closing" : ""}`} role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className={`ravine-search-dialog${advanced ? " is-advanced" : ""}${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="ravine-search-title" dir={ar ? "rtl" : "ltr"} onPointerDown={(event) => event.stopPropagation()}>
        <div className="ravine-search-dialog-head"><div><div className="eyebrow">{ar ? "رَافِين / البحث" : "RAVINE / SEARCH"}</div><h2 id="ravine-search-title">{ar ? "ابحث داخل عالم رَافِين." : "Search inside the RAVINE world."}</h2></div><button type="button" className="ravine-search-close" onClick={close} aria-label={ar ? "إغلاق البحث" : "Close search"}><X size={18} /></button></div>
        <form className="ravine-search-form" onSubmit={submit}>
          <div className="ravine-search-input"><Search size={18} aria-hidden="true" /><input name="q" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus dir="auto" placeholder={ar ? "اسم عمل، فكرة، مبدع، موضوع..." : "A work, idea, creator, topic..."} /></div>
          <div className="ravine-search-field-grid two"><SearchSelect label={ar ? "التصنيف" : "Category"} value={category} locale={locale} placeholder={ar ? "كل التصنيفات" : "All categories"} options={categories.map((item) => ({ value: String(item.id), ar: categoryLabel(item, "ar"), en: categoryLabel(item, "en") }))} onChange={setCategory} /><SearchSelect label={ar ? "النوع" : "Type"} value={type} locale={locale} placeholder={ar ? "كل الأنواع" : "All types"} options={TYPES} onChange={setType} /></div>
          <button type="button" className={`ravine-advanced-search-toggle${advanced ? " active" : ""}`} onClick={() => setAdvanced((value) => !value)} aria-expanded={advanced}><SlidersHorizontal size={16} /><span>{ar ? "بحث متقدم" : "Advanced search"}</span><ChevronDown size={15} className="ravine-advanced-chevron" /></button>
          <div className={`ravine-search-advanced${advanced ? " open" : ""}`} aria-hidden={!advanced}><div className="ravine-search-field-grid three"><SearchSelect label={ar ? "المدة" : "Duration"} value={duration} locale={locale} placeholder={ar ? "كل المدد" : "Any duration"} options={DURATIONS} onChange={setDuration} disabled={!advanced} /><SearchSelect label={ar ? "النسبة" : "Format"} value={format} locale={locale} placeholder={ar ? "كل النسب" : "Any format"} options={FORMATS} onChange={setFormat} disabled={!advanced} /><SearchSelect label={ar ? "الجودة" : "Quality"} value={quality} locale={locale} placeholder={ar ? "كل الجودات" : "Any quality"} options={QUALITIES} onChange={setQuality} disabled={!advanced} /></div></div>
          <div className="ravine-search-actions"><button type="button" className="button secondary ravine-search-clear" onClick={clear}>{ar ? "مسح" : "Clear"}</button><button type="submit" className="button primary">{ar ? "بحث" : "Search"}</button></div>
        </form>
        <SearchResultsPanel locale={locale} query={query} category={category} type={type} duration={advanced ? duration : ""} format={advanced ? format : ""} quality={advanced ? quality : ""} />
      </div>
    </div>
  ) : null;

  return <><button type="button" className="ravine-minor-link ravine-search-trigger" onPointerDown={(event) => event.stopPropagation()} onClick={() => { setClosing(false); setOpen(true); }} aria-label={ar ? "بحث" : "Search"}><Search size={15} aria-hidden="true" /><span>{ar ? "بحث" : "Search"}</span></button>{modal && typeof document !== "undefined" ? createPortal(modal, document.body) : null}</>;
}

function SearchSelect({ label, value, locale, placeholder, options, onChange, disabled = false }: { label: string; value: string; locale: Locale; placeholder: string; options: Option[]; onChange: (value: string) => void; disabled?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const current = options.find((item) => item.value === value);
  const isArabic = locale === "ar";
  useEffect(() => { const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("pointerdown", onPointerDown); return () => document.removeEventListener("pointerdown", onPointerDown); }, []);
  return <div ref={rootRef} className={`ravine-search-select${open ? " is-open" : ""}${value ? " has-value" : ""}${disabled ? " is-disabled" : ""}`}><span className="ravine-search-field-label">{label}</span><button type="button" className="ravine-search-select-trigger" disabled={disabled} aria-expanded={open} onClick={() => { if (!disabled) setOpen((state) => !state); }}><span>{current ? current[locale] : placeholder}</span><ChevronDown size={16} aria-hidden="true" /></button>{open ? <div className="ravine-search-select-menu" role="listbox"><button type="button" className={!value ? "is-selected" : ""} onClick={() => { onChange(""); setOpen(false); }}><span>{placeholder}</span></button>{options.map((item) => <button type="button" key={item.value} className={value === item.value ? "is-selected" : ""} onClick={() => { onChange(item.value); setOpen(false); }}><span>{item[locale]}</span></button>)}</div> : null}</div>;
}
