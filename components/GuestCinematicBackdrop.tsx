"use client";

import { useEffect, useMemo, useState } from "react";
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
  loadVideoById?: (videoId: string) => void;
  nextVideo?: () => void;
  previousVideo?: () => void;
};

type YouTubeApi = {
  Player: new (
    element: string,
    options: {
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

function randomVideoIndex(length: number) {
  if (length <= 1) return 0;
  if (typeof window === "undefined" || !window.crypto?.getRandomValues) {
    return Math.floor(Math.random() * length);
  }

  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % length;
}

type VideoControlEvent = CustomEvent<{
  action: "play" | "pause" | "next" | "previous" | "toggle-audio";
  muted?: boolean;
}>;

export default function GuestCinematicBackdrop({
  locale,
}: GuestCinematicBackdropProps) {
  const pathname = usePathname();
  const [isGuestHome, setIsGuestHome] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startIndex, setStartIndex] = useState<number | null>(null);

  const embedUrl = useMemo(() => {
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
        typeof window !== "undefined" ? window.location.origin : "",
    });

    return `https://www.youtube-nocookie.com/embed/${first}?${params.toString()}`;
  }, [startIndex]);

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
    if (!isGuestHome || !embedUrl || startIndex === null) return;

    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let previousReadyHandler: (() => void) | undefined;

    let currentIndex = startIndex;
    let userPaused = false;

    const dispatchPlaybackState = (playing: boolean) => {
      setIsPlaying(playing);
      window.dispatchEvent(
        new CustomEvent("ravine-video-playback-state", {
          detail: { playing },
        })
      );
    };

    const dispatchAudioState = (muted: boolean) => {
      window.dispatchEvent(
        new CustomEvent("ravine-video-audio-state", {
          detail: { muted },
        })
      );
    };

    const applyMuteState = (muted: boolean) => {
      if (muted) {
        player?.mute?.();
      } else {
        player?.unMute?.();
      }

      dispatchAudioState(muted);
    };

    const resumePlayback = () => {
      if (cancelled || userPaused) return;
      player?.playVideo?.();
    };

    const handleStateChange = (event: { data: number }) => {
      if (cancelled) return;

      const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
      const pausedState = window.YT?.PlayerState?.PAUSED ?? 2;

      if (event.data === playingState) {
        dispatchPlaybackState(true);
      } else if (event.data === pausedState) {
        dispatchPlaybackState(false);
      }
    };

    const handleControl = (event: Event) => {
      if (cancelled) return;

      const customEvent = event as VideoControlEvent;
      const action = customEvent.detail?.action;

      if (!action || !player) return;

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
        const muted = customEvent.detail?.muted ?? true;
        applyMuteState(muted);
        return;
      }

      const wasPlaying = !userPaused;

      if (action === "next") {
        currentIndex = (currentIndex + 1) % VIDEO_IDS.length;

        if (player.nextVideo) {
          player.nextVideo();
        } else {
          player.loadVideoById?.(VIDEO_IDS[currentIndex]);
        }
      }

      if (action === "previous") {
        currentIndex =
          (currentIndex - 1 + VIDEO_IDS.length) % VIDEO_IDS.length;

        if (player.previousVideo) {
          player.previousVideo();
        } else {
          player.loadVideoById?.(VIDEO_IDS[currentIndex]);
        }
      }

      window.setTimeout(() => {
        if (cancelled) return;

        const mutedDetail = customEvent.detail?.muted;
        if (typeof mutedDetail === "boolean") {
          applyMuteState(mutedDetail);
        }

        if (wasPlaying) {
          userPaused = false;
          player?.playVideo?.();
        }
      }, 250);
    };

    const createPlayer = () => {
      if (cancelled || !window.YT?.Player) return;

      player = new window.YT.Player(PLAYER_ID, {
        events: {
          onReady: () => {
            if (cancelled) return;

            player?.mute?.();
            dispatchAudioState(true);

            window.setTimeout(() => {
              if (!cancelled && !userPaused) {
                player?.playVideo?.();
              }
            }, 150);
          },
          onStateChange: handleStateChange,
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      previousReadyHandler = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousReadyHandler?.();
        createPlayer();
      };

      if (!document.querySelector(`script[src="${YOUTUBE_API_SRC}"]`)) {
        const script = document.createElement("script");
        script.src = YOUTUBE_API_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
    }

    window.addEventListener(
      "ravine-video-control",
      handleControl as EventListener
    );

    document.addEventListener("visibilitychange", resumePlayback);
    window.addEventListener("focus", resumePlayback);
    window.addEventListener("pageshow", resumePlayback);

    return () => {
      cancelled = true;

      window.removeEventListener(
        "ravine-video-control",
        handleControl as EventListener
      );

      document.removeEventListener("visibilitychange", resumePlayback);
      window.removeEventListener("focus", resumePlayback);
      window.removeEventListener("pageshow", resumePlayback);

      if (
        window.onYouTubeIframeAPIReady === previousReadyHandler ||
        previousReadyHandler === undefined
      ) {
        window.onYouTubeIframeAPIReady = previousReadyHandler;
      }

      player?.destroy();
      player = null;
      setIsPlaying(false);
    };
  }, [isGuestHome, embedUrl, startIndex]);

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
