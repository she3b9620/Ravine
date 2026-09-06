"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type VideoAudioToggleProps = {
  locale: "ar" | "en";
};

type VideoControlAction =
  | "play"
  | "pause"
  | "next"
  | "previous"
  | "toggle-audio"
  | "set-volume"
  | "toggle-repeat"
  | "seek"
  | "replay";

function sendControl(
  action: VideoControlAction,
  detail: {
    muted?: boolean;
    volume?: number;
    repeat?: boolean;
    time?: number;
  } = {}
) {
  window.dispatchEvent(
    new CustomEvent("ravine-video-control", {
      detail: { action, ...detail },
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

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h10l-2.5-2.5M17 17H7l2.5 2.5" />
      <path d="M17 7a5 5 0 0 1 2 4M7 17a5 5 0 0 1-2-4" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 9.5A8 8 0 1 1 6.7 17" />
      <path d="M4.5 9.5V5.5M4.5 9.5H8.5" />
    </svg>
  );
}

function ControlMenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="11" cy="17" r="1.5" />
    </svg>
  );
}

export default function VideoAudioToggle({
  locale,
}: VideoAudioToggleProps) {
  const pathname = usePathname();

  const [visible, setVisible] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolume] = useState(60);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const volumeCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openVolume = () => {
    if (volumeCloseTimerRef.current) {
      clearTimeout(volumeCloseTimerRef.current);
      volumeCloseTimerRef.current = null;
    }
    setVolumeOpen(true);
  };

  const scheduleVolumeClose = () => {
    if (volumeCloseTimerRef.current) {
      clearTimeout(volumeCloseTimerRef.current);
    }

    volumeCloseTimerRef.current = setTimeout(() => {
      setVolumeOpen(false);
      volumeCloseTimerRef.current = null;
    }, 480);
  };

  useEffect(() => {
    return () => {
      if (volumeCloseTimerRef.current) {
        clearTimeout(volumeCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pathname !== `/${locale}`) {
      setVisible(false);
      setControlsOpen(false);
      setVolumeOpen(false);
      return;
    }

    setVisible(Boolean(document.querySelector(".guest-shell")));
  }, [locale, pathname]);

  useEffect(() => {
    const syncAudioState = (event: Event) => {
      const detail = (event as CustomEvent<{
        muted?: boolean;
        volume?: number;
      }>).detail;

      if (typeof detail?.muted === "boolean") {
        setMuted(detail.muted);
      }

      if (typeof detail?.volume === "number") {
        setVolume(detail.volume);
      }
    };

    const syncPlaybackState = (event: Event) => {
      const detail = (event as CustomEvent<{
        playing?: boolean;
        currentTime?: number;
        duration?: number;
      }>).detail;

      if (typeof detail?.playing === "boolean") {
        setPlaying(detail.playing);
      }

      if (typeof detail?.currentTime === "number") {
        setCurrentTime(detail.currentTime);
      }

      if (typeof detail?.duration === "number") {
        setDuration(detail.duration);
      }
    };

    const syncTimelineState = (event: Event) => {
      const detail = (event as CustomEvent<{
        currentTime?: number;
        duration?: number;
      }>).detail;

      if (typeof detail?.currentTime === "number") {
        setCurrentTime(detail.currentTime);
      }

      if (typeof detail?.duration === "number") {
        setDuration(detail.duration);
      }
    };

    const syncRepeatState = (event: Event) => {
      const detail = (event as CustomEvent<{
        repeat?: boolean;
      }>).detail;

      if (typeof detail?.repeat === "boolean") {
        setRepeat(detail.repeat);
      }
    };

    window.addEventListener(
      "ravine-video-audio-state",
      syncAudioState
    );

    window.addEventListener(
      "ravine-video-playback-state",
      syncPlaybackState
    );

    window.addEventListener(
      "ravine-video-timeline-state",
      syncTimelineState
    );

    window.addEventListener(
      "ravine-video-repeat-state",
      syncRepeatState
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

      window.removeEventListener(
        "ravine-video-timeline-state",
        syncTimelineState
      );

      window.removeEventListener(
        "ravine-video-repeat-state",
        syncRepeatState
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

  const repeatLabel = repeat
    ? locale === "ar"
      ? "إيقاف إعادة الفيديو"
      : "Turn repeat off"
    : locale === "ar"
      ? "إعادة الفيديو الحالي"
      : "Repeat current video";

  const replayLabel =
    locale === "ar" ? "إعادة الفيديو من البداية" : "Replay video";

  const toggleLabel = controlsOpen
    ? locale === "ar"
      ? "إخفاء تحكم الفيديو"
      : "Hide video controls"
    : locale === "ar"
      ? "إظهار تحكم الفيديو"
      : "Show video controls";

  const progress =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0;

  return (
    <div
      className={`ravine-home-video-control-shell ${
        locale === "ar" ? "is-rtl" : "is-ltr"
      } ${controlsOpen ? "is-open" : ""}`}
      dir="ltr"
    >
      <button
        type="button"
        className="ravine-home-video-control-toggle"
        aria-label={toggleLabel}
        aria-expanded={controlsOpen}
        onClick={() => setControlsOpen((open) => !open)}
      >
        <ControlMenuIcon />
      </button>

      <div className="ravine-hero-video-controls-panel">
        <div
          className={`ravine-hero-video-controls ${
            locale === "ar" ? "is-rtl" : "is-ltr"
          }`}
          aria-label={
            locale === "ar" ? "تحكم الفيديو" : "Video controls"
          }
        >
          <div className="ravine-video-controls-row">
            <button
              type="button"
              className="ravine-video-control ravine-video-control-prev"
              aria-label={previousLabel}
              onClick={() =>
                sendControl("previous", { muted, volume })
              }
            >
              <span
                className="ravine-video-control-icon"
                aria-hidden="true"
              >
                <PreviousIcon />
              </span>
            </button>

            <button
              type="button"
              className="ravine-video-control ravine-video-control-play"
              aria-label={playbackLabel}
              aria-pressed={!playing}
              onClick={() =>
                sendControl(playing ? "pause" : "play", {
                  muted,
                  volume,
                })
              }
            >
              <span
                className="ravine-video-control-icon"
                aria-hidden="true"
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </span>
            </button>

            <button
              type="button"
              className="ravine-video-control ravine-video-control-repeat"
              aria-label={repeatLabel}
              aria-pressed={repeat}
              onClick={() => {
                const nextRepeat = !repeat;
                setRepeat(nextRepeat);

                sendControl("toggle-repeat", {
                  muted,
                  volume,
                  repeat: nextRepeat,
                });
              }}
            >
              <span
                className="ravine-video-control-icon"
                aria-hidden="true"
              >
                <RepeatIcon />
              </span>
            </button>

            <div
              className={`ravine-video-audio-wrap ${volumeOpen ? "volume-open" : ""}`}
              onMouseEnter={openVolume}
              onMouseLeave={scheduleVolumeClose}
              onFocus={openVolume}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  scheduleVolumeClose();
                }
              }}
            >
              <button
                type="button"
                className="ravine-video-control ravine-hero-video-audio-toggle"
                aria-label={audioLabel}
                aria-pressed={!muted}
                onClick={() => {
                  openVolume();
                  const nextMuted = !muted;
                  setMuted(nextMuted);

                  sendControl("toggle-audio", {
                    muted: nextMuted,
                    volume,
                  });
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

              <div className="ravine-video-volume-popover">
                <label>
                  <span className="ravine-sr-only">
                    {locale === "ar" ? "مستوى الصوت" : "Volume"}
                  </span>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={volume}
                    aria-label={
                      locale === "ar" ? "مستوى الصوت" : "Volume"
                    }
                    onChange={(event) => {
                      const nextVolume = Number(event.target.value);

                      setVolume(nextVolume);

                      sendControl("set-volume", {
                        volume: nextVolume,
                        muted: nextVolume === 0,
                      });

                      if (nextVolume > 0) {
                        setMuted(false);
                      } else {
                        setMuted(true);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              className="ravine-video-control ravine-video-control-replay"
              aria-label={replayLabel}
              onClick={() =>
                sendControl("replay", {
                  muted,
                  volume,
                })
              }
            >
              <span
                className="ravine-video-control-icon"
                aria-hidden="true"
              >
                <ReplayIcon />
              </span>
            </button>

            <button
              type="button"
              className="ravine-video-control ravine-video-control-next"
              aria-label={nextLabel}
              onClick={() =>
                sendControl("next", {
                  muted,
                  volume,
                })
              }
            >
              <span
                className="ravine-video-control-icon"
                aria-hidden="true"
              >
                <NextIcon />
              </span>
            </button>
          </div>

          <div className="ravine-home-video-timeline">
            <input
              type="range"
              min="0"
              max={duration || 1}
              step="0.1"
              value={Math.min(currentTime, duration || 1)}
              aria-label={
                locale === "ar"
                  ? "التحكم في وقت الفيديو"
                  : "Video timeline"
              }
              style={
                {
                  "--ravine-video-progress": `${progress}%`,
                } as React.CSSProperties
              }
              onChange={(event) => {
                const nextTime = Number(event.target.value);

                setCurrentTime(nextTime);

                sendControl("seek", {
                  time: nextTime,
                  muted,
                  volume,
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
