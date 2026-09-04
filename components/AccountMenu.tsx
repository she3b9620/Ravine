"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Compass, Heart, Library, LogOut, MessageCircle, Settings, UserRound, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Locale = "ar" | "en";

type Props = {
  locale: Locale;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  isCreator: boolean;
};

export default function AccountMenu({ locale, displayName, username, avatarUrl, isCreator }: Props) {
  const ar = locale === "ar";
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.replace(`/${locale}`);
    router.refresh();
  }

  const fallback = (displayName || username || "R").trim().slice(0, 1).toUpperCase();

  return (
    <div ref={rootRef} className={`ravine-account-menu${open ? " is-open" : ""}`} dir={ar ? "rtl" : "ltr"}>
      <button
        type="button"
        className="ravine-account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title={displayName || (ar ? "حسابك" : "Your account")}
      >
        <span className="ravine-account-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{fallback}</span>}
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open ? (
        <div className="ravine-account-panel" role="menu">
          <div className="ravine-account-summary">
            <div className="ravine-account-avatar large">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{fallback}</span>}
            </div>
            <div className="ravine-account-summary-copy">
              <strong>{displayName || (ar ? "مستخدم RAVINE" : "RAVINE user")}</strong>
              <span>{username ? `@${username}` : (ar ? "هوية شخصية" : "Personal identity")}</span>
            </div>
          </div>

          <div className="ravine-account-section-label">{ar ? "مساحتك" : "Your space"}</div>
          <Link href={`/${locale}`} onClick={() => setOpen(false)} role="menuitem"><UserRound size={16} />{ar ? "الرئيسية" : "Home"}</Link>
          <Link href={`/${locale}/account`} onClick={() => setOpen(false)} role="menuitem"><Settings size={16} />{ar ? "الحساب والإعدادات" : "Account & settings"}</Link>
          <Link href={`/${locale}/library`} onClick={() => setOpen(false)} role="menuitem"><Library size={16} />{ar ? "المكتبة" : "Library"}</Link>
          <Link href={`/${locale}/notifications`} onClick={() => setOpen(false)} role="menuitem"><Heart size={16} />{ar ? "الإشعارات" : "Notifications"}</Link>
          <Link href={`/${locale}/community`} onClick={() => setOpen(false)} role="menuitem"><MessageCircle size={16} />{ar ? "المجتمعات" : "Communities"}</Link>
          <Link href={`/${locale}/discover`} onClick={() => setOpen(false)} role="menuitem"><Compass size={16} />{ar ? "الاكتشاف" : "Discover"}</Link>

          <div className="ravine-account-section-label">{ar ? "لوحتك" : "Dashboard"}</div>
          <Link href={`/${locale}/account`} onClick={() => setOpen(false)} role="menuitem"><Video size={16} />{ar ? "لوحة المستخدم" : "User dashboard"}</Link>
          {isCreator ? <Link href={`/${locale}/studio`} onClick={() => setOpen(false)} role="menuitem"><Video size={16} />{ar ? "استوديو المبدع" : "Creator Studio"}</Link> : null}

          <div className="ravine-account-divider" />
          <button type="button" className="ravine-account-signout" onClick={() => void signOut()} disabled={signingOut} role="menuitem">
            <LogOut size={16} />
            {signingOut ? (ar ? "جارٍ الخروج…" : "Signing out…") : (ar ? "تسجيل الخروج" : "Sign out")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
