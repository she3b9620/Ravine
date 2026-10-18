"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { requestRavineAuth } from "./AuthModal";
import styles from "./MobileNav.module.css";

const navigation = [
  ["discover", "Discover", "اكتشف"],
  ["shorts", "Shorts", "الشورتات"],
  ["videos", "Videos", "الفيديوهات"],
  ["podcasts", "Podcasts", "البودكاست"],
  ["documentaries", "Documentaries", "الأفلام الوثائقية"],
  ["short-films", "Short Films", "الأفلام القصيرة"],
  ["films", "Feature Films", "الأفلام المطوّلة"],
  ["series", "Series", "المسلسلات"],
  ["live", "Live", "مباشر"],
  ["events", "Events & Premieres", "الأحداث والعروض"],
  ["spaces", "Spaces", "المساحات"],
  ["collections", "Collections & Boards", "المجموعات واللوحات"],
  ["creators", "Creators", "المبدعون"],
  ["community", "Community", "المجتمع"],
] as const;

type Locale = "ar" | "en";
const CLOSE_MS = 220;

export default function MobileNav({ locale, authenticated }: { locale: Locale; authenticated: boolean }) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);

  function close() {
    if (!open || closing) return;
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); }, CLOSE_MS);
  }

  function show() { setClosing(false); setOpen(true); }

  return (
    <div className={styles.root} dir={ar ? "rtl" : "ltr"}>
      <button type="button" className="ravine-mobile-menu-button" onClick={show} aria-label={ar ? "فتح القائمة" : "Open menu"} aria-expanded={open && !closing}><Menu size={20} /></button>
      {open || closing ? (
        <div className={`${styles.panel} ${closing ? styles.closing : ""}`} role="dialog" aria-modal="true" aria-label={ar ? "قائمة RAVINE" : "RAVINE menu"} onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div className={styles.head}><span className="ravine-brand">RAVINE<span>.</span></span><button type="button" className={styles.close} onClick={close} aria-label={ar ? "إغلاق القائمة" : "Close menu"}><X size={20} /></button></div>
          <nav className={styles.links}>
            {navigation.map(([slug, en, arLabel]) => (
              <Link key={slug} href={`/${locale}/${slug}`} onClick={close}>
                {locale === "ar" ? arLabel : en}
              </Link>
            ))}
            {!authenticated ? <button type="button" onClick={() => { close(); window.setTimeout(() => requestRavineAuth(`/${locale}`), CLOSE_MS); }}>{ar ? "دخول" : "Sign in"}</button> : <><Link href={`/${locale}/library`} onClick={close}>{ar ? "المكتبة" : "Library"}</Link><Link href={`/${locale}/account`} onClick={close}>{ar ? "الحساب" : "Account"}</Link></>}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
