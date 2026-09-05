"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type VideoAudioToggleProps = { locale: "ar" | "en" };

function sendPlayerCommand(command: "mute" | "unMute") {
  const iframe = document.getElementById("ravine-guest-cinematic-player") as HTMLIFrameElement | null;
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: command, args: [] }), "https://www.youtube-nocookie.com");
}

export default function VideoAudioToggle({ locale }: VideoAudioToggleProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (pathname !== `/${locale}`) {
      setVisible(false);
      return;
    }
    setVisible(Boolean(document.querySelector(".guest-shell")));
  }, [locale, pathname]);

  useEffect(() => {
    const syncState = (event: Event) => {
      const customEvent = event as CustomEvent<{ muted?: boolean }>;
      if (typeof customEvent.detail?.muted === "boolean") setMuted(customEvent.detail.muted);
    };
    window.addEventListener("ravine-video-audio-state", syncState);
    return () => window.removeEventListener("ravine-video-audio-state", syncState);
  }, []);

  if (!visible) return null;

  const label = muted
    ? (locale === "ar" ? "تشغيل صوت الفيديو" : "Turn video sound on")
    : (locale === "ar" ? "كتم صوت الفيديو" : "Mute video sound");

  return (
    <button
      type="button"
      className="ravine-hero-video-audio-toggle"
      aria-label={label}
      aria-pressed={!muted}
      onClick={() => {
        const nextMuted = !muted;
        setMuted(nextMuted);
        sendPlayerCommand(nextMuted ? "mute" : "unMute");
        window.dispatchEvent(new CustomEvent("ravine-video-audio-toggle", { detail: { muted: nextMuted } }));
      }}
    >
      <span className="ravine-hero-video-audio-icon" aria-hidden="true">
        {muted ? (
          <svg viewBox="0 0 24 24"><path d="M4 10h4l5-4v12l-5-4H4z"/><path d="m17 9 4 6M21 9l-4 6"/></svg>
        ) : (
          <svg viewBox="0 0 24 24"><path d="M4 10h4l5-4v12l-5-4H4z"/><path d="M17 9a4.5 4.5 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11"/></svg>
        )}
      </span>
    </button>
  );
}
