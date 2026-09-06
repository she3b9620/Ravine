"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, X, Play, Pause } from "lucide-react";
import {
  loadYouTubeIframeApi,
  type YouTubePlayer,
} from "@/lib/youtube-iframe-api";

type Props = { locale: "ar" | "en" };

type RadioTrack = { id: string; title: string; subtitle: string };

const FALLBACK_TRACKS: RadioTrack[] = [
  { id: "RLKQ-cHohFc", title: "RAVINE Radio", subtitle: "Cinematic listening" },
  { id: "O2zRehtoU1w", title: "RAVINE Sessions", subtitle: "Visual culture & sound" },
];

export default function RavineRadio({ locale }: Props) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(FALLBACK_TRACKS[0]);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef(active.id);
  const playingRef = useRef(playing);

  useEffect(() => {
    activeIdRef.current = active.id;
  }, [active.id]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    if (!open) {
      setPlaying(false);
      playerRef.current?.pauseVideo?.();
      playerRef.current?.stopVideo?.();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const mountPlayer = async () => {
      try {
        const YT = await loadYouTubeIframeApi();
        if (cancelled || playerRef.current || !playerHostRef.current) return;

        playerRef.current = new YT.Player(playerHostRef.current, {
          videoId: activeIdRef.current,
          playerVars: {
            autoplay: 0,
            controls: 0,
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              if (playingRef.current) {
                playerRef.current?.playVideo?.();
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;

              const playingState = YT.PlayerState?.PLAYING ?? 1;
              const pausedState = YT.PlayerState?.PAUSED ?? 2;
              const endedState = YT.PlayerState?.ENDED ?? 0;

              if (event.data === playingState) {
                setPlaying(true);
              } else if (
                event.data === pausedState ||
                event.data === endedState
              ) {
                setPlaying(false);
              }
            },
          },
        });
      } catch {
        if (!cancelled) {
          playerRef.current = null;
          setPlaying(false);
        }
      }
    };

    void mountPlayer();

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !playerRef.current) return;

    playerRef.current.loadVideoById?.(active.id);
    if (playing) {
      playerRef.current.playVideo?.();
    }
  }, [active.id, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const togglePlayback = () => {
    const nextPlaying = !playing;
    setPlaying(nextPlaying);

    if (nextPlaying) {
      playerRef.current?.playVideo?.();
    } else {
      playerRef.current?.pauseVideo?.();
    }
  };

  return (
    <div className="ravine-radio-root">
      <div
        className={`ravine-radio-backdrop${open ? " is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        className={`ravine-radio-drawer${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal={open}
        aria-label={ar ? "راديو رَافِين" : "RAVINE Radio"}
      >
        <div className="ravine-radio-head">
          <div>
            <div className="ravine-radio-kicker">RAVINE / RADIO</div>
            <h2>{ar ? "راديو رَافِين." : "RAVINE Radio."}</h2>
          </div>

          <button
            type="button"
            className="ravine-radio-close"
            onClick={() => setOpen(false)}
            aria-label={ar ? "إغلاق الراديو" : "Close radio"}
          >
            <X size={18} />
          </button>
        </div>

        <div className="ravine-radio-card">
          <div className="ravine-radio-now">
            <span className="ravine-radio-kicker">
              {ar ? "الآن" : "NOW PLAYING"}
            </span>
            <strong>{active.title}</strong>
            <p className="ravine-radio-status">
              {ar
                ? "استماع داخل المنصة عبر YouTube. الصوت يبدأ فقط بعد تفاعل المستخدم."
                : "Listen inside RAVINE through YouTube. Audio starts only after user interaction."}
            </p>
          </div>

          <div className="ravine-radio-actions">
            <button
              type="button"
              onClick={togglePlayback}
              aria-pressed={playing}
              disabled={!playerRef.current && !open}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? (ar ? "إيقاف" : "Pause") : ar ? "تشغيل" : "Play"}
            </button>

            {FALLBACK_TRACKS.map((track) => (
              <button
                type="button"
                key={track.id}
                aria-pressed={active.id === track.id}
                onClick={() => {
                  setActive(track);
                  setPlaying(true);
                }}
              >
                {track.title}
              </button>
            ))}
          </div>
        </div>

        <div className="ravine-radio-card">
          <p className="ravine-radio-status">
            {ar
              ? "الراديو يستخدم YouTube IFrame API بدل إعادة تحميل iframe مع كل تشغيل وإيقاف، مع الحفاظ على حدود YouTube الحالية."
              : "Radio uses the YouTube IFrame API instead of reloading an iframe for every play/pause action, while keeping current YouTube boundaries."}
          </p>
        </div>

        <div
          ref={playerHostRef}
          className="ravine-radio-player"
          aria-hidden="true"
        />
      </aside>

      <button
        type="button"
        className="ravine-radio-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={ar ? "فتح راديو رَافِين" : "Open RAVINE Radio"}
        title={ar ? "راديو رَافِين" : "RAVINE Radio"}
      >
        <Radio size={20} strokeWidth={1.8} />
      </button>
    </div>
  );
}
