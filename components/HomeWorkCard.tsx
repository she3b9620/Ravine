"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import {
  loadYouTubeIframeApi,
  type YouTubePlayer,
} from "@/lib/youtube-iframe-api";

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

type PreviewSource =
  | { kind: "local"; src: string }
  | { kind: "youtube"; id: string }
  | null;

function getCreator(creator: HomeWork["creators"]) {
  return Array.isArray(creator) ? creator[0] ?? null : creator;
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function contentTypeLabel(value: string | null, locale: Locale) {
  if (locale !== "ar") return value || "WORK";
  const labels: Record<string, string> = {
    short: "قصير",
    video: "فيديو",
    film: "فيلم",
    documentary: "وثائقي",
    podcast: "برنامج صوتي",
    live: "جلسة مباشرة",
    photo: "صورة",
    work: "عمل",
  };
  return labels[value?.toLowerCase() || "work"] || value || "عمل";
}

function qualityLabel(value: string | null, locale: Locale) {
  if (locale !== "ar") return value || "";
  const labels: Record<string, string> = {
    hd: "HD",
    fullhd: "1080p",
    uhd: "UHD",
    "4k": "4K",
    "8k": "8K",
  };
  return value ? labels[value.toLowerCase()] || value : "";
}

function getYouTubeVideoId(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] || null;
      }
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function previewSource(work: HomeWork): PreviewSource {
  const youtubeId = getYouTubeVideoId(work.video_url);
  if (youtubeId) return { kind: "youtube", id: youtubeId };

  if (!work.video_url) return null;

  try {
    const url = new URL(work.video_url);
    if (url.pathname.includes("/storage/v1/object/public/videos/")) {
      return { kind: "local", src: `/api/media/video/${work.id}` };
    }
  } catch {
    return null;
  }

  return { kind: "local", src: work.video_url };
}

export default function HomeWorkCard({
  work,
  locale,
  compact = false,
}: {
  work: HomeWork;
  locale: Locale;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeHostRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const fadeOutTimerRef = useRef<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [fading, setFading] = useState(false);

  const source = useMemo(
    () => previewSource(work),
    [work.id, work.video_url]
  );

  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    if (fadeOutTimerRef.current) window.clearTimeout(fadeOutTimerRef.current);
    hoverTimerRef.current = null;
    stopTimerRef.current = null;
    fadeOutTimerRef.current = null;
  }, []);

  const destroyYouTubePreview = useCallback(() => {
    youtubePlayerRef.current?.destroy();
    youtubePlayerRef.current = null;
    youtubeHostRef.current?.replaceChildren();
  }, []);

  const stopPreview = useCallback(() => {
    clearTimers();

    const video = videoRef.current;
    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // Ignore media reset races during unmount/navigation.
      }
    }

    destroyYouTubePreview();
    setFading(false);
    setPreviewing(false);
  }, [clearTimers, destroyYouTubePreview]);

  const startLocalPreview = useCallback((src: string) => {
    const video = videoRef.current;
    if (!video) return;

    setFading(false);
    setPreviewing(true);

    video.muted = true;
    video.volume = 0;
    video.playsInline = true;
    video.autoplay = true;
    video.controls = false;
    video.disablePictureInPicture = true;

    const begin = () => {
      try {
        video.currentTime = 0;
      } catch {
        // Ignore media reset races.
      }
      void video.play().catch(() => undefined);
    };

    if (video.src !== new URL(src, window.location.origin).href) {
      video.src = src;
    }

    if (video.readyState >= 1) begin();
    else video.addEventListener("loadedmetadata", begin, { once: true });

    video.load();
  }, []);

  const startYouTubePreview = useCallback(
    async (videoId: string) => {
      const host = youtubeHostRef.current;
      if (!host) return;

      try {
        const YT = await loadYouTubeIframeApi();
        if (!host.isConnected) return;

        destroyYouTubePreview();
        setFading(false);
        setPreviewing(true);

        const player = new YT.Player(host, {
          videoId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (youtubeHostRef.current !== host) return;
              player.mute?.();
              player.playVideo?.();
            },
            onStateChange: (event) => {
              if (event.data !== 0 || youtubeHostRef.current !== host) return;
              setFading(true);
              if (fadeOutTimerRef.current) {
                window.clearTimeout(fadeOutTimerRef.current);
              }
              fadeOutTimerRef.current = window.setTimeout(stopPreview, 220);
            },
          },
        });

        youtubePlayerRef.current = player;
      } catch {
        destroyYouTubePreview();
        setPreviewing(false);
      }
    },
    [destroyYouTubePreview, stopPreview]
  );

  const startPreview = useCallback(() => {
    if (!source) return;

    clearTimers();
    setFading(false);

    if (source.kind === "local") {
      startLocalPreview(source.src);
    } else {
      void startYouTubePreview(source.id);
    }

    stopTimerRef.current = window.setTimeout(() => {
      setFading(true);
      fadeOutTimerRef.current = window.setTimeout(stopPreview, 520);
    }, 5000);
  }, [clearTimers, source, startLocalPreview, startYouTubePreview, stopPreview]);

  const onEnter = () => {
    if (!source) return;
    clearTimers();
    hoverTimerRef.current = window.setTimeout(startPreview, 1000);
  };

  useEffect(() => () => stopPreview(), [stopPreview]);

  const creator = getCreator(work.creators);
  const type = contentTypeLabel(work.content_type, locale);
  const quality = qualityLabel(work.quality, locale);
  const title = work.title || (locale === "ar" ? "عمل بدون عنوان" : "Untitled work");
  const creatorName =
    creator?.name ||
    (creator?.username
      ? `@${creator.username}`
      : locale === "ar"
        ? "مبدع"
        : "Creator");

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
        <img
          className="home-work-thumb-image"
          src={work.thumbnail_url || "/RAVINE.PNG"}
          alt=""
          loading="lazy"
        />

        {source?.kind === "local" ? (
          <video
            ref={videoRef}
            src={source.src}
            className={`home-work-preview${previewing ? " visible" : ""}${fading ? " fading" : ""}`}
            muted
            playsInline
            autoPlay={false}
            controls={false}
            preload="none"
            poster={work.thumbnail_url || undefined}
            disablePictureInPicture
            aria-hidden="true"
            tabIndex={-1}
          />
        ) : null}

        {source?.kind === "youtube" ? (
          <div
            ref={youtubeHostRef}
            className={`home-work-preview home-work-preview-youtube${previewing ? " visible" : ""}${fading ? " fading" : ""}`}
            aria-hidden="true"
          />
        ) : null}

        <span className="home-work-preview-wash" aria-hidden="true" />
        <span className="home-work-duration">{formatDuration(work.duration)}</span>
        <span className="home-work-quality">{quality || type}</span>
      </div>

      <div className="home-work-body">
        <h3>{title}</h3>
        <p className="home-work-creator">{creatorName}</p>
        <div className="home-work-meta">
          <span>
            {formatRavineNumber(Number(work.views || 0), locale)} {locale === "ar" ? "مشاهدة" : "views"}
          </span>
          <span>
            {formatRavineNumber(Number(work.likes || 0), locale)} {locale === "ar" ? "إعجاب" : "likes"}
          </span>
        </div>
      </div>
    </Link>
  );
}
