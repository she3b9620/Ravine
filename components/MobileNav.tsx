"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { requestRavineAuth } from "./AuthModal";
import styles from "./MobileNav.module.css";

const navigation = [
  ["discover", "Discover", "اكتشف"],
  ["cuts", "Cuts", "كِتس"],
  ["videos", "Videos", "الفيديو"],
  ["podcasts", "Podcasts & Documentaries", "البودكاست والوثائقي"],
  ["live", "Live", "مباشر"],
  ["creators", "Creators", "المبدعون"],
] as const;

const GUEST_GATED = new Set(["cuts", "videos", "podcasts", "live"]);
type Locale = "ar" | "en";
const CLOSE_MS = 220;

export default function MobileNav({ locale, authenticated }: { locale: Locale; authenticated: boolean }) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => { if (!open) return; const key = (event: KeyboardEvent) => { if (event.key === "Escape") close(); }; document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key); }, [open]);
  function close() { if (!open || closing) return; setClosing(true); window.setTimeout(() => { setOpen(false); setClosing(false); }, CLOSE_MS); }
  function show() { setClosing(false); setOpen(true); }

  return (
    <div className={styles.root} dir={ar ? "rtl" : "ltr"}>
      <button type="button" className="ravine-mobile-menu-button" onClick={show} aria-label={ar ? "فتح القائمة" : "Open menu"} aria-expanded={open && !closing}><Menu size={20} /></button>
      {open || closing ? (
        <div className={`${styles.panel} ${closing ? styles.closing : ""}`} role="dialog" aria-modal="true" aria-label={ar ? "قائمة RAVINE" : "RAVINE menu"} onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div className={styles.head}><span className="ravine-brand">RAVINE<span>.</span></span><button type="button" className={styles.close} onClick={close} aria-label={ar ? "إغلاق القائمة" : "Close menu"}><X size={20} /></button></div>
          <nav className={styles.links}>
            <Link href={`/${locale}/discover`} onClick={close}>{ar ? "اكتشف" : "Discover"}</Link>
            {!authenticated && GUEST_GATED.has("cuts") ? <button type="button" onClick={() => { close(); window.setTimeout(() => requestRavineAuth(`/${locale}`), CLOSE_MS); }}>{ar ? "كِتس — سجّل للدخول" : "Cuts — Sign in"}</button> : <Link href={`/${locale}/cuts`} onClick={close}>{ar ? "كِتس" : "Cuts"}</Link>}
            {!authenticated && GUEST_GATED.has("videos") ? <button type="button" onClick={() => { close(); window.setTimeout(() => requestRavineAuth(`/${locale}`), CLOSE_MS); }}>{ar ? "الفيديو — سجّل للدخول" : "Videos — Sign in"}</button> : <Link href={`/${locale}/videos`} onClick={close}>{ar ? "الفيديو" : "Videos"}</Link>}
            {!authenticated && GUEST_GATED.has("podcasts") ? <button type="button" onClick={() => { close(); window.setTimeout(() => requestRavineAuth(`/${locale}`), CLOSE_MS); }}>{ar ? "البودكاست والوثائقي — سجّل للدخول" : "Podcasts & Documentaries — Sign in"}</button> : <Link href={`/${locale}/podcasts`} onClick={close}>{ar ? "البودكاست والوثائقي" : "Podcasts & Documentaries"}</Link>}
            {!authenticated && GUEST_GATED.has("live") ? <button type="button" onClick={() => { close(); window.setTimeout(() => requestRavineAuth(`/${locale}`), CLOSE_MS); }}>{ar ? "مباشر — سجّل للدخول" : "Live — Sign in"}</button> : <Link href={`/${locale}/live`} onClick={close}>{ar ? "مباشر" : "Live"}</Link>}
            <Link href={`/${locale}/creators`} onClick={close}>{ar ? "المبدعون" : "Creators"}</Link>
            {!authenticated ? <button type="button" onClick={() => { close(); window.setTimeout(() => requestRavineAuth(`/${locale}`), CLOSE_MS); }}>{ar ? "دخول" : "Sign in"}</button> : <><Link href={`/${locale}/library`} onClick={close}>{ar ? "المكتبة" : "Library"}</Link><Link href={`/${locale}/account`} onClick={close}>{ar ? "الحساب" : "Account"}</Link></>}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
