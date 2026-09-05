"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GuestCinematicBackdropProps = {
  locale: "ar" | "en";
};

type YouTubePlayer = {
  destroy: () => void;
};

type YouTubeApi = {
  Player: new (element: string, options: { events: { onStateChange: (event: { data: number }) => void } }) => YouTubePlayer;
  PlayerState?: { PLAYING?: number; PAUSED?: number; BUFFERING?: number; ENDED?: number };
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

export default function GuestCinematicBackdrop({ locale }: GuestCinematicBackdropProps) {
  const pathname = usePathname();
  const [isGuestHome, setIsGuestHome] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const embedUrl = useMemo(() => {
    const first = VIDEO_IDS[0];
    const playlist = VIDEO_IDS.join(",");
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "0",
      loop: "1",
      playlist,
      playsinline: "1",
      modestbranding: "1",
      rel: "0",
      iv_load_policy: "3",
      disablekb: "1",
      fs: "0",
      enablejsapi: "1",
      origin: typeof window !== "undefined" ? window.location.origin : "",
    });
    return `https://www.youtube-nocookie.com/embed/${first}?${params.toString()}`;
  }, []);

  useEffect(() => {
    if (pathname !== `/${locale}`) {
      setIsGuestHome(false);
      setIsPlaying(false);
      return;
    }

    let mounted = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setIsGuestHome(!data.user);
    }).catch(() => {
      if (mounted) setIsGuestHome(false);
    });

    return () => {
      mounted = false;
    };
  }, [locale, pathname]);

  useEffect(() => {
    if (!isGuestHome) return;

    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let previousReadyHandler: (() => void) | undefined;

    const handleStateChange = (event: { data: number }) => {
      if (cancelled) return;
      const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
      setIsPlaying(event.data === playingState);
    };

    const createPlayer = () => {
      if (cancelled || !window.YT?.Player) return;
      player = new window.YT.Player(PLAYER_ID, { events: { onStateChange: handleStateChange } });
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

    return () => {
      cancelled = true;
      if (window.onYouTubeIframeAPIReady === previousReadyHandler || previousReadyHandler === undefined) {
        window.onYouTubeIframeAPIReady = previousReadyHandler;
      }
      player?.destroy();
      player = null;
      setIsPlaying(false);
    };
  }, [isGuestHome]);

  if (!isGuestHome) return null;

  return (
    <div className={`ravine-guest-cinematic-backdrop${isPlaying ? " is-playing" : ""}`} aria-hidden="true">
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
