"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type PreviewState = {
  anchor: HTMLAnchorElement;
  target: HTMLElement;
  videoUrl: string | null;
};

const videoCache = new Map<number, string | null>();

function getWatchId(anchor: HTMLAnchorElement) {
  const match = anchor.getAttribute("href")?.match(/\/watch\/(\d+)(?:[/?#]|$)/);
  return match ? Number(match[1]) : null;
}

function findPreviewTarget(anchor: HTMLAnchorElement) {
  return anchor.querySelector<HTMLElement>(".aspect-video") ?? anchor.querySelector<HTMLElement>("[data-video-preview-target]");
}

async function loadVideoUrl(id: number) {
  if (videoCache.has(id)) return videoCache.get(id) ?? null;
  const supabase = createClient();
  const { data } = await supabase.from("videos").select("video_url").eq("id", id).maybeSingle<{ video_url: string | null }>();
  const url = data?.video_url ?? null;
  videoCache.set(id, url);
  return url;
}

export default function VideoHoverPreview() {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideTimer = useRef<number | null>(null);
  const enterTimer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (enterTimer.current) window.clearTimeout(enterTimer.current);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      enterTimer.current = null;
      hideTimer.current = null;
    };

    const hide = () => {
      clearTimers();
      abortRef.current?.abort();
      abortRef.current = null;
      setPlaying(false);
      setPreview(null);
    };

    const onOver = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const id = getWatchId(anchor);
      const target = findPreviewTarget(anchor);
      if (!id || !target) return;
      if (anchor.contains(event.relatedTarget as Node | null)) return;
      clearTimers();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      target.classList.add("ravine-video-hover-target");
      enterTimer.current = window.setTimeout(async () => {
        const videoUrl = await loadVideoUrl(id);
        if (controller.signal.aborted) return;
        if (!videoUrl) return;
        setPreview({ anchor, target, videoUrl });
        setPlaying(false);
      }, 850);
    };

    const onOut = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !getWatchId(anchor)) return;
      if (anchor.contains(event.relatedTarget as Node | null)) return;
      hideTimer.current = window.setTimeout(hide, 90);
    };

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      clearTimers();
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const target = preview?.target;
    if (!target || !videoRef.current) return;
    const video = videoRef.current;
    let active = true;
    let sequenceTimer = 0;
    let startTimer = 0;

    const seekTo = (ratio: number) => {
      if (!active || !Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = Math.min(Math.max(video.duration * ratio, 0.1), Math.max(video.duration - 0.15, 0.1));
    };

    const playSequence = () => {
      if (!active) return;
      setPlaying(true);
      seekTo(0.12);
      void video.play().catch(() => undefined);
      sequenceTimer = window.setTimeout(() => {
        target.classList.add("ravine-preview-swap");
        window.setTimeout(() => {
          seekTo(0.46);
          target.classList.remove("ravine-preview-swap");
        }, 260);
        sequenceTimer = window.setTimeout(() => {
          target.classList.add("ravine-preview-swap");
          window.setTimeout(() => {
            seekTo(0.76);
            target.classList.remove("ravine-preview-swap");
          }, 260);
          sequenceTimer = window.setTimeout(() => {
            target.classList.add("ravine-preview-out");
            window.setTimeout(() => {
              if (!active) return;
              setPlaying(false);
              setPreview(null);
              target.classList.remove("ravine-preview-out");
            }, 420);
          }, 2200);
        }, 2200);
      }, 2200);
    };

    if (video.readyState >= 1) {
      startTimer = window.setTimeout(playSequence, 80);
    } else {
      video.onloadedmetadata = () => {
        startTimer = window.setTimeout(playSequence, 80);
      };
    }

    return () => {
      active = false;
      window.clearTimeout(sequenceTimer);
      window.clearTimeout(startTimer);
      video.onloadedmetadata = null;
      video.pause();
    };
  }, [preview]);

  if (!preview || !playing) return null;

  const style = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    pointerEvents: "none" as const,
    zIndex: 8,
  };

  if (getComputedStyle(preview.target).position === "static") preview.target.style.position = "relative";

  return createPortal(
    <>
      <video ref={videoRef} src={preview.videoUrl!} muted playsInline preload="metadata" style={style} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 z-[9]" style={{ background: "linear-gradient(to top, rgba(0,0,0,.38), transparent 52%)" }} />
      <div className="pointer-events-none absolute left-3 top-3 z-[10] rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.16em] text-white/85 backdrop-blur-md">Preview</div>
    </>,
    preview.target,
  );
}
