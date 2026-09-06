"use client";

type YouTubePlayerVars = {
  autoplay?: number;
  mute?: number;
  controls?: number;
  loop?: number;
  playsinline?: number;
  modestbranding?: number;
  rel?: number;
  iv_load_policy?: number;
  disablekb?: number;
  fs?: number;
  origin?: string;
  enablejsapi?: number;
};

type YouTubePlayerEvents = {
  onReady?: () => void;
  onStateChange?: (event: { data: number }) => void;
};

export type YouTubePlayer = {
  destroy: () => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  stopVideo?: () => void;
  mute?: () => void;
  unMute?: () => void;
  setVolume?: (volume: number) => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  loadVideoById?: (videoId: string) => void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string;
      playerVars?: YouTubePlayerVars;
      events?: YouTubePlayerEvents;
    }
  ) => YouTubePlayer;
  PlayerState?: {
    UNSTARTED?: number;
    ENDED?: number;
    PLAYING?: number;
    PAUSED?: number;
    BUFFERING?: number;
    CUED?: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
  }
}

const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
const LOAD_TIMEOUT_MS = 15000;

let apiPromise: Promise<YouTubeApi> | null = null;

export function loadYouTubeIframeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube IFrame API requires a browser"));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_IFRAME_API_SRC}"]`
    );

    const startedAt = Date.now();
    let intervalId: number | null = null;
    let settled = false;

    const cleanup = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const check = () => {
      if (window.YT?.Player) {
        finish(() => resolve(window.YT as YouTubeApi));
        return;
      }

      if (Date.now() - startedAt >= LOAD_TIMEOUT_MS) {
        finish(() => reject(new Error("Timed out loading YouTube IFrame API")));
      }
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = YOUTUBE_IFRAME_API_SRC;
      script.async = true;
      script.addEventListener("error", () => {
        finish(() => reject(new Error("Failed to load YouTube IFrame API")));
      }, { once: true });
      document.head.appendChild(script);
    }

    intervalId = window.setInterval(check, 50);
    check();
  }).catch((error) => {
    apiPromise = null;
    throw error;
  });

  return apiPromise;
}
