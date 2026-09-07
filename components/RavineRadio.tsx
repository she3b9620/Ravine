"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
  Radio,
  Search,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import {
  loadYouTubeIframeApi,
  type YouTubePlayer,
} from "@/lib/youtube-iframe-api";

type Props = { locale: "ar" | "en" };

type RadioTrack = {
  id: string;
  title: string;
  subtitle: string;
};

type CloseDirection = "left" | "right" | "up" | "down";

const RADIO_CATALOG: RadioTrack[] = [
  { id: "RLKQ-cHohFc", title: "RAVINE Radio", subtitle: "Cinematic listening" },
  { id: "O2zRehtoU1w", title: "RAVINE Sessions", subtitle: "Visual culture & sound" },
];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default function RavineRadio({ locale }: Props) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeDirection, setCloseDirection] = useState<CloseDirection>("right");
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(RADIO_CATALOG[0]);
  const [query, setQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const activeIdRef = useRef(active.id);
  const playingRef = useRef(playing);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    activeIdRef.current = active.id;
  }, [active.id]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    let cancelled = false;

    const mountPlayer = async () => {
      try {
        const YT = await loadYouTubeIframeApi();
        if (cancelled || playerRef.current || !playerHostRef.current) return;

        const player = new YT.Player(playerHostRef.current, {
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
              setDuration(player.getDuration?.() ?? 0);
              if (playingRef.current) player.playVideo?.();
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const playingState = YT.PlayerState?.PLAYING ?? 1;
              const pausedState = YT.PlayerState?.PAUSED ?? 2;
              const endedState = YT.PlayerState?.ENDED ?? 0;

              if (event.data === playingState) {
                setPlaying(true);
              } else if (event.data === pausedState || event.data === endedState) {
                setPlaying(false);
              }

              if (event.data === endedState) {
                setCurrentTime(0);
              }
            },
          },
        });

        playerRef.current = player;
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
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    player.loadVideoById?.(active.id);
    setCurrentTime(0);
    const nextDuration = player.getDuration?.() ?? 0;
    if (nextDuration > 0) setDuration(nextDuration);
    if (playingRef.current) player.playVideo?.();
  }, [active.id]);

  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrentTime(player.getCurrentTime?.() ?? 0);
      setDuration((value) => {
        const next = player.getDuration?.() ?? 0;
        return next > 0 ? next : value;
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) closeDrawer();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const filteredTracks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return RADIO_CATALOG;
    return RADIO_CATALOG.filter((track) =>
      `${track.title} ${track.subtitle}`.toLocaleLowerCase().includes(normalized),
    );
  }, [query]);

  const activeIndex = RADIO_CATALOG.findIndex((track) => track.id === active.id);

  const selectTrack = (track: RadioTrack) => {
    setActive(track);
    setPlaying(true);
  };

  const moveTrack = (direction: -1 | 1) => {
    const current = activeIndex < 0 ? 0 : activeIndex;
    const next = (current + direction + RADIO_CATALOG.length) % RADIO_CATALOG.length;
    selectTrack(RADIO_CATALOG[next]);
  };

  const seekBy = (seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    const current = player.getCurrentTime?.() ?? 0;
    const total = player.getDuration?.() ?? duration;
    const target = total > 0
      ? Math.min(total, Math.max(0, current + seconds))
      : Math.max(0, current + seconds);
    player.seekTo?.(target, true);
    setCurrentTime(target);
  };

  const seekToRatio = (ratio: number) => {
    const player = playerRef.current;
    if (!player || duration <= 0) return;
    const target = Math.min(duration, Math.max(0, ratio * duration));
    player.seekTo?.(target, true);
    setCurrentTime(target);
  };

  const submitSearch = () => {
    const first = filteredTracks[0];
    if (first) {
      selectTrack(first);
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) return;
    const target = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const togglePlayback = () => {
    const nextPlaying = !playing;
    setPlaying(nextPlaying);
    if (nextPlaying) {
      playerRef.current?.playVideo?.();
    } else {
      playerRef.current?.pauseVideo?.();
    }
  };

  function closeDrawer() {
    if (!open || closing) return;

    const drawer = drawerRef.current;
    if (drawer) {
      const rect = drawer.getBoundingClientRect();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const distances = {
        left: rect.left,
        right: width - rect.right,
        up: rect.top,
        down: height - rect.bottom,
      };
      const closest = (Object.entries(distances) as Array<[CloseDirection, number]>)
        .sort((a, b) => a[1] - b[1])[0]?.[0];
      if (closest) setCloseDirection(closest);
    }

    setClosing(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setClosing(false);
      setOpen(false);
      closeTimerRef.current = null;
    }, 280);
  }

  const toggleDrawer = () => {
    if (closing) {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      setClosing(false);
      setOpen(true);
      return;
    }
    setOpen((value) => !value);
  };

  const closeX = closeDirection === "left" ? "-108%" : closeDirection === "right" ? "108%" : "0";
  const closeY = closeDirection === "up" ? "-108%" : closeDirection === "down" ? "108%" : "0";
  const drawerStyle = {
    "--ravine-radio-out-x": closeX,
    "--ravine-radio-out-y": closeY,
  } as CSSProperties;

  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="ravine-radio-root">
      <style>{`
        .ravine-radio-drawer{display:flex;flex-direction:column;gap:16px;will-change:transform,opacity;}
        .ravine-radio-drawer.is-closing{animation:ravineRadioDrawerOut .28s cubic-bezier(.55,.08,.68,.53) both!important;}
        .ravine-radio-search{display:flex;flex-direction:column;gap:9px}
        .ravine-radio-search-label{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--stone);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
        .ravine-radio-search-box{display:flex;align-items:center;gap:10px;border:1px solid rgba(241,233,220,.11);background:rgba(241,233,220,.035);border-radius:14px;min-height:48px;padding:0 13px;transition:border-color .25s ease,background .25s ease,box-shadow .25s ease}
        .ravine-radio-search-box:focus-within{border-color:rgba(196,122,82,.42);background:rgba(196,122,82,.055);box-shadow:0 0 0 3px rgba(196,122,82,.08)}
        .ravine-radio-search-box svg{flex:0 0 auto;color:#d49a78}
        .ravine-radio-search-box input{width:100%;border:0;outline:0;background:transparent;color:var(--ivory);font:inherit;font-size:14px;min-width:0}
        .ravine-radio-search-box input::placeholder{color:var(--stone);opacity:.8}
        .ravine-radio-search-results{display:grid;gap:7px}
        .ravine-radio-search-result{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;text-align:start;border:1px solid rgba(241,233,220,.07);background:rgba(241,233,220,.025);color:var(--ivory);border-radius:12px;padding:10px 11px;cursor:pointer;transition:transform .2s ease,border-color .2s ease,background .2s ease}
        .ravine-radio-search-result:hover{transform:translateY(-1px);border-color:rgba(196,122,82,.28);background:rgba(196,122,82,.05)}
        .ravine-radio-search-result.is-active{border-color:rgba(196,122,82,.34);background:rgba(196,122,82,.065)}
        .ravine-radio-search-result-copy{display:grid;gap:3px;min-width:0}
        .ravine-radio-search-result-title{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ravine-radio-search-result-subtitle{font-size:11px;color:var(--stone);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ravine-radio-search-result-icon{display:grid;place-items:center;color:#d49a78}
        .ravine-radio-search-empty{display:grid;gap:4px;padding:10px 12px;border:1px dashed rgba(241,233,220,.1);border-radius:12px;color:var(--stone);font-size:12px;line-height:1.55}
        .ravine-radio-search-empty strong{color:var(--ivory);font-size:13px}
        .ravine-radio-now{display:grid;gap:6px}
        .ravine-radio-now strong{font-size:20px;line-height:1.18}
        .ravine-radio-actions{display:grid;grid-template-columns:auto auto 1fr auto auto;align-items:center;gap:7px}
        .ravine-radio-actions button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;border-radius:11px;padding:0 12px;border:1px solid rgba(241,233,220,.08);background:rgba(241,233,220,.025);color:var(--ivory);cursor:pointer;transition:border-color .2s ease,background .2s ease,transform .2s ease}
        .ravine-radio-actions button:hover{transform:translateY(-1px);border-color:rgba(196,122,82,.28);background:rgba(196,122,82,.055)}
        .ravine-radio-actions button[aria-pressed="true"]{border-color:rgba(196,122,82,.34);background:rgba(196,122,82,.08)}
        .ravine-radio-catalog-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
        .ravine-radio-catalog-title{font-size:12px;color:var(--ivory);font-weight:700}
        .ravine-radio-catalog-count{font-size:10px;color:var(--stone)}
        .ravine-radio-progress{display:flex;align-items:center;gap:8px;margin-top:8px}
        .ravine-radio-progress-time{font-size:9px;color:var(--stone);font-variant-numeric:tabular-nums;min-width:29px}
        .ravine-radio-progress-track{position:relative;height:4px;flex:1;border-radius:99px;background:rgba(241,233,220,.11);cursor:pointer;overflow:hidden}
        .ravine-radio-progress-fill{position:absolute;inset-block:0;inset-inline-start:0;width:${progress}%;border-radius:inherit;background:linear-gradient(90deg,#c47a52,#d49a78);transition:width .22s linear}
        .ravine-radio-mini{position:fixed;z-index:190;inset-inline-end:22px;bottom:22px;width:min(420px,calc(100vw - 44px));display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:11px 13px;border:1px solid rgba(241,233,220,.12);border-radius:17px;background:linear-gradient(140deg,rgba(9,9,9,.94),rgba(21,23,25,.92));box-shadow:0 18px 55px rgba(0,0,0,.32),0 0 0 1px rgba(196,122,82,.05) inset;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);animation:ravineRadioMiniIn .34s cubic-bezier(.22,1,.36,1) both}
        .ravine-radio-mini-art{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:#f1e9dc;background:linear-gradient(145deg,#183f46,#70402f);box-shadow:inset 0 0 0 1px rgba(241,233,220,.1)}
        .ravine-radio-mini-copy{display:grid;gap:3px;min-width:0}
        .ravine-radio-mini-kicker{font-size:9px;color:#d49a78;letter-spacing:.12em;text-transform:uppercase}
        .ravine-radio-mini-title{font-size:13px;font-weight:800;color:#f1e9dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ravine-radio-mini-subtitle{font-size:10px;color:#9a9690;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ravine-radio-mini-controls{display:flex;align-items:center;gap:5px}
        .ravine-radio-mini-controls button{width:34px;height:34px;padding:0;border-radius:10px;border:1px solid rgba(241,233,220,.08);background:rgba(241,233,220,.035);color:#f1e9dc;display:grid;place-items:center;cursor:pointer}
        .ravine-radio-mini-controls button:hover{border-color:rgba(196,122,82,.35);background:rgba(196,122,82,.07)}
        .ravine-radio-mini-controls .is-main{width:38px;height:38px;border-color:rgba(196,122,82,.3);background:rgba(196,122,82,.12)}
        .ravine-radio-mini-progress{grid-column:1/-1;display:flex;align-items:center;gap:8px}
        .ravine-radio-mini-progress .ravine-radio-progress-track{height:3px}
        .ravine-radio-player{position:fixed;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;pointer-events:none;opacity:0}
        @keyframes ravineRadioDrawerOut{from{opacity:1;transform:translate3d(0,0,0)}to{opacity:0;transform:translate3d(var(--ravine-radio-out-x),var(--ravine-radio-out-y),0)}}
        @keyframes ravineRadioMiniIn{from{opacity:0;transform:translateY(16px) scale(.98);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}
        html[data-theme="light"] .ravine-radio-search-box input,html[data-theme="light"] .ravine-radio-search-result,html[data-theme="light"] .ravine-radio-actions button{color:#f1e9dc}
        html[data-theme="light"] .ravine-radio-search-result-subtitle,html[data-theme="light"] .ravine-radio-search-label,html[data-theme="light"] .ravine-radio-catalog-count{color:#d8d0c5}
        @media(max-width:600px){.ravine-radio-drawer{gap:13px}.ravine-radio-search-box{min-height:46px}.ravine-radio-actions{grid-template-columns:repeat(5,minmax(0,1fr))}.ravine-radio-actions button{width:100%;padding:0}.ravine-radio-mini{inset-inline:14px;width:auto;bottom:14px;padding:10px}.ravine-radio-mini-controls button{width:31px;height:31px}.ravine-radio-mini-controls .is-main{width:35px;height:35px}}
        @media(prefers-reduced-motion:reduce){.ravine-radio-search-box,.ravine-radio-search-result,.ravine-radio-actions button,.ravine-radio-drawer,.ravine-radio-drawer.is-closing,.ravine-radio-mini{transition:none;animation:none}}
      `}</style>

      <div
        className={`ravine-radio-backdrop${open ? " is-open" : ""}`}
        onClick={closeDrawer}
        aria-hidden={!open}
      />

      <aside
        ref={drawerRef}
        className={`ravine-radio-drawer${open ? " is-open" : ""}${closing ? " is-closing" : ""}`}
        style={drawerStyle}
        role="dialog"
        aria-modal={open}
        aria-label={ar ? "راديو رَافِين" : "RAVINE Radio"}
      >
        <div className="ravine-radio-head">
          <div>
            <div className="ravine-radio-kicker">RAVINE / RADIO</div>
            <h2>{ar ? "راديو رَافِين." : "RAVINE Radio."}</h2>
          </div>

          <button type="button" className="ravine-radio-close" onClick={closeDrawer} aria-label={ar ? "إغلاق الراديو" : "Close radio"}>
            <X size={18} />
          </button>
        </div>

        <div className="ravine-radio-search">
          <div className="ravine-radio-search-label">
            <span>{ar ? "ابحث عن أغنية أو جلسة" : "Find a song or session"}</span>
            <span>RAVINE RADIO</span>
          </div>

          <form
            className="ravine-radio-search-box"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
            role="search"
          >
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={ar ? "اكتب اسم الأغنية أو الفنان..." : "Song title or artist..."}
              aria-label={ar ? "البحث في راديو رافين" : "Search RAVINE Radio"}
              autoComplete="off"
            />
          </form>

          {query.trim() ? (
            <div className="ravine-radio-search-results" aria-live="polite">
              {filteredTracks.length > 0 ? (
                filteredTracks.map((track) => (
                  <button key={track.id} type="button" className={`ravine-radio-search-result${active.id === track.id ? " is-active" : ""}`} onClick={() => selectTrack(track)} aria-pressed={active.id === track.id}>
                    <span className="ravine-radio-search-result-copy">
                      <span className="ravine-radio-search-result-title">{track.title}</span>
                      <span className="ravine-radio-search-result-subtitle">{track.subtitle}</span>
                    </span>
                    <span className="ravine-radio-search-result-icon" aria-hidden="true"><Play size={15} fill="currentColor" /></span>
                  </button>
                ))
              ) : (
                <div className="ravine-radio-search-empty">
                  <strong>{ar ? "مفيش نتيجة في مكتبة RAVINE الحالية." : "No match in the current RAVINE catalog."}</strong>
                  <span>{ar ? "اضغط Enter لفتح نتائج YouTube لنفس البحث." : "Press Enter to open YouTube results for the same search."}</span>
                  <button type="button" className="ravine-radio-search-result" onClick={submitSearch}>
                    <span className="ravine-radio-search-result-copy"><span className="ravine-radio-search-result-title">{ar ? "بحث خارجي على YouTube" : "Search YouTube"}</span></span>
                    <span className="ravine-radio-search-result-icon" aria-hidden="true"><ExternalLink size={15} /></span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="ravine-radio-card">
          <div className="ravine-radio-catalog-head">
            <span className="ravine-radio-catalog-title">{ar ? "اختيارات الراديو" : "Radio picks"}</span>
            <span className="ravine-radio-catalog-count">{RADIO_CATALOG.length} {ar ? "مسارات" : "tracks"}</span>
          </div>

          <div className="ravine-radio-search-results">
            {RADIO_CATALOG.map((track) => (
              <button key={track.id} type="button" className={`ravine-radio-search-result${active.id === track.id ? " is-active" : ""}`} onClick={() => selectTrack(track)} aria-pressed={active.id === track.id}>
                <span className="ravine-radio-search-result-copy">
                  <span className="ravine-radio-search-result-title">{track.title}</span>
                  <span className="ravine-radio-search-result-subtitle">{track.subtitle}</span>
                </span>
                <span className="ravine-radio-search-result-icon" aria-hidden="true">{active.id === track.id && playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ravine-radio-card">
          <div className="ravine-radio-now">
            <span className="ravine-radio-kicker">{ar ? "الآن" : "NOW PLAYING"}</span>
            <strong>{active.title}</strong>
            <p className="ravine-radio-status">{ar ? "الاستماع يستمر حتى بعد إغلاق نافذة الراديو." : "Playback continues even after the Radio window is closed."}</p>
          </div>

          <div className="ravine-radio-actions">
            <button type="button" onClick={() => moveTrack(-1)} aria-label={ar ? "المسار السابق" : "Previous track"} title={ar ? "السابق" : "Previous"}><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => seekBy(-10)} aria-label={ar ? "رجوع 10 ثواني" : "Back 10 seconds"} title={ar ? "رجوع 10 ثواني" : "Back 10s"}><SkipBack size={15} /></button>
            <button type="button" onClick={togglePlayback} aria-pressed={playing}>{playing ? <Pause size={15} /> : <Play size={15} />} {playing ? (ar ? "إيقاف" : "Pause") : ar ? "تشغيل" : "Play"}</button>
            <button type="button" onClick={() => seekBy(10)} aria-label={ar ? "تقديم 10 ثواني" : "Forward 10 seconds"} title={ar ? "تقديم 10 ثواني" : "Forward 10s"}><SkipForward size={15} /></button>
            <button type="button" onClick={() => moveTrack(1)} aria-label={ar ? "المسار التالي" : "Next track"} title={ar ? "التالي" : "Next"}><ChevronRight size={16} /></button>
          </div>

          <div className="ravine-radio-progress" aria-label={ar ? "تقدم التشغيل" : "Playback progress"}>
            <span className="ravine-radio-progress-time">{formatTime(currentTime)}</span>
            <button
              type="button"
              className="ravine-radio-progress-track"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                seekToRatio((event.clientX - rect.left) / rect.width);
              }}
              aria-label={ar ? "تغيير موضع التشغيل" : "Seek playback"}
            >
              <span className="ravine-radio-progress-fill" />
            </button>
            <span className="ravine-radio-progress-time">{formatTime(duration)}</span>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="ravine-radio-trigger"
        onClick={toggleDrawer}
        aria-expanded={open}
        aria-label={ar ? "فتح راديو رَافِين" : "Open RAVINE Radio"}
        title={ar ? "راديو رَافِين" : "RAVINE Radio"}
      >
        <Radio size={20} strokeWidth={1.8} />
      </button>

      {active ? (
        <div className="ravine-radio-mini" role="region" aria-label={ar ? "مشغل راديو مصغر" : "Mini Radio Player"}>
          <div className="ravine-radio-mini-art" aria-hidden="true"><Radio size={18} strokeWidth={1.8} /></div>
          <div className="ravine-radio-mini-copy">
            <span className="ravine-radio-mini-kicker">RAVINE RADIO</span>
            <span className="ravine-radio-mini-title">{active.title}</span>
            <span className="ravine-radio-mini-subtitle">{playing ? (ar ? "يعمل الآن" : "Playing now") : ar ? "متوقف مؤقتًا" : "Paused"}</span>
          </div>
          <div className="ravine-radio-mini-controls">
            <button type="button" onClick={() => moveTrack(-1)} aria-label={ar ? "السابق" : "Previous"}><ChevronLeft size={14} /></button>
            <button type="button" onClick={() => seekBy(-10)} aria-label={ar ? "رجوع 10 ثواني" : "Back 10 seconds"}><SkipBack size={13} /></button>
            <button type="button" onClick={togglePlayback} className="is-main" aria-pressed={playing} aria-label={playing ? (ar ? "إيقاف مؤقت" : "Pause") : ar ? "تشغيل" : "Play"}>{playing ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button>
            <button type="button" onClick={() => seekBy(10)} aria-label={ar ? "تقديم 10 ثواني" : "Forward 10 seconds"}><SkipForward size={13} /></button>
            <button type="button" onClick={() => moveTrack(1)} aria-label={ar ? "التالي" : "Next"}><ChevronRight size={14} /></button>
          </div>
          <div className="ravine-radio-mini-progress">
            <span className="ravine-radio-progress-time">{formatTime(currentTime)}</span>
            <button
              type="button"
              className="ravine-radio-progress-track"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                seekToRatio((event.clientX - rect.left) / rect.width);
              }}
              aria-label={ar ? "تغيير موضع التشغيل" : "Seek playback"}
            >
              <span className="ravine-radio-progress-fill" />
            </button>
            <span className="ravine-radio-progress-time">{formatTime(duration)}</span>
          </div>
        </div>
      ) : null}

      <div ref={playerHostRef} className="ravine-radio-player" aria-hidden="true" />
    </div>
  );
}
