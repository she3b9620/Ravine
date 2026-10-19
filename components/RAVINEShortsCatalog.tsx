"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LayoutGrid, Play, Smartphone } from "lucide-react";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import { resolveWorkPlaybackUrl } from "@/lib/ravine-playback-core";

type Locale = "ar" | "en";
type Work = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  quality: string | null;
};
type Props = { locale: Locale; works: Work[] };
type ViewMode = "grid" | "feed";

const STORAGE_KEY = "ravine.shorts.view-mode.v1";

function durationLabel(seconds: number | null, locale: Locale) {
  if (!seconds || seconds < 1) return locale === "ar" ? "—" : "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(remaining).padStart(2, "0")
    : minutes + ":" + String(remaining).padStart(2, "0");
}

export default function RAVINEShortsCatalog({ locale, works }: Props) {
  const ar = locale === "ar";
  const [mode, setMode] = useState<ViewMode>("grid");
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "grid" || saved === "feed") setMode(saved);
    } catch {
      // Storage may be disabled; the page remains fully usable with the grid default.
    }
    setPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // The chosen view still works for the current session when storage is unavailable.
    }
  }, [mode, preferenceLoaded]);

  useEffect(() => {
    if (mode !== "feed") {
      videoRefs.current.forEach((video) => video.pause());
      return;
    }

    const root = feedRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = Number((entry.target as HTMLElement).dataset.shortItem);
        const video = videoRefs.current.get(id);
        if (!video) continue;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          videoRefs.current.forEach((otherVideo) => {
            if (otherVideo !== video) otherVideo.pause();
          });
          void video.play().catch(() => undefined);
        } else if (!entry.isIntersecting || entry.intersectionRatio < 0.35) {
          video.pause();
        }
      }
    }, { root, threshold: [0.2, 0.35, 0.6, 0.8] });

    root.querySelectorAll<HTMLElement>("[data-short-item]").forEach((item) => observer.observe(item));
    return () => {
      observer.disconnect();
      videoRefs.current.forEach((video) => video.pause());
    };
  }, [mode, works]);

  const gridLabel = ar ? "العرض العادي" : "Grid view";
  const feedLabel = ar ? "العرض العمودي" : "Vertical feed";
  const modeDescription = ar
    ? "اختر الطريقة التي تناسبك لمشاهدة الشورتات. سيُحفظ اختيارك على هذا الجهاز."
    : "Choose how you want to browse Shorts. Your preference is saved on this device.";

  return (
    <div className="ravine-shorts-browser">
      <div className="ravine-shorts-view-switch">
        <div className="ravine-shorts-view-copy">
          <span className="ravine-shorts-view-eyebrow">{ar ? "طريقة العرض" : "VIEWING MODE"}</span>
          <p>{modeDescription}</p>
        </div>
        <div className="ravine-shorts-view-buttons" role="group" aria-label={ar ? "طريقة عرض الشورتات" : "Shorts viewing mode"}>
          <button type="button" className={mode === "grid" ? "is-active" : ""} aria-pressed={mode === "grid"} onClick={() => setMode("grid")}>
            <LayoutGrid size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>{gridLabel}</span>
          </button>
          <button type="button" className={mode === "feed" ? "is-active" : ""} aria-pressed={mode === "feed"} onClick={() => setMode("feed")}>
            <Smartphone size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>{feedLabel}</span>
          </button>
        </div>
      </div>

      {mode === "grid" ? (
        <div className="video-grid ravine-documentaries-grid ravine-shorts-grid">
          {works.map((work) => (
            <Link href={"/" + locale + "/watch/" + work.id} className="video-card ravine-short-grid-card" key={work.id}>
              <div className="video-thumb">
                <img src={work.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
                <span className="duration">{durationLabel(work.duration, locale)}</span>
                <span className="documentary-pill">{ar ? "شورت" : "SHORT"}</span>
              </div>
              <div className="video-meta">
                <div className="video-kicker">SHORT{work.quality ? " · " + work.quality : ""}</div>
                <h2>{work.title || (ar ? "بدون عنوان" : "Untitled")}</h2>
                <p>{work.description || (ar ? "عمل من مجتمع رَافِين." : "A work from the RAVINE community.")}</p>
                <div className="video-stats">
                  <span>{formatRavineNumber(Number(work.views || 0), locale)} {ar ? "مشاهدة" : "views"}</span>
                  <span>{formatRavineNumber(Number(work.likes || 0), locale)} {ar ? "إعجاب" : "likes"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="ravine-shorts-feed" ref={feedRef} aria-label={ar ? "تصفح الشورتات عموديًا" : "Scroll through Shorts vertically"}>
          {works.map((work) => {
            const title = work.title || (ar ? "شورت بدون عنوان" : "Untitled Short");
            const src = resolveWorkPlaybackUrl(work.id, work.video_url);
            return (
              <article className="ravine-shorts-feed-item" data-short-item={String(work.id)} key={work.id}>
                <div className="ravine-shorts-feed-frame">
                  {src ? (
                    <video
                      ref={(node) => {
                        if (node) videoRefs.current.set(work.id, node);
                        else videoRefs.current.delete(work.id);
                      }}
                      src={src}
                      poster={work.thumbnail_url || "/RAVINE.PNG"}
                      playsInline
                      muted
                      loop
                      controls
                      preload="metadata"
                      aria-label={title}
                    />
                  ) : (
                    <div className="ravine-shorts-feed-fallback">
                      <img src={work.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
                      <span>{ar ? "المعاينة المباشرة غير متاحة لهذا المصدر." : "Inline playback is not available for this source."}</span>
                    </div>
                  )}
                  <div className="ravine-shorts-feed-caption">
                    <span className="ravine-shorts-feed-kicker">{ar ? "شورت من رَافِين" : "RAVINE SHORT"}</span>
                    <h2><Link href={"/" + locale + "/watch/" + work.id}>{title}</Link></h2>
                  </div>
                </div>
                <div className="ravine-shorts-feed-details">
                  <p>{work.description || (ar ? "عمل من مجتمع رَافِين." : "A work from the RAVINE community.")}</p>
                  <div className="ravine-shorts-feed-stats">
                    <span>{formatRavineNumber(Number(work.views || 0), locale)} {ar ? "مشاهدة" : "views"}</span>
                    <span>{formatRavineNumber(Number(work.likes || 0), locale)} {ar ? "إعجاب" : "likes"}</span>
                    {work.quality ? <span>{work.quality}</span> : null}
                  </div>
                  <Link className="ravine-shorts-open-work" href={"/" + locale + "/watch/" + work.id}>
                    <Play size={15} strokeWidth={1.9} aria-hidden="true" />
                    <span>{ar ? "فتح صفحة العمل" : "Open work page"}</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
