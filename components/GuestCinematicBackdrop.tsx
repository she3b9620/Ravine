"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GuestCinematicBackdropProps = {
  locale: "ar" | "en";
};

type YouTubePlayer = {
  destroy: () => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  mute?: () => void;
  unMute?: () => void;
  setVolume?: (volume: number) => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  seekTo?: (
    seconds: number,
    allowSeekAhead?: boolean
  ) => void;
  loadVideoById?: (videoId: string) => void;
};

type YouTubeApi = {
  Player: new (
    element: string,
    options: {
      videoId: string;
      playerVars: {
        autoplay: number;
        mute: number;
        controls: number;
        loop: number;
        playsinline: number;
        modestbranding: number;
        rel: number;
        iv_load_policy: number;
        disablekb: number;
        fs: number;
        origin: string;
      };
      events: {
        onReady?: () => void;
        onStateChange: (event: { data: number }) => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState?: {
    PLAYING?: number;
    PAUSED?: number;
    BUFFERING?: number;
    ENDED?: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const VIDEO_IDS = [
  "RLKQ-cHohFc",
  "O2zRehtoU1w",
  "DBjjCRSXdGQ",
  "Aoyx39cAjgc",
  "NTwlc9Oa9BQ",
  "vgdPiCr0TnQ",
] as const;

const YOUTUBE_API_SRC = "https://www.youtube.com/iframe_api";
const PLAYER_ID = "ravine-guest-cinematic-player";
const DEFAULT_VOLUME = 60;
const VIDEO_SHUFFLE_STORAGE_KEY = "ravine:guest-hero-video-shuffle:v1";

type VideoShuffleState = {
  remaining: number[];
  last: number | null;
};

function secureRandomInt(maxExclusive: number) {
  if (maxExclusive <= 1) return 0;

  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

function createVideoPool(length: number) {
  return Array.from({ length }, (_, index) => index);
}

function isValidVideoIndex(value: unknown, length: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < length
  );
}

function readVideoShuffleState(length: number): VideoShuffleState {
  const fallback: VideoShuffleState = {
    remaining: createVideoPool(length),
    last: null,
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(VIDEO_SHUFFLE_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<VideoShuffleState> | null;
    if (!parsed || !Array.isArray(parsed.remaining)) return fallback;

    const remaining = parsed.remaining.filter((value): value is number =>
      isValidVideoIndex(value, length)
    );

    const last = isValidVideoIndex(parsed.last, length)
      ? parsed.last
      : null;

    const uniqueRemaining = [...new Set(remaining)];
    if (!uniqueRemaining.length && last === null) return fallback;

    return {
      remaining: uniqueRemaining,
      last,
    };
  } catch {
    return fallback;
  }
}

function persistVideoShuffleState(state: VideoShuffleState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      VIDEO_SHUFFLE_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage restrictions and keep runtime randomness working.
  }
}

function randomVideoIndex(length: number) {
  if (length <= 1) return 0;

  const state = readVideoShuffleState(length);
  let pool = state.remaining.length
    ? state.remaining
    : createVideoPool(length);

  if (pool.length > 1 && state.last !== null) {
    const withoutLast = pool.filter((index) => index !== state.last);
    if (withoutLast.length) {
      pool = withoutLast;
    }
  }

  const selected = pool[secureRandomInt(pool.length)];
  const nextRemaining = pool.filter((index) => index !== selected);

  persistVideoShuffleState({
    remaining: nextRemaining,
    last: selected,
  });

  return selected;
}

type VideoControlEvent = CustomEvent<{
  action:
    | "play"
    | "pause"
    | "next"
    | "previous"
    | "toggle-audio"
    | "set-volume"
    | "toggle-repeat"
    | "seek"
    | "replay";
  muted?: boolean;
  volume?: number;
  repeat?: boolean;
  time?: number;
}>;

export default function GuestCinematicBackdrop({
  locale,
}: GuestCinematicBackdropProps) {
  const pathname = usePathname();
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerGenerationRef = useRef(0);

  const [isGuestHome, setIsGuestHome] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startIndex, setStartIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (pathname !== `/${locale}`) {
      setIsGuestHome(false);
      setIsPlaying(false);
      setStartIndex(null);
      return;
    }

    setStartIndex(randomVideoIndex(VIDEO_IDS.length));

    let mounted = true;
    const supabase = createClient();

    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        setIsGuestHome(!data.user);
      })
      .catch(() => {
        if (mounted) setIsGuestHome(false);
      });

    return () => {
      mounted = false;
    };
  }, [locale, pathname]);

  useEffect(() => {
    if (!isGuestHome || startIndex === null) {
      return;
    }

    const generation = ++playerGenerationRef.current;
    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let previousReadyHandler: (() => void) | undefined;

    let currentIndex = startIndex;
    let userPaused = false;
    let repeatEnabled = false;
    let volume = DEFAULT_VOLUME;
    let muted = true;

    const isCurrentEffect = () =>
      !cancelled && playerGenerationRef.current === generation;

    const dispatchPlaybackState = (playing: boolean) => {
      if (!isCurrentEffect()) return;

      setIsPlaying(playing);

      window.dispatchEvent(
        new CustomEvent("ravine-video-playback-state", {
          detail: {
            playing,
            currentTime: player?.getCurrentTime?.() ?? 0,
            duration: player?.getDuration?.() ?? 0,
          },
        })
      );
    };

    const dispatchTimelineState = () => {
      if (!isCurrentEffect()) return;

      window.dispatchEvent(
        new CustomEvent("ravine-video-timeline-state", {
          detail: {
            currentTime: player?.getCurrentTime?.() ?? 0,
            duration: player?.getDuration?.() ?? 0,
          },
        })
      );
    };

    const dispatchAudioState = () => {
      if (!isCurrentEffect()) return;

      window.dispatchEvent(
        new CustomEvent("ravine-video-audio-state", {
          detail: {
            muted,
            volume,
          },
        })
      );
    };

    const dispatchRepeatState = () => {
      if (!isCurrentEffect()) return;

      window.dispatchEvent(
        new CustomEvent("ravine-video-repeat-state", {
          detail: {
            repeat: repeatEnabled,
          },
        })
      );
    };

    const applyAudioState = (
      nextMuted = muted,
      nextVolume = volume
    ) => {
      if (!isCurrentEffect()) return;

      muted = nextMuted;
      volume = Math.min(100, Math.max(0, nextVolume));

      player?.setVolume?.(volume);

      if (muted) {
        player?.mute?.();
      } else {
        player?.unMute?.();
        player?.setVolume?.(volume);
      }

      dispatchAudioState();
    };

    const loadCurrentVideo = () => {
      if (!isCurrentEffect()) return;

      player?.loadVideoById?.(VIDEO_IDS[currentIndex]);

      window.setTimeout(() => {
        if (!isCurrentEffect()) return;

        applyAudioState(muted, volume);
        dispatchTimelineState();

        if (!userPaused) {
          player?.playVideo?.();
        }
      }, 250);
    };

    const goNext = () => {
      if (!isCurrentEffect()) return;

      currentIndex =
        (currentIndex + 1) % VIDEO_IDS.length;

      loadCurrentVideo();
    };

    const goPrevious = () => {
      if (!isCurrentEffect()) return;

      currentIndex =
        (currentIndex - 1 + VIDEO_IDS.length) %
        VIDEO_IDS.length;

      loadCurrentVideo();
    };

    const resumePlayback = () => {
      if (!isCurrentEffect() || userPaused) return;
      player?.playVideo?.();
    };

    const handleStateChange = (event: { data: number }) => {
      if (!isCurrentEffect()) return;

      const playingState =
        window.YT?.PlayerState?.PLAYING ?? 1;

      const pausedState =
        window.YT?.PlayerState?.PAUSED ?? 2;

      const endedState =
        window.YT?.PlayerState?.ENDED ?? 0;

      dispatchTimelineState();

      if (event.data === playingState) {
        dispatchPlaybackState(true);
        return;
      }

      if (event.data === pausedState) {
        dispatchPlaybackState(false);
        return;
      }

      if (event.data === endedState) {
        dispatchPlaybackState(false);

        if (repeatEnabled) {
          player?.seekTo?.(0, true);
          player?.playVideo?.();
        } else {
          goNext();
        }
      }
    };

    const handleControl = (event: Event) => {
      if (!isCurrentEffect() || !player) return;

      const detail = (event as VideoControlEvent).detail;
      const action = detail?.action;

      if (!action) return;

      if (action === "play") {
        userPaused = false;
        player.playVideo?.();
        return;
      }

      if (action === "pause") {
        userPaused = true;
        player.pauseVideo?.();
        return;
      }

      if (action === "toggle-audio") {
        applyAudioState(
          detail.muted ?? !muted,
          typeof detail.volume === "number"
            ? detail.volume
            : volume
        );
        return;
      }

      if (action === "set-volume") {
        volume = Math.min(
          100,
          Math.max(
            0,
            typeof detail.volume === "number"
              ? detail.volume
              : volume
          )
        );

        muted =
          detail.muted ??
          volume === 0;

        player.setVolume?.(volume);

        if (muted) {
          player.mute?.();
        } else {
          player.unMute?.();
          player.setVolume?.(volume);
        }

        dispatchAudioState();
        return;
      }

      if (action === "toggle-repeat") {
        repeatEnabled =
          detail.repeat ?? !repeatEnabled;

        dispatchRepeatState();
        return;
      }

      if (action === "seek") {
        const nextTime =
          typeof detail.time === "number"
            ? detail.time
            : 0;

        player.seekTo?.(
          Math.max(0, nextTime),
          true
        );

        dispatchTimelineState();
        return;
      }

      if (action === "replay") {
        userPaused = false;

        player.seekTo?.(0, true);
        player.playVideo?.();

        dispatchPlaybackState(true);
        dispatchTimelineState();
        return;
      }

      if (action === "next") {
        goNext();
        return;
      }

      if (action === "previous") {
        goPrevious();
      }
    };

    const createPlayer = () => {
      if (!isCurrentEffect() || !window.YT?.Player) {
        return;
      }

      if (playerRef.current) {
        return;
      }

      const container = document.getElementById(PLAYER_ID);
      if (!container) return;

      if (container.querySelector("iframe")) {
        return;
      }

      player = new window.YT.Player(
        PLAYER_ID,
        {
          videoId: VIDEO_IDS[startIndex],
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            loop: 0,
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            origin:
              typeof window !== "undefined"
                ? window.location.origin
                : "",
          },
          events: {
            onReady: () => {
              if (!isCurrentEffect()) return;

              muted = true;
              volume = DEFAULT_VOLUME;

              playerRef.current = player;
              player?.setVolume?.(volume);
              player?.mute?.();

              dispatchAudioState();
              dispatchRepeatState();
              dispatchTimelineState();

              if (!userPaused) {
                player?.playVideo?.();
              }
            },

            onStateChange: handleStateChange,
          },
        }
      );

      playerRef.current = player;
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      previousReadyHandler =
        window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousReadyHandler?.();
        createPlayer();
      };

      if (
        !document.querySelector(
          `script[src="${YOUTUBE_API_SRC}"]`
        )
      ) {
        const script =
          document.createElement("script");

        script.src = YOUTUBE_API_SRC;
        script.async = true;

        document.head.appendChild(script);
      }
    }

    window.addEventListener(
      "ravine-video-control",
      handleControl as EventListener
    );

    const timelineTimer =
      window.setInterval(() => {
        if (isCurrentEffect() && player) {
          dispatchTimelineState();
        }
      }, 250);

    document.addEventListener(
      "visibilitychange",
      resumePlayback
    );

    window.addEventListener(
      "focus",
      resumePlayback
    );

    window.addEventListener(
      "pageshow",
      resumePlayback
    );

    return () => {
      cancelled = true;

      window.removeEventListener(
        "ravine-video-control",
        handleControl as EventListener
      );

      window.clearInterval(
        timelineTimer
      );

      document.removeEventListener(
        "visibilitychange",
        resumePlayback
      );

      window.removeEventListener(
        "focus",
        resumePlayback
      );

      window.removeEventListener(
        "pageshow",
        resumePlayback
      );

      if (
        window.onYouTubeIframeAPIReady ===
          previousReadyHandler ||
        previousReadyHandler === undefined
      ) {
        window.onYouTubeIframeAPIReady =
          previousReadyHandler;
      }

      if (playerRef.current === player) {
        playerRef.current = null;
      }

      player?.destroy();
      player = null;

      const container = document.getElementById(PLAYER_ID);
      container?.replaceChildren();

      if (playerGenerationRef.current === generation) {
        setIsPlaying(false);
      }
    };
  }, [
    isGuestHome,
    startIndex,
  ]);

  if (!isGuestHome || startIndex === null) {
    return null;
  }

  return (
    <div
      className={`ravine-guest-cinematic-backdrop${
        isPlaying ? " is-playing" : ""
      }`}
      aria-hidden="true"
    >
      <div
        id={PLAYER_ID}
        className="ravine-guest-cinematic-player"
      />

      <div className="ravine-guest-cinematic-wash" />
      <div className="ravine-guest-cinematic-vignette" />
    </div>
  );
}
