"use client";

import { useEffect } from "react";

function toWebVideoUrl(src: string) {
  try {
    const url = new URL(src, window.location.href);
    if (!url.hostname.endsWith("res.cloudinary.com")) return null;
    if (!url.pathname.includes("/video/upload/")) return null;
    if (!/\.(mkv|mov|avi|wmv|mxf|mpeg|mpg)$/i.test(url.pathname)) return null;

    const marker = "/video/upload/";
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;

    const before = url.pathname.slice(0, index + marker.length);
    const after = url.pathname.slice(index + marker.length);
    const transformed = after.replace(/\.[a-z0-9]+$/i, ".mp4");
    url.pathname = `${before}f_mp4,vc_h264/${transformed}`;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeVideo(video: HTMLVideoElement) {
  const source = video.getAttribute("src");
  if (!source) return;
  const normalized = toWebVideoUrl(source);
  if (!normalized || normalized === video.src) return;
  const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  const wasPaused = video.paused;
  video.src = normalized;
  video.load();
  if (!wasPaused) {
    void video.play().then(() => {
      if (currentTime > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(currentTime, video.duration);
    }).catch(() => undefined);
  }
}

export default function CloudinaryPlaybackFix() {
  useEffect(() => {
    const normalizeAll = () => {
      document.querySelectorAll<HTMLVideoElement>("video[src]").forEach(normalizeVideo);
    };

    normalizeAll();
    const observer = new MutationObserver((records) => {
      let shouldScan = false;
      for (const record of records) {
        if (record.type === "childList") shouldScan = true;
        if (record.type === "attributes" && record.attributeName === "src" && record.target instanceof HTMLVideoElement) normalizeVideo(record.target);
      }
      if (shouldScan) normalizeAll();
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => observer.disconnect();
  }, []);

  return null;
}
