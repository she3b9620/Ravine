"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type VideoAudioToggleProps = {
  locale: "ar" | "en";
};

function sendControl(
  action: "play" | "pause" | "next" | "previous" | "toggle-audio",
  muted?: boolean
) {
  window.dispatchEvent(
    new CustomEvent("ravine-video-control", {
      detail: { action, muted },
    })
  );
}

function PreviousIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5v14" />
      <path d="M18 6 10 12l8 6Z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 5v14" />
      <path d="m6 6 8 6-8 6Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="8,5 19,12 8,19" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="5" width="3.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
    </svg>
  );
}

export default function VideoAudioToggle({
  locale,
}: VideoAudioToggleProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (pathname !== `/${locale}`) {
      setVisible(false);
      return;
    }

    setVisible(Boolean(document.querySelector(".guest-shell")));
  }, [locale, pathname]);

  useEffect(() => {
    const syncAudioState = (event: Event) => {
      const customEvent = event as CustomEvent<{ muted?: boolean }>;

      if (typeof customEvent.detail?.muted === "boolean") {
        setMuted(customEvent.detail.muted);
      }
    };

    const syncPlaybackState = (event: Event) => {
      const customEvent = event as CustomEvent<{ playing?: boolean }>;

      if (typeof customEvent.detail?.playing === "boolean") {
        setPlaying(customEvent.detail.playing);
      }
    };

    window.addEventListener("ravine-video-audio-state", syncAudioState);
    window.addEventListener(
      "ravine-video-playback-state",
      syncPlaybackState
    );

    return () => {
      window.removeEventListener(
        "ravine-video-audio-state",
        syncAudioState
      );
      window.removeEventListener(
        "ravine-video-playback-state",
        syncPlaybackState
      );
    };
  }, []);

  if (!visible) return null;

  const audioLabel = muted
    ? locale === "ar"
      ? "تشغيل صوت الفيديو"
      : "Turn video sound on"
    : locale === "ar"
      ? "كتم صوت الفيديو"
      : "Mute video sound";

  const playbackLabel = playing
    ? locale === "ar"
      ? "إيقاف الفيديو"
      : "Pause video"
    : locale === "ar"
      ? "تشغيل الفيديو"
      : "Play video";

  const previousLabel =
    locale === "ar" ? "الفيديو السابق" : "Previous video";

  const nextLabel =
    locale === "ar" ? "الفيديو التالي" : "Next video";

  return (
    <div
      className={`ravine-hero-video-controls ${
        locale === "ar" ? "is-rtl" : "is-ltr"
      }`}
      dir="ltr"
      aria-label={locale === "ar" ? "تحكم الفيديو" : "Video controls"}
    >
      <button
        type="button"
        className="ravine-video-control ravine-video-control-prev"
        aria-label={previousLabel}
        onClick={() => sendControl("previous", muted)}
      >
        <span className="ravine-video-control-icon" aria-hidden="true">
          <PreviousIcon />
        </span>
      </button>

      <button
        type="button"
        className="ravine-video-control ravine-video-control-play"
        aria-label={playbackLabel}
        aria-pressed={!playing}
        onClick={() =>
          sendControl(playing ? "pause" : "play", muted)
        }
      >
        <span className="ravine-video-control-icon" aria-hidden="true">
          {playing ? <PauseIcon /> : <PlayIcon />}
        </span>
      </button>

      <button
        type="button"
        className="ravine-video-control ravine-hero-video-audio-toggle"
        aria-label={audioLabel}
        aria-pressed={!muted}
        onClick={() => {
          const nextMuted = !muted;
          setMuted(nextMuted);
          sendControl("toggle-audio", nextMuted);
        }}
      >
        <span
          className="ravine-hero-video-audio-icon"
          aria-hidden="true"
        >
          {muted ? (
            <svg viewBox="0 0 24 24">
              <path d="M4 10h4l5-4v12l-5-4H4z" />
              <path d="m17 9 4 6M21 9l-4 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24">
              <path d="M4 10h4l5-4v12l-5-4H4z" />
              <path d="M17 9a4.5 4.5 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11" />
            </svg>
          )}
        </span>
      </button>

      <button
        type="button"
        className="ravine-video-control ravine-video-control-next"
        aria-label={nextLabel}
        onClick={() => sendControl("next", muted)}
      >
        <span className="ravine-video-control-icon" aria-hidden="true">
          <NextIcon />
        </span>
      </button>
    </div>
  );
}