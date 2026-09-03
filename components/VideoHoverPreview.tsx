"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type PreviewState = {
  anchor: HTMLAnchorElement;
  target: HTMLElement;
  videoUrl: string;
};

const videoCache = new Map<number, string | null>();

function getWatchId(anchor: HTMLAnchorElement) {
  const match = anchor.getAttribute("href")?.match(/\/watch\/(\d+)(?:[/?#]|$)/);
  return match ? Number(match[1]) : null;
}

function findPreviewTarget(anchor: HTMLAnchorElement) {
  return anchor.querySelector<HTMLElement>("[data-video-preview-target]") ?? anchor.querySelector<HTMLElement>(".aspect-video");
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
  const [phase, setPhase] = useState<"in" | "playing">("in");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideTimer = useRef<number | null>(null);
  const enterTimer = useRef<number | null>(null);
  const sequenceTimers = useRef<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (enterTimer.current !== null) window.clearTimeout(enterTimer.current);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      enterTimer.current = null;
      hideTimer.current = null;
      sequenceTimers.current.forEach((timer) => window.clearTimeout(timer));
      sequenceTimers.current = [];
    };

    const hide = () => {
      clearTimers();
      abortRef.current?.abort();
      abortRef.current = null;
      setPhase("in");
      setPreview(null);
    };

    const onOver = (event: MouseEvent) => {
      const targetElement = event.target instanceof Element ? event.target : null;
      const anchor = targetElement?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const id = getWatchId(anchor);
      const target = findPreviewTarget(anchor);
      if (id === null || !target) return;
      if (event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget)) return;

      clearTimers();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      anchor.classList.add("ravine-video-card");
      target.classList.add("ravine-video-hover-target");

      enterTimer.current = window.setTimeout(async () => {
        const videoUrl = await loadVideoUrl(id);
        if (controller.signal.aborted || !videoUrl) return;
        setPreview({ anchor, target, videoUrl });
        setPhase("in");
      }, 850);
    };

    const onOut = (event: MouseEvent) => {
      const targetElement = event.target instanceof Element ? event.target : null;
      const anchor = targetElement?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || getWatchId(anchor) === null) return;
      if (event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget)) return;
      hideTimer.current = window.setTimeout(hide, 100);
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
    const video = videoRef.current;
    if (!target || !video || !preview) return;

    target.style.position = "relative";
    let active = true;
    const timers: number[] = [];

    const seekTo = (ratio: number) => {
      if (!active || !Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = Math.min(Math.max(video.duration * ratio, 0.1), Math.max(video.duration - 0.15, 0.1));
    };

    const swapTo = (ratio: number) => {
      if (!active) return;
      target.classList.add("ravine-preview-swap");
      const timer = window.setTimeout(() => {
        if (!active) return;
        seekTo(ratio);
        target.classList.remove("ravine-preview-swap");
      }, 280);
      timers.push(timer);
    };

    const finish = () => {
      if (!active) return;
      setPhase("playing");
      timers.push(window.setTimeout(() => swapTo(0.46), 2100));
      timers.push(window.setTimeout(() => swapTo(0.76), 4400));
      timers.push(window.setTimeout(() => {
        target.classList.add("ravine-preview-out");
        timers.push(window.setTimeout(() => {
          if (!active) return;
          setPhase("in");
          setPreview(null);
          target.classList.remove("ravine-preview-out", "ravine-preview-swap");
        }, 440));
      }, 6700));
    };

    const start = () => {
      if (!active) return;
      seekTo(0.12);
      void video.play().catch(() => undefined);
      finish();
    };

    if (video.readyState >= 1) {
      const timer = window.setTimeout(start, 70);
      timers.push(timer);
    } else {
      video.onloadedmetadata = () => {
        if (!active) return;
        const timer = window.setTimeout(start, 70);
        timers.push(timer);
      };
    }

    sequenceTimers.current = timers;
    return () => {
      active = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      video.onloadedmetadata = null;
      video.pause();
      target.classList.remove("ravine-preview-out", "ravine-preview-swap");
    };
  }, [preview]);

  useEffect(() => {
    const target = preview?.target;
    if (!target) return;
    target.classList.toggle("ravine-preview-visible", phase === "playing");
    return () => target.classList.remove("ravine-preview-visible");
  }, [phase, preview]);

  if (!preview) return null;

  const style = {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    pointerEvents: "none" as const,
    zIndex: 8,
    opacity: 0,
  };

  return createPortal(
    <>
      <video ref={videoRef} src={preview.videoUrl} muted playsInline preload="metadata" style={style} aria-hidden="true" className="ravine-preview-video" />
      <div className="pointer-events-none absolute inset-0 z-[9] ravine-preview-shade" />
      <div className="pointer-events-none absolute left-3 top-3 z-[10] rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.16em] text-white/85 backdrop-blur-md">Preview</div>
    </>,
    preview.target,
  );
}
