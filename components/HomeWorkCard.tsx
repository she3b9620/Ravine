"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";

type Locale = "ar" | "en";

type WorkCreator = { name: string | null; username: string | null };

export type HomeWork = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  content_type: string | null;
  quality: string | null;
  creator_id: number | null;
  creators: WorkCreator[] | WorkCreator | null;
};

function getCreator(creator: HomeWork["creators"]) {
  return Array.isArray(creator) ? creator[0] ?? null : creator;
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}` : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function contentTypeLabel(value: string | null, locale: Locale) {
  if (locale !== "ar") return value || "WORK";
  const labels: Record<string, string> = { short: "قصير", video: "فيديو", film: "فيلم", documentary: "وثائقي", podcast: "برنامج صوتي", live: "جلسة مباشرة", photo: "صورة", work: "عمل" };
  return labels[value?.toLowerCase() || "work"] || value || "عمل";
}

function qualityLabel(value: string | null, locale: Locale) {
  if (locale !== "ar") return value || "";
  const labels: Record<string, string> = { hd: "HD", fullhd: "1080p", uhd: "UHD", "4k": "4K", "8k": "8K" };
  return value ? labels[value.toLowerCase()] || value : "";
}

function isYouTubeUrl(value: string | null) {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

function previewSource(work: HomeWork) {
  if (!work.video_url || isYouTubeUrl(work.video_url)) return null;
  try {
    const url = new URL(work.video_url);
    if (url.pathname.includes("/storage/v1/object/public/videos/")) return `/api/media/video/${work.id}`;
  } catch {
    return null;
  }
  return work.video_url;
}

export default function HomeWorkCard({ work, locale, compact = false }: { work: HomeWork; locale: Locale; compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const fadeOutTimerRef = useRef<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [fading, setFading] = useState(false);

  const previewSrc = previewSource(work);

  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    if (fadeOutTimerRef.current) window.clearTimeout(fadeOutTimerRef.current);
    hoverTimerRef.current = null;
    stopTimerRef.current = null;
    fadeOutTimerRef.current = null;
  }, []);

  const stopPreview = useCallback(() => {
    clearTimers();
    const video = videoRef.current;
    if (video) {
      video.pause();
      try { video.currentTime = 0; } catch {}
    }
    setFading(false);
    setPreviewing(false);
  }, [clearTimers]);

  const startPreview = useCallback(() => {
    const video = videoRef.current;
    if (!previewSrc || !video) return;

    clearTimers();
    setFading(false);
    setPreviewing(true);

    video.muted = true;
    video.volume = 0;
    video.playsInline = true;
    video.autoplay = true;
    video.controls = false;
    video.disablePictureInPicture = true;

    const begin = () => {
      try { video.currentTime = 0; } catch {}
      void video.play().catch(() => undefined);
    };

    if (video.readyState >= 1) begin();
    else video.addEventListener("loadedmetadata", begin, { once: true });
    video.load();

    stopTimerRef.current = window.setTimeout(() => {
      setFading(true);
      fadeOutTimerRef.current = window.setTimeout(stopPreview, 520);
    }, 5000);
  }, [clearTimers, previewSrc, stopPreview]);

  const onEnter = () => {
    if (!previewSrc) return;
    clearTimers();
    hoverTimerRef.current = window.setTimeout(startPreview, 1000);
  };

  useEffect(() => () => stopPreview(), [stopPreview]);

  const creator = getCreator(work.creators);
  const type = contentTypeLabel(work.content_type, locale);
  const quality = qualityLabel(work.quality, locale);
  const title = work.title || (locale === "ar" ? "عمل بدون عنوان" : "Untitled work");
  const creatorName = creator?.name || (creator?.username ? `@${creator.username}` : locale === "ar" ? "مبدع" : "Creator");

  return (
    <Link
      href={`/${locale}/watch/${work.id}`}
      className={`home-work-card${compact ? " compact" : ""}`}
      onMouseEnter={onEnter}
      onMouseLeave={stopPreview}
      onFocus={onEnter}
      onBlur={stopPreview}
      prefetch={false}
    >
      <div className={`home-work-thumb${previewing ? " is-previewing" : ""}`}>
        <img className="home-work-thumb-image" src={work.thumbnail_url || "/RAVINE.png"} alt="" loading="lazy" />
        {previewSrc ? (
          <video ref={videoRef} src={previewSrc} className={`home-work-preview${previewing ? " visible" : ""}${fading ? " fading" : ""}`} muted playsInline autoPlay={false} controls={false} preload="none" poster={work.thumbnail_url || undefined} disablePictureInPicture aria-hidden="true" tabIndex={-1} />
        ) : null}
        <span className="home-work-preview-wash" aria-hidden="true" />
        <span className="home-work-duration">{formatDuration(work.duration)}</span>
        <span className="home-work-quality">{quality || type}</span>
      </div>
      <div className="home-work-body">
        <h3>{title}</h3>
        <p className="home-work-creator">{creatorName}</p>
        <div className="home-work-meta">
          <span>{formatRavineNumber(Number(work.views || 0), locale)} {locale === "ar" ? "مشاهدة" : "views"}</span>
          <span>{formatRavineNumber(Number(work.likes || 0), locale)} {locale === "ar" ? "إعجاب" : "likes"}</span>
        </div>
      </div>
    </Link>
  );
}
