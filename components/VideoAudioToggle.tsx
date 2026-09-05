"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type VideoControlsProps = {
  locale: "ar" | "en";
};

type PlayerCommand =
  | "play"
  | "pause"
  | "next"
  | "previous";

function sendPlayerCommand(command: PlayerCommand) {
  window.dispatchEvent(
    new CustomEvent("ravine-video-playback-command", {
      detail: { command },
    })
  );
}

function sendAudioCommand(command: "mute" | "unMute") {
  const iframe = document.getElementById(
    "ravine-guest-cinematic-player"
  ) as HTMLIFrameElement | null;

  if (!iframe?.contentWindow) return;

  iframe.contentWindow.postMessage(
    JSON.stringify({
      event: "command",
      func: command,
      args: [],
    }),
    "https://www.youtube-nocookie.com"
  );
}

function dispatchUserPaused(paused: boolean) {
  window.dispatchEvent(
    new CustomEvent(
      "ravine-video-user-playback-state",
      {
        detail: { paused },
      }
    )
  );
}

export default function VideoAudioToggle({
  locale,
}: VideoControlsProps) {
  const pathname = usePathname();

  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (pathname !== `/${locale}`) {
      setVisible(false);
      return;
    }

    setVisible(
      Boolean(document.querySelector(".guest-shell"))
    );
  }, [locale, pathname]);

  useEffect(() => {
    const syncPlaybackState = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ playing?: boolean }>;

      if (
        typeof customEvent.detail?.playing ===
        "boolean"
      ) {
        setPlaying(customEvent.detail.playing);
      }
    };

    window.addEventListener(
      "ravine-video-playback-state",
      syncPlaybackState
    );

    return () => {
      window.removeEventListener(
        "ravine-video-playback-state",
        syncPlaybackState
      );
    };
  }, []);

  useEffect(() => {
    const syncAudioState = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ muted?: boolean }>;

      if (
        typeof customEvent.detail?.muted === "boolean"
      ) {
        setMuted(customEvent.detail.muted);
      }
    };

    window.addEventListener(
      "ravine-video-audio-state",
      syncAudioState
    );

    return () => {
      window.removeEventListener(
        "ravine-video-audio-state",
        syncAudioState
      );
    };
  }, []);

  if (!visible) return null;

  const labels =
    locale === "ar"
      ? {
          previous: "الفيديو السابق",
          play: "تشغيل الفيديو",
          pause: "إيقاف الفيديو",
          next: "الفيديو التالي",
          soundOn: "تشغيل صوت الفيديو",
          soundOff: "كتم صوت الفيديو",
        }
      : {
          previous: "Previous video",
          play: "Play video",
          pause: "Pause video",
          next: "Next video",
          soundOn: "Turn video sound on",
          soundOff: "Mute video sound",
        };

  return (
    <div
      className="ravine-hero-video-controls"
      aria-label={
        locale === "ar"
          ? "التحكم في فيديو الخلفية"
          : "Background video controls"
      }
    >
      <button
        type="button"
        className="ravine-hero-video-control"
        aria-label={labels.previous}
        onClick={() => {
          dispatchUserPaused(false);
          setPlaying(true);
          sendPlayerCommand("previous");
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 5v14" />
          <path d="m18 7-8 5 8 5z" />
        </svg>
      </button>

      <button
        type="button"
        className="ravine-hero-video-control"
        aria-label={
          playing ? labels.pause : labels.play
        }
        aria-pressed={playing}
        onClick={() => {
          const nextPlaying = !playing;

          setPlaying(nextPlaying);
          dispatchUserPaused(!nextPlaying);

          sendPlayerCommand(
            nextPlaying ? "play" : "pause"
          );
        }}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14" />
            <path d="M16 5v14" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 6 10 6-10 6z" />
          </svg>
        )}
      </button>

      <button
        type="button"
        className="ravine-hero-video-control"
        aria-label={muted ? labels.soundOn : labels.soundOff}
        aria-pressed={!muted}
        onClick={() => {
          const nextMuted = !muted;

          setMuted(nextMuted);

          sendAudioCommand(
            nextMuted ? "mute" : "unMute"
          );

          window.dispatchEvent(
            new CustomEvent(
              "ravine-video-audio-toggle",
              {
                detail: { muted: nextMuted },
              }
            )
          );
        }}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="ravine-hero-video-audio-svg"
        >
          <path d="M4 10h4l5-4v12l-5-4H4z" />

          {muted ? (
            <>
              <path d="m17 9 4 6" />
              <path d="m21 9-4 6" />
            </>
          ) : (
            <>
              <path d="M17 9a4.5 4.5 0 0 1 0 6" />
              <path d="M19.5 6.5a8 8 0 0 1 0 11" />
            </>
          )}
        </svg>
      </button>

      <button
        type="button"
        className="ravine-hero-video-control"
        aria-label={labels.next}
        onClick={() => {
          dispatchUserPaused(false);
          setPlaying(true);
          sendPlayerCommand("next");
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 5v14" />
          <path d="m6 7 8 5-8 5z" />
        </svg>
      </button>
    </div>
  );
}