"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Radio, X, Play, Pause, Search, ExternalLink } from "lucide-react";
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

const RADIO_CATALOG: RadioTrack[] = [
  { id: "RLKQ-cHohFc", title: "RAVINE Radio", subtitle: "Cinematic listening" },
  { id: "O2zRehtoU1w", title: "RAVINE Sessions", subtitle: "Visual culture & sound" },
];

export default function RavineRadio({ locale }: Props) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(RADIO_CATALOG[0]);
  const [query, setQuery] = useState("");
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
      setQuery("");
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
  }, [active.id, open, playing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredTracks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return RADIO_CATALOG;

    return RADIO_CATALOG.filter((track) =>
      `${track.title} ${track.subtitle}`.toLocaleLowerCase().includes(normalized),
    );
  }, [query]);

  const selectTrack = (track: RadioTrack) => {
    setActive(track);
    setPlaying(true);
  };

  const submitSearch = () => {
    const first = filteredTracks[0];
    if (first) {
      selectTrack(first);
      return;
    }

    const target = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
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

  return (
    <div className="ravine-radio-root">
      <style>{`
        .ravine-radio-drawer{display:flex;flex-direction:column;gap:16px}
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
        .ravine-radio-actions{display:flex;flex-wrap:wrap;gap:8px}
        .ravine-radio-actions button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;border-radius:11px;padding:0 12px;border:1px solid rgba(241,233,220,.08);background:rgba(241,233,220,.025);color:var(--ivory);cursor:pointer;transition:border-color .2s ease,background .2s ease,transform .2s ease}
        .ravine-radio-actions button:hover{transform:translateY(-1px);border-color:rgba(196,122,82,.28);background:rgba(196,122,82,.055)}
        .ravine-radio-actions button[aria-pressed="true"]{border-color:rgba(196,122,82,.34);background:rgba(196,122,82,.08)}
        .ravine-radio-catalog-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
        .ravine-radio-catalog-title{font-size:12px;color:var(--ivory);font-weight:700}
        .ravine-radio-catalog-count{font-size:10px;color:var(--stone)}
        html[data-theme="light"] .ravine-radio-search-box input,html[data-theme="light"] .ravine-radio-search-result,html[data-theme="light"] .ravine-radio-actions button{color:#f1e9dc}
        html[data-theme="light"] .ravine-radio-search-result-subtitle,html[data-theme="light"] .ravine-radio-search-label,html[data-theme="light"] .ravine-radio-catalog-count{color:#d8d0c5}
        @media(max-width:600px){.ravine-radio-drawer{gap:13px}.ravine-radio-search-box{min-height:46px}.ravine-radio-actions{display:grid;grid-template-columns:1fr 1fr}.ravine-radio-actions button{width:100%}}
        @media(prefers-reduced-motion:reduce){.ravine-radio-search-box,.ravine-radio-search-result,.ravine-radio-actions button{transition:none}}
      `}</style>

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
                  <button
                    key={track.id}
                    type="button"
                    className={`ravine-radio-search-result${active.id === track.id ? " is-active" : ""}`}
                    onClick={() => selectTrack(track)}
                    aria-pressed={active.id === track.id}
                  >
                    <span className="ravine-radio-search-result-copy">
                      <span className="ravine-radio-search-result-title">{track.title}</span>
                      <span className="ravine-radio-search-result-subtitle">{track.subtitle}</span>
                    </span>
                    <span className="ravine-radio-search-result-icon" aria-hidden="true">
                      <Play size={15} fill="currentColor" />
                    </span>
                  </button>
                ))
              ) : (
                <div className="ravine-radio-search-empty">
                  <strong>{ar ? "مفيش نتيجة في مكتبة RAVINE الحالية." : "No match in the current RAVINE catalog."}</strong>
                  <span>
                    {ar
                      ? "اضغط Enter لفتح نتائج YouTube لنفس البحث."
                      : "Press Enter to open YouTube results for the same search."}
                  </span>
                  <button
                    type="button"
                    className="ravine-radio-search-result"
                    onClick={submitSearch}
                  >
                    <span className="ravine-radio-search-result-copy">
                      <span className="ravine-radio-search-result-title">
                        {ar ? "بحث خارجي على YouTube" : "Search YouTube"}
                      </span>
                    </span>
                    <span className="ravine-radio-search-result-icon" aria-hidden="true">
                      <ExternalLink size={15} />
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="ravine-radio-card">
          <div className="ravine-radio-catalog-head">
            <span className="ravine-radio-catalog-title">
              {ar ? "اختيارات الراديو" : "Radio picks"}
            </span>
            <span className="ravine-radio-catalog-count">
              {RADIO_CATALOG.length} {ar ? "مسارات" : "tracks"}
            </span>
          </div>

          <div className="ravine-radio-search-results">
            {RADIO_CATALOG.map((track) => (
              <button
                key={track.id}
                type="button"
                className={`ravine-radio-search-result${active.id === track.id ? " is-active" : ""}`}
                onClick={() => selectTrack(track)}
                aria-pressed={active.id === track.id}
              >
                <span className="ravine-radio-search-result-copy">
                  <span className="ravine-radio-search-result-title">{track.title}</span>
                  <span className="ravine-radio-search-result-subtitle">{track.subtitle}</span>
                </span>
                <span className="ravine-radio-search-result-icon" aria-hidden="true">
                  {active.id === track.id && playing ? (
                    <Pause size={15} fill="currentColor" />
                  ) : (
                    <Play size={15} fill="currentColor" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ravine-radio-card">
          <div className="ravine-radio-now">
            <span className="ravine-radio-kicker">
              {ar ? "الآن" : "NOW PLAYING"}
            </span>
            <strong>{active.title}</strong>
            <p className="ravine-radio-status">
              {ar
                ? "الاستماع داخل المنصة عبر YouTube. الصوت يبدأ بعد تفاعل المستخدم."
                : "Listen inside RAVINE through YouTube. Audio starts after user interaction."}
            </p>
          </div>

          <div className="ravine-radio-actions">
            <button
              type="button"
              onClick={togglePlayback}
              aria-pressed={playing}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? (ar ? "إيقاف" : "Pause") : ar ? "تشغيل" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => setQuery("")}
            >
              {ar ? "مسح البحث" : "Clear"}
            </button>
          </div>
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
