"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, X, Play, Pause } from "lucide-react";

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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!open) setPlaying(false);
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(active.id)}?autoplay=${playing ? 1 : 0}&mute=0&controls=0&playsinline=1&rel=0&modestbranding=1`;

  return (
    <div className="ravine-radio-root">
      <div className={`ravine-radio-backdrop${open ? " is-open" : ""}`} onClick={() => setOpen(false)} aria-hidden={!open} />
      <aside className={`ravine-radio-drawer${open ? " is-open" : ""}`} role="dialog" aria-modal={open} aria-label={ar ? "راديو رَافِين" : "RAVINE Radio"}>
        <div className="ravine-radio-head">
          <div><div className="ravine-radio-kicker">RAVINE / RADIO</div><h2>{ar ? "راديو رَافِين." : "RAVINE Radio."}</h2></div>
          <button type="button" className="ravine-radio-close" onClick={() => setOpen(false)} aria-label={ar ? "إغلاق الراديو" : "Close radio"}><X size={18} /></button>
        </div>
        <div className="ravine-radio-card">
          <div className="ravine-radio-now"><span className="ravine-radio-kicker">{ar ? "الآن" : "NOW PLAYING"}</span><strong>{active.title}</strong><p className="ravine-radio-status">{ar ? "استماع داخل المنصة عبر YouTube. الصوت لا يبدأ إلا بعد تفاعل المستخدم." : "Listen inside RAVINE through YouTube. Audio only starts after user interaction."}</p></div>
          <div className="ravine-radio-actions">
            <button type="button" onClick={() => setPlaying((value) => !value)} aria-pressed={playing}>{playing ? <Pause size={15} /> : <Play size={15} />} {playing ? (ar ? "إيقاف" : "Pause") : (ar ? "تشغيل" : "Play")}</button>
            {FALLBACK_TRACKS.map((track) => <button type="button" key={track.id} onClick={() => { setActive(track); setPlaying(true); }}>{track.title}</button>)}
          </div>
        </div>
        <div className="ravine-radio-card"><p className="ravine-radio-status">{ar ? "المحتوى الصوتي قابل للتوسع لاحقًا إلى بحث ومحطات ومفضلة وسجل استماع مع الحفاظ على حدود YouTube الحالية." : "The radio surface can expand into search, stations, favorites and listening history while keeping the current YouTube boundaries."}</p></div>
        <div className="ravine-radio-player" aria-hidden="true"><iframe ref={iframeRef} title="RAVINE Radio" src={embedUrl} allow="autoplay; encrypted-media; picture-in-picture" /></div>
      </aside>
      <button type="button" className="ravine-radio-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={ar ? "فتح راديو رَافِين" : "Open RAVINE Radio"} title={ar ? "راديو رَافِين" : "RAVINE Radio"}><Radio size={20} strokeWidth={1.8} /></button>
    </div>
  );
}
