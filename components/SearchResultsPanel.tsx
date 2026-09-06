"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type SearchResultsPanelProps = {
  locale: "ar" | "en";
  query: string;
  category: string;
  type: string;
  duration: string;
  format: string;
  quality: string;
};

type Video = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  content_type: string | null;
  quality: string | null;
};

type Creator = {
  id: number;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialty: string | null;
  followers: number | null;
};

function durationLabel(seconds: number | null) {
  if (!seconds || seconds < 1) return "";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function shorten(value: string | null, max = 92) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value;
}

export default function SearchResultsPanel(props: SearchResultsPanelProps) {
  const { locale } = props;
  const ar = locale === "ar";
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (props.query.trim()) params.set("q", props.query.trim());
    if (props.category) params.set("category", props.category);
    if (props.type) params.set("type", props.type);
    if (props.duration) params.set("duration", props.duration);
    if (props.format) params.set("format", props.format);
    if (props.quality) params.set("quality", props.quality);
    return params.toString();
  }, [props.query, props.category, props.type, props.duration, props.format, props.quality]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/search${queryString ? `?${queryString}` : ""}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Search request failed");
        const payload = (await response.json()) as { videos?: Video[]; creators?: Creator[] };
        setVideos(payload.videos ?? []);
        setCreators(payload.creators ?? []);
        setHasLoaded(true);
      } catch {
        setVideos([]);
        setCreators([]);
        setError(true);
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    }, props.query.trim() ? 180 : 80);

    return () => window.clearTimeout(timer);
  }, [queryString, props.query]);

  const hasInput = Boolean(props.query.trim() || props.category || props.type || props.duration || props.format || props.quality);
  const discoverHref = `/${locale}/discover${queryString ? `?${queryString}` : ""}`;

  if (error) {
    return (
      <div className="ravine-search-live-state is-error">
        {ar ? "تعذر تحديث النتائج الآن." : "Results could not be updated right now."}
        <Link href={discoverHref} className="ravine-search-discover-cta">
          <span>{ar ? "اكتشف شيئًا أكبر" : "Discover something bigger"}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  if (loading && !hasLoaded) {
    return <div className="ravine-search-live-state">{ar ? "جارٍ البحث…" : "Searching…"}</div>;
  }

  if (!hasInput) {
    return (
      <div className="ravine-search-discovery">
        <div className="ravine-search-section-heading">
          <span>{ar ? "رَافِين / اكتشاف ذكي" : "RAVINE / SMART DISCOVERY"}</span>
          <strong>{ar ? "مساحة للاكتشاف، مش مجرد بحث." : "A discovery layer, not just a search box."}</strong>
        </div>
        <div className="ravine-search-discovery-grid">
          {videos.slice(0, 4).map((video) => (
            <Link href={`/${locale}/watch/${video.id}`} className="ravine-search-discovery-card" key={video.id}>
              <div className="ravine-search-result-thumb"><img src={video.thumbnail_url || "/RAVINE.PNG"} alt="" /></div>
              <div><small>{video.content_type || "WORK"}{video.quality ? ` · ${video.quality}` : ""}</small><strong>{video.title || (ar ? "عمل بدون عنوان" : "Untitled work")}</strong></div>
            </Link>
          ))}
        </div>
        {videos.length === 0 ? <div className="ravine-search-live-empty">{ar ? "ابدأ بالكتابة أو اختر تصنيفًا، وسأعرض لك النتائج فورًا." : "Start typing or choose a category and results will appear instantly."}</div> : null}
      </div>
    );
  }

  return (
    <div className="ravine-search-live-results" aria-live="polite">
      <div className="ravine-search-results-heading">
        <span>{loading ? (ar ? "تحديث النتائج…" : "Updating results…") : (ar ? "النتائج" : "RESULTS")}</span>
        <b>{videos.length + creators.length}</b>
      </div>

      {creators.length > 0 ? (
        <section className="ravine-search-result-section">
          <div className="ravine-search-result-label">{ar ? "المبدعون" : "CREATORS"}</div>
          <div className="ravine-search-creators-row">
            {creators.map((creator) => (
              <Link href={`/${locale}/creators/${creator.id}`} className="ravine-search-creator-card" key={creator.id}>
                <img src={creator.avatar_url || "/RAVINE.PNG"} alt="" />
                <div><strong>{creator.name || creator.username || (ar ? "مبدع" : "Creator")}</strong><small>{creator.specialty || creator.username || "RAVINE"}</small></div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ravine-search-result-section">
        <div className="ravine-search-result-label">{ar ? "الأعمال" : "WORK"}</div>
        {videos.length > 0 ? (
          <div className="ravine-search-video-list">
            {videos.map((video) => (
              <Link href={`/${locale}/watch/${video.id}`} className="ravine-search-video-result" key={video.id}>
                <div className="ravine-search-result-thumb"><img src={video.thumbnail_url || "/RAVINE.PNG"} alt="" /><span>{durationLabel(video.duration)}</span></div>
                <div className="ravine-search-video-copy"><small>{video.content_type || "WORK"}{video.quality ? ` · ${video.quality}` : ""}</small><strong>{video.title || (ar ? "عمل بدون عنوان" : "Untitled work")}</strong><p>{shorten(video.description, 88)}</p><em>{Number(video.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</em></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="ravine-search-live-empty">{ar ? "مفيش نتيجة مطابقة حاليًا. جرّب كلمة أو تصنيف مختلف." : "No matching work yet. Try another word or category."}</div>
        )}
      </section>

      <Link href={discoverHref} className="ravine-search-discover-cta" aria-label={ar ? "اكتشف شيئًا أكبر" : "Discover something bigger"}>
        <span>{ar ? "اكتشف شيئًا أكبر" : "Discover something bigger"}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
