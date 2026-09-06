import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

export type VideoControlAction =
  | "play"
  | "pause"
  | "next"
  | "previous"
  | "toggle-audio"
  | "set-volume"
  | "toggle-repeat"
  | "seek"
  | "replay";

type VideoControlDetail = {
  action: VideoControlAction;
  muted?: boolean;
  volume?: number;
  time?: number;
};

type VideoStateDetail = {
  muted?: boolean;
  volume?: number;
};

type PlaybackStateDetail = {
  playing?: boolean;
};

type TimelineStateDetail = {
  currentTime?: number;
  duration?: number;
};

type RepeatStateDetail = {
  repeat?: boolean;
};

type Props = {
  locale: "ar" | "en";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function VideoAudioToggle({ locale }: Props) {
  const [visible, setVisible] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolume] = useState(60);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const handleAudioState = (event: Event) => {
      const detail = (event as CustomEvent<VideoStateDetail>).detail;
      if (typeof detail?.muted === "boolean") setMuted(detail.muted);
      if (typeof detail?.volume === "number") setVolume(detail.volume);
    };

    const handlePlaybackState = (event: Event) => {
      const detail = (event as CustomEvent<PlaybackStateDetail>).detail;
      if (typeof detail?.playing === "boolean") setPlaying(detail.playing);
    };

    const handleTimelineState = (event: Event) => {
      const detail = (event as CustomEvent<TimelineStateDetail>).detail;
      if (typeof detail?.currentTime === "number") setCurrentTime(detail.currentTime);
      if (typeof detail?.duration === "number") setDuration(detail.duration);
    };

    const handleRepeatState = (event: Event) => {
      const detail = (event as CustomEvent<RepeatStateDetail>).detail;
      if (typeof detail?.repeat === "boolean") setRepeat(detail.repeat);
    };

    window.addEventListener("ravine-video-audio-state", handleAudioState);
    window.addEventListener("ravine-video-playback-state", handlePlaybackState);
    window.addEventListener("ravine-video-timeline-state", handleTimelineState);
    window.addEventListener("ravine-video-repeat-state", handleRepeatState);

    return () => {
      window.removeEventListener("ravine-video-audio-state", handleAudioState);
      window.removeEventListener("ravine-video-playback-state", handlePlaybackState);
      window.removeEventListener("ravine-video-timeline-state", handleTimelineState);
      window.removeEventListener("ravine-video-repeat-state", handleRepeatState);
    };
  }, []);

  const sendControl = (action: VideoControlAction, extra: Omit<VideoControlDetail, "action"> = {}) => {
    window.dispatchEvent(
      new CustomEvent<VideoControlDetail>("ravine-video-control", {
        detail: {
          action,
          ...extra,
        },
      }),
    );
  };

  const progress = useMemo(() => {
    if (!duration) return 0;
    return clamp((currentTime / duration) * 100, 0, 100);
  }, [currentTime, duration]);

  const handleTimelineKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!duration) return;

    let nextTime: number | null = null;

    switch (event.key) {
      case "ArrowRight":
        nextTime = currentTime + 5;
        break;
      case "ArrowLeft":
        nextTime = currentTime - 5;
        break;
      case "Home":
        nextTime = 0;
        break;
      case "End":
        nextTime = duration;
        break;
      default:
        return;
    }

    event.preventDefault();

    const clampedTime = clamp(nextTime, 0, duration);
    setCurrentTime(clampedTime);
    sendControl("seek", {
      time: clampedTime,
      muted,
      volume,
    });
  };

  return (
    <div className="ravine-video-audio-toggle" data-locale={locale}>
      <button
        type="button"
        aria-label={
          locale === "ar" ? "إظهار أدوات الفيديو" : "Show video controls"
        }
        onClick={() => {
          setVisible((value) => !value);
          setControlsOpen((value) => !value);
        }}
      >
        {locale === "ar" ? "فيديو" : "Video"}
      </button>

      {visible && (
        <div className="ravine-video-controls" data-open={controlsOpen ? "true" : "false"}>
          <div className="ravine-video-controls__buttons">
            <button type="button" onClick={() => sendControl("previous")} aria-label={locale === "ar" ? "السابق" : "Previous"}>
              ‹
            </button>
            <button
              type="button"
              onClick={() => sendControl(playing ? "pause" : "play")}
              aria-label={playing ? (locale === "ar" ? "إيقاف" : "Pause") : locale === "ar" ? "تشغيل" : "Play"}
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <button type="button" onClick={() => sendControl("toggle-repeat")} aria-label={locale === "ar" ? "تكرار" : "Repeat"} aria-pressed={repeat}>
              ↻
            </button>
            <button
              type="button"
              onClick={() => sendControl("toggle-audio", { muted: !muted, volume })}
              aria-label={muted ? (locale === "ar" ? "تشغيل الصوت" : "Unmute") : locale === "ar" ? "كتم الصوت" : "Mute"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button type="button" onClick={() => sendControl("replay")} aria-label={locale === "ar" ? "إعادة" : "Replay"}>
              ↺
            </button>
            <button type="button" onClick={() => sendControl("next")} aria-label={locale === "ar" ? "التالي" : "Next"}>
              ›
            </button>

            <button
              type="button"
              onClick={() => setVolumeOpen((value) => !value)}
              aria-expanded={volumeOpen}
              aria-label={locale === "ar" ? "مستوى الصوت" : "Volume"}
            >
              {Math.round(volume)}%
            </button>

            {volumeOpen && (
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={volume}
                aria-label={locale === "ar" ? "مستوى الصوت" : "Volume"}
                onChange={(event) => {
                  const nextVolume = Number(event.target.value);
                  setVolume(nextVolume);
                  sendControl("set-volume", {
                    volume: nextVolume,
                    muted,
                  });
                }}
              />
            )}
          </div>

          <div className="ravine-video-timeline" dir="ltr">
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
              aria-keyshortcuts="ArrowLeft ArrowRight Home End"
              style={{
                "--ravine-video-progress": `${progress}%`,
              } as CSSProperties}
              onChange={(event) => {
                const nextTime = Number(event.target.value);
                setCurrentTime(nextTime);
                sendControl("seek", {
                  time: nextTime,
                  muted,
                  volume,
                });
              }}
              onKeyDown={handleTimelineKeyDown}
            />
          </div>
        </div>
      )}
    </div>
  );
}
