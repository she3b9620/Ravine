"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GuestCinematicBackdropProps = { locale: "ar" | "en" };
type Work = { id: number; video_url: string | null; thumbnail_url: string | null; duration: number | null; content_type: string | null };
type BackgroundMode = "image" | "video";
type StillImage = { id: number; thumbnail_url: string };
type VideoControlEvent = CustomEvent<{ action: "play" | "pause" | "next" | "previous" | "toggle-audio" | "set-volume" | "toggle-repeat" | "seek" | "replay" | "set-background-mode"; muted?: boolean; volume?: number; repeat?: boolean; time?: number; backgroundMode?: BackgroundMode }>;

const DEFAULT_VOLUME = 60;
const HERO_PAGE_SIZE = 500;

function toPlaybackSource(work: Work) {
  if (!work.video_url) return null;
  try {
    const url = new URL(work.video_url);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return null;
    if (url.pathname.includes("/storage/v1/object/public/videos/")) return `/api/media/video/${work.id}`;
  } catch { return null; }
  return work.video_url;
}
function stableMix<T extends { id: number }>(items: T[]) {
  const stableHash = (value: string) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };
  return [...items].sort((a, b) => stableHash(String(a.id)) - stableHash(String(b.id)) || a.id - b.id);
}

async function loadAllGuestHeroWorks(supabase: ReturnType<typeof createClient>) {
  const all: Work[] = [];
  for (let from = 0; ; from += HERO_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("videos")
      .select("id,video_url,thumbnail_url,duration,content_type")
      .eq("published", true)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .range(from, from + HERO_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as Work[];
    all.push(...page);
    if (page.length < HERO_PAGE_SIZE) break;
  }
  return all;
}

type CuratedHeroConfiguration = { useCuratedMedia: boolean; videos: Work[]; images: StillImage[] };

async function loadCuratedHeroMedia(supabase: ReturnType<typeof createClient>): Promise<CuratedHeroConfiguration> {
  const [settingsResult, itemsResult] = await Promise.all([
    supabase.from("ravine_hero_settings").select("use_curated_media").eq("id", 1).maybeSingle(),
    supabase.from("ravine_hero_media_items")
      .select("id,media_type,title,media_url,thumbnail_url,video_id,sort_order,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  // If the management schema is unavailable for any reason, preserve the legacy
  // automatic hero experience rather than leaving the guest landing blank.
  if (settingsResult.error || itemsResult.error) {
    return { useCuratedMedia: false, videos: [], images: [] };
  }

  const items = itemsResult.data ?? [];
  const videos: Work[] = items.flatMap((item) => {
    if (item.media_type !== "video" || !item.video_id || !item.media_url) return [];
    return [{
      id: Number(item.video_id),
      video_url: item.media_url,
      thumbnail_url: item.thumbnail_url ?? null,
      duration: null,
      content_type: "video",
    }];
  });
  const images: StillImage[] = items.flatMap((item) => {
    if (item.media_type !== "image" || !item.media_url) return [];
    const id = Number(item.id);
    return Number.isSafeInteger(id) && id > 0 ? [{ id, thumbnail_url: item.media_url }] : [];
  });

  return {
    useCuratedMedia: Boolean(settingsResult.data?.use_curated_media),
    videos,
    images,
  };
}

async function loadGuestPhotographyImages(supabase: ReturnType<typeof createClient>): Promise<StillImage[]> {
  // The newer Work model has a first-class photography type. It is optional
  // during the staged schema rollout, so callers fall back to public work
  // thumbnails whenever that table is not available yet.
  const { data, error } = await supabase
    .from("ravine_next_works")
    .select("id,poster_url,artwork_url,primary_media_url")
    .eq("status", "published")
    .eq("visibility", "public")
    .eq("discovery_enabled", true)
    .eq("work_type", "photography")
    .order("published_at", { ascending: false })
    .limit(500);

  if (error || !data) return [];
  return data.flatMap((row) => {
    const imageUrl = [row.artwork_url, row.poster_url, row.primary_media_url]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);
    const id = Number(row.id);
    return imageUrl && Number.isSafeInteger(id) && id > 0 ? [{ id, thumbnail_url: imageUrl }] : [];
  });
}

export default function GuestCinematicBackdrop({ locale }: GuestCinematicBackdropProps) {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isGuestHome, setIsGuestHome] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const [photoWorks, setPhotoWorks] = useState<StillImage[]>([]);
  const [heroCuratedMode, setHeroCuratedMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [repeat, setRepeat] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("video");
  const playableWorks = useMemo(() => {
    const available = works.map((work) => ({ ...work, src: toPlaybackSource(work) }))
      .filter((work) => work.src && work.content_type !== "podcast" && work.content_type !== "live") as Array<Work & { src: string }>;
    // Curated video order is controlled by the administrator in Hero Media.
    return heroCuratedMode ? available : stableMix(available);
  }, [heroCuratedMode, works]);
  // Curated mode uses only explicitly chosen stills; automatic mode can fall
  // back to thumbnails of public works when no separate photo feed is available.
  const imageWorks = useMemo(() => {
    if (heroCuratedMode) return [...photoWorks];
    const available = photoWorks.length
      ? photoWorks
      : works.filter((work): work is Work & { thumbnail_url: string } => Boolean(work.thumbnail_url))
          .map((work) => ({ id: work.id, thumbnail_url: work.thumbnail_url }));
    return stableMix(available);
  }, [heroCuratedMode, photoWorks, works]);
  const current = playableWorks[currentIndex] ?? null;
  const currentImage = imageWorks[imageIndex] ?? null;

  useEffect(() => {
    if (pathname !== `/${locale}`) { setIsGuestHome(false); return; }
    let mounted = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => { if (mounted) setIsGuestHome(!data.user); }, () => { if (mounted) setIsGuestHome(false); });
    return () => { mounted = false; };
  }, [locale, pathname]);

  useEffect(() => {
    if (!isGuestHome) return;
    let mounted = true;
    const supabase = createClient();
    void loadCuratedHeroMedia(supabase).then(async (configuration) => {
      if (!mounted) return;
      if (configuration.useCuratedMedia) {
        setHeroCuratedMode(true);
        setWorks(configuration.videos);
        setPhotoWorks(configuration.images);
        return;
      }
      setHeroCuratedMode(false);
      const [legacyWorks, legacyImages] = await Promise.all([
        loadAllGuestHeroWorks(supabase).catch(() => [] as Work[]),
        loadGuestPhotographyImages(supabase).catch(() => [] as StillImage[]),
      ]);
      if (!mounted) return;
      setWorks(legacyWorks);
      setPhotoWorks(legacyImages);
    }, async () => {
      if (!mounted) return;
      setHeroCuratedMode(false);
      const [legacyWorks, legacyImages] = await Promise.all([
        loadAllGuestHeroWorks(supabase).catch(() => [] as Work[]),
        loadGuestPhotographyImages(supabase).catch(() => [] as StillImage[]),
      ]);
      if (!mounted) return;
      setWorks(legacyWorks);
      setPhotoWorks(legacyImages);
    });
    return () => { mounted = false; };
  }, [isGuestHome]);

  useEffect(() => { setCurrentIndex(0); }, [playableWorks.length]);
  useEffect(() => { setImageIndex(0); }, [imageWorks.length]);
  useEffect(() => {
    // Keep the hero visible on catalogues that have photography but no playable
    // public video yet. With videos available, the normal initial mode remains video.
    if (playableWorks.length === 0 && imageWorks.length > 0 && backgroundMode !== "image") {
      setBackgroundMode("image");
    }
  }, [backgroundMode, imageWorks.length, playableWorks.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!current) {
      video.pause();
      return;
    }
    if (backgroundMode === "image") {
      video.pause();
      return;
    }
    video.load();
    video.muted = muted;
    video.volume = volume / 100;
    void video.play().then(() => undefined, () => undefined);
  }, [current?.src, backgroundMode]);

  useEffect(() => { const video = videoRef.current; if (!video) return; video.muted = muted; video.volume = volume / 100; }, [muted, volume]);

  useEffect(() => {
    const handleControl = (event: Event) => {
      const detail = (event as VideoControlEvent).detail;
      const video = videoRef.current;
      if (!detail) return;
      if (detail.action === "set-background-mode") {
        if (detail.backgroundMode === "image" || detail.backgroundMode === "video") setBackgroundMode(detail.backgroundMode);
        return;
      }
      if (!video) return;
      switch (detail.action) {
        case "play": if (backgroundMode === "image") { setBackgroundMode("video"); break; } void video.play().then(() => undefined, () => undefined); break;
        case "pause": video.pause(); break;
        case "toggle-audio": { const nextMuted = detail.muted ?? !video.muted; setMuted(nextMuted); video.muted = nextMuted; break; }
        case "set-volume": { const next = Math.max(0, Math.min(100, detail.volume ?? volume)); setVolume(next); video.volume = next / 100; const nextMuted = detail.muted ?? next === 0; setMuted(nextMuted); video.muted = nextMuted; break; }
        case "toggle-repeat": setRepeat(detail.repeat ?? !repeat); break;
        case "seek": if (Number.isFinite(detail.time)) video.currentTime = Math.max(0, detail.time as number); break;
        case "replay": if (backgroundMode === "image") setBackgroundMode("video"); video.currentTime = 0; void video.play().then(() => undefined, () => undefined); break;
        case "next":
          if (backgroundMode === "image") setImageIndex((index) => imageWorks.length ? (index + 1) % imageWorks.length : 0);
          else setCurrentIndex((index) => playableWorks.length ? (index + 1) % playableWorks.length : 0);
          break;
        case "previous":
          if (backgroundMode === "image") setImageIndex((index) => imageWorks.length ? (index - 1 + imageWorks.length) % imageWorks.length : 0);
          else setCurrentIndex((index) => playableWorks.length ? (index - 1 + playableWorks.length) % playableWorks.length : 0);
          break;
      }
    };
    window.addEventListener("ravine-video-control", handleControl as EventListener);
    return () => window.removeEventListener("ravine-video-control", handleControl as EventListener);
  }, [backgroundMode, imageWorks.length, playableWorks.length, repeat, volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const syncVolume = () => { const slider = document.querySelector<HTMLInputElement>(".guest-shell .ravine-video-volume-popover input[type='range']"); slider?.style.setProperty("--ravine-volume-progress", `${Math.round(video.volume * 100)}%`); };
    const onTime = () => window.dispatchEvent(new CustomEvent("ravine-video-timeline-state", { detail: { currentTime: video.currentTime || 0, duration: video.duration || current?.duration || 0 } }));
    const onPlay = () => window.dispatchEvent(new CustomEvent("ravine-video-playback-state", { detail: { playing: true, currentTime: video.currentTime || 0, duration: video.duration || current?.duration || 0 } }));
    const onPause = () => window.dispatchEvent(new CustomEvent("ravine-video-playback-state", { detail: { playing: false, currentTime: video.currentTime || 0, duration: video.duration || current?.duration || 0 } }));
    const onVolume = () => { setVolume(Math.round(video.volume * 100)); window.dispatchEvent(new CustomEvent("ravine-video-audio-state", { detail: { muted: video.muted, volume: Math.round(video.volume * 100) } })); syncVolume(); };
    const onEnded = () => { if (repeat) { video.currentTime = 0; void video.play().then(() => undefined, () => undefined); } else if (playableWorks.length > 1) setCurrentIndex((index) => (index + 1) % playableWorks.length); };
    video.addEventListener("timeupdate", onTime); video.addEventListener("play", onPlay); video.addEventListener("pause", onPause); video.addEventListener("volumechange", onVolume); video.addEventListener("ended", onEnded); syncVolume();
    return () => { video.removeEventListener("timeupdate", onTime); video.removeEventListener("play", onPlay); video.removeEventListener("pause", onPause); video.removeEventListener("volumechange", onVolume); video.removeEventListener("ended", onEnded); };
  }, [current?.duration, playableWorks.length, repeat]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ravine-video-background-mode-state", { detail: { backgroundMode } }));
  }, [backgroundMode]);

  if (!isGuestHome || (!current && !currentImage)) return null;
  return (
    <div className="ravine-guest-cinematic-backdrop" data-background-mode={backgroundMode} aria-hidden="true">
      {(backgroundMode === "image" ? currentImage?.thumbnail_url : current?.thumbnail_url || currentImage?.thumbnail_url) ? (
        <img
          className="ravine-guest-cinematic-image"
          src={(backgroundMode === "image" ? currentImage?.thumbnail_url : current?.thumbnail_url || currentImage?.thumbnail_url) ?? undefined}
          alt=""
          decoding="async"
        />
      ) : null}
      <video
        id="ravine-guest-cinematic-player"
        ref={videoRef}
        className="ravine-guest-cinematic-video"
        src={current?.src}
        poster={(current?.thumbnail_url || currentImage?.thumbnail_url) ?? undefined}
        muted={muted}
        playsInline
        autoPlay={backgroundMode === "video" && Boolean(current)}
        loop={false}
        controls={false}
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
      />
      <span className="ravine-guest-cinematic-wash" />
    </div>
  );
}
