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
  nextVideo?: () => void;
  previousVideo?: () => void;
};

type YouTubeApi = {
  Player: new (
    element: string,
    options: {
      events: {
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

function randomVideoIndex(length: number) {
  if (length <= 1) return 0;

  if (
    typeof window === "undefined" ||
    !window.crypto?.getRandomValues
  ) {
    return Math.floor(Math.random() * length);
  }

  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % length;
}

export default function GuestCinematicBackdrop({
  locale,
}: GuestCinematicBackdropProps) {
  const pathname = usePathname();
  const [isGuestHome, setIsGuestHome] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startIndex, setStartIndex] = useState<number | null>(null);

  const userPausedRef = useRef(false);

  const embedUrl = (() => {
    if (startIndex === null) return null;

    const orderedIds = [
      ...VIDEO_IDS.slice(startIndex),
      ...VIDEO_IDS.slice(0, startIndex),
    ];

    const [first, ...playlistIds] = orderedIds;

    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "0",
      loop: "1",
      playlist: playlistIds.concat(first).join(","),
      playsinline: "1",
      modestbranding: "1",
      rel: "0",
      iv_load_policy: "3",
      disablekb: "1",
      fs: "0",
      enablejsapi: "1",
      origin:
        typeof window !== "undefined"
          ? window.location.origin
          : "",
    });

    return `https://www.youtube-nocookie.com/embed/${first}?${params.toString()}`;
  })();

  useEffect(() => {
    if (pathname !== `/${locale}`) {
      setIsGuestHome(false);
      setIsPlaying(false);
      setStartIndex(null);
      userPausedRef.current = false;
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
    if (!isGuestHome || !embedUrl) return;

    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let previousReadyHandler: (() => void) | undefined;

    const syncPlaybackEvent = (playing: boolean) => {
      window.dispatchEvent(
        new CustomEvent("ravine-video-playback-state", {
          detail: { playing },
        })
      );
    };

    const resumePlayback = () => {
      if (cancelled || userPausedRef.current) return;
      player?.playVideo?.();

      window.setTimeout(() => {
        if (!cancelled && !userPausedRef.current) {
          player?.playVideo?.();
        }
      }, 250);
    };

    const handleStateChange = (event: { data: number }) => {
      if (cancelled) return;

      const playingState =
        window.YT?.PlayerState?.PLAYING ?? 1;

      const pausedState =
        window.YT?.PlayerState?.PAUSED ?? 2;

      const endedState =
        window.YT?.PlayerState?.ENDED ?? 0;

      const playing = event.data === playingState;

      setIsPlaying(playing);
      syncPlaybackEvent(playing);

      if (
        event.data === endedState &&
        !userPausedRef.current
      ) {
        window.setTimeout(resumePlayback, 100);
        return;
      }

      if (
        event.data === pausedState &&
        !userPausedRef.current
      ) {
        window.setTimeout(resumePlayback, 120);
      }
    };

    const createPlayer = () => {
      if (cancelled || !window.YT?.Player) return;

      player = new window.YT.Player(
        PLAYER_ID,
        {
          events: {
            onStateChange: handleStateChange,
          },
        }
      );

      window.setTimeout(resumePlayback, 150);
    };

    const handleUserPlaybackState = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ paused?: boolean }>;

      if (
        typeof customEvent.detail?.paused !== "boolean"
      ) {
        return;
      }

      userPausedRef.current = customEvent.detail.paused;

      if (!userPausedRef.current) {
        window.setTimeout(resumePlayback, 80);
      }
    };

    const handlePlaybackCommand = (event: Event) => {
      const customEvent =
        event as CustomEvent<{
          command?: "play" | "pause" | "next" | "previous";
        }>;

      const command = customEvent.detail?.command;

      if (!command || !player) return;

      if (command === "play") {
        userPausedRef.current = false;
        player.playVideo?.();
      }

      if (command === "pause") {
        userPausedRef.current = true;
        player.pauseVideo?.();
      }

      if (command === "next") {
        userPausedRef.current = false;
        player.nextVideo?.();
        window.setTimeout(() => {
          if (!cancelled) player?.playVideo?.();
        }, 250);
      }

      if (command === "previous") {
        userPausedRef.current = false;
        player.previousVideo?.();
        window.setTimeout(() => {
          if (!cancelled) player?.playVideo?.();
        }, 250);
      }
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
        const script = document.createElement("script");
        script.src = YOUTUBE_API_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
    }

    document.addEventListener(
      "visibilitychange",
      resumePlayback
    );

    window.addEventListener("focus", resumePlayback);
    window.addEventListener("pageshow", resumePlayback);
    window.addEventListener("blur", resumePlayback);

    window.addEventListener(
      "ravine-video-user-playback-state",
      handleUserPlaybackState
    );

    window.addEventListener(
      "ravine-video-playback-command",
      handlePlaybackCommand
    );

    return () => {
      cancelled = true;

      document.removeEventListener(
        "visibilitychange",
        resumePlayback
      );

      window.removeEventListener("focus", resumePlayback);
      window.removeEventListener("pageshow", resumePlayback);
      window.removeEventListener("blur", resumePlayback);

      window.removeEventListener(
        "ravine-video-user-playback-state",
        handleUserPlaybackState
      );

      window.removeEventListener(
        "ravine-video-playback-command",
        handlePlaybackCommand
      );

      if (
        window.onYouTubeIframeAPIReady ===
          previousReadyHandler ||
        previousReadyHandler === undefined
      ) {
        window.onYouTubeIframeAPIReady =
          previousReadyHandler;
      }

      player?.destroy();
      player = null;
      setIsPlaying(false);
    };
  }, [isGuestHome, embedUrl]);

  if (!isGuestHome || !embedUrl) return null;

  return (
    <div
      className={`ravine-guest-cinematic-backdrop${
        isPlaying ? " is-playing" : ""
      }`}
      aria-hidden="true"
    >
      <iframe
        id={PLAYER_ID}
        src={embedUrl}
        title="RAVINE cinematic background"
        loading="eager"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />

      <div className="ravine-guest-cinematic-wash" />
      <div className="ravine-guest-cinematic-vignette" />
    </div>
  );
}