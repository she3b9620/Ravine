"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { requestRavineAuth } from "./AuthModal";
import styles from "./MobileNav.module.css";

const navigation = [
  ["discover", "Discover", "اكتشف"],
  ["cuts", "Cuts", "كِتس"],
  ["videos", "Videos", "الفيديو"],
  ["podcasts", "Podcasts", "البودكاست"],
  ["live", "Live", "مباشر"],
  ["creators", "Creators", "المبدعون"],
] as const;

type Locale = "ar" | "en";

export default function MobileNav({ locale, authenticated }: { locale: Locale; authenticated: boolean }) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <div className={styles.root} dir={ar ? "rtl" : "ltr"}>
      <button
        type="button"
        className="ravine-mobile-menu-button"
        onClick={() => setOpen(true)}
        aria-label={ar ? "فتح القائمة" : "Open menu"}
        aria-expanded={open}
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-modal="true" aria-label={ar ? "قائمة RAVINE" : "RAVINE menu"}>
          <div className={styles.head}>
            <span className="ravine-brand">RAVINE<span>.</span></span>
            <button type="button" className={styles.close} onClick={close} aria-label={ar ? "إغلاق القائمة" : "Close menu"}>
              <X size={20} />
            </button>
          </div>
          <nav className={styles.links}>
            {navigation.map(([slug, en, arLabel]) => (
              <Link key={slug} href={`/${locale}/${slug}`} onClick={close}>
                {ar ? arLabel : en}
              </Link>
            ))}
            {authenticated ? (
              <>
                <Link href={`/${locale}/library`} onClick={close}>{ar ? "المكتبة" : "Library"}</Link>
                <Link href={`/${locale}/account`} onClick={close}>{ar ? "الحساب" : "Account"}</Link>
              </>
            ) : (
              <button type="button" onClick={() => { close(); requestRavineAuth(`/${locale}`); }}>
                {ar ? "دخول" : "Sign in"}
              </button>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
