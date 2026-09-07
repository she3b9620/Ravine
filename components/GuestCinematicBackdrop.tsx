"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GuestCinematicBackdropProps = { locale: "ar" | "en" };
type Work = { id: number; video_url: string | null; thumbnail_url: string | null; duration: number | null; content_type: string | null };
type VideoControlEvent = CustomEvent<{ action: "play" | "pause" | "next" | "previous" | "toggle-audio" | "set-volume" | "toggle-repeat" | "seek" | "replay"; muted?: boolean; volume?: number; repeat?: boolean; time?: number }>;

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
function shuffle<T>(items: T[]) { const result = [...items]; for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }

async function loadAllGuestHeroWorks(supabase: ReturnType<typeof createClient>) {
  const all: Work[] = [];
  for (let from = 0; ; from += HERO_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("videos")
      .select("id,video_url,thumbnail_url,duration,content_type")
      .eq("published", true)
      .not("video_url", "is", null)
      .order("created_at", { ascending: false })
      .range(from, from + HERO_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as Work[];
    all.push(...page);
    if (page.length < HERO_PAGE_SIZE) break;
  }
  return all;
}

export default function GuestCinematicBackdrop({ locale }: GuestCinematicBackdropProps) {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isGuestHome, setIsGuestHome] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [repeat, setRepeat] = useState(false);
  const playableWorks = useMemo(() => shuffle(works.map((work) => ({ ...work, src: toPlaybackSource(work) })).filter((work) => work.src && work.content_type !== "podcast" && work.content_type !== "live")) as Array<Work & { src: string }>, [works]);
  const current = playableWorks[currentIndex] ?? null;

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
    void loadAllGuestHeroWorks(supabase).then((data) => { if (mounted) setWorks(data); }, () => { if (mounted) setWorks([]); });
    return () => { mounted = false; };
  }, [isGuestHome]);

  useEffect(() => { setCurrentIndex(0); }, [playableWorks.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current) return;
    video.load();
    video.muted = muted;
    video.volume = volume / 100;
    void video.play().then(() => undefined, () => undefined);
  }, [current?.src]);

  useEffect(() => { const video = videoRef.current; if (!video) return; video.muted = muted; video.volume = volume / 100; }, [muted, volume]);

  useEffect(() => {
    const handleControl = (event: Event) => {
      const detail = (event as VideoControlEvent).detail;
      const video = videoRef.current;
      if (!detail || !video) return;
      switch (detail.action) {
        case "play": void video.play().then(() => undefined, () => undefined); break;
        case "pause": video.pause(); break;
        case "toggle-audio": { const nextMuted = detail.muted ?? !video.muted; setMuted(nextMuted); video.muted = nextMuted; break; }
        case "set-volume": { const next = Math.max(0, Math.min(100, detail.volume ?? volume)); setVolume(next); video.volume = next / 100; const nextMuted = detail.muted ?? next === 0; setMuted(nextMuted); video.muted = nextMuted; break; }
        case "toggle-repeat": setRepeat(detail.repeat ?? !repeat); break;
        case "seek": if (Number.isFinite(detail.time)) video.currentTime = Math.max(0, detail.time as number); break;
        case "replay": video.currentTime = 0; void video.play().then(() => undefined, () => undefined); break;
        case "next": setCurrentIndex((index) => playableWorks.length ? (index + 1) % playableWorks.length : 0); break;
        case "previous": setCurrentIndex((index) => playableWorks.length ? (index - 1 + playableWorks.length) % playableWorks.length : 0); break;
      }
    };
    window.addEventListener("ravine-video-control", handleControl as EventListener);
    return () => window.removeEventListener("ravine-video-control", handleControl as EventListener);
  }, [playableWorks.length, repeat, volume]);

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

  if (!isGuestHome || !current) return null;
  return <div className="ravine-guest-cinematic-backdrop" aria-hidden="true"><video id="ravine-guest-cinematic-player" ref={videoRef} className="ravine-guest-cinematic-video" src={current.src} poster={current.thumbnail_url || undefined} muted={muted} playsInline autoPlay loop={false} controls={false} preload="metadata" disablePictureInPicture disableRemotePlayback /><span className="ravine-guest-cinematic-wash" /></div>;
}
