"use client";

import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DirectMessages from "@/components/DirectMessages";

type Locale = "ar" | "en";
const CLOSE_MS = 220;

export default function ChatLauncher({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  function close() {
    if (!open || closing) return;
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); }, CLOSE_MS);
  }

  function openCenter() {
    setClosing(false);
    setOpen(true);
  }

  return (
    <>
      <button type="button" className="ravine-header-icon ravine-chat-launcher" aria-label={ar ? "الرسائل" : "Messages"} title={ar ? "الرسائل" : "Messages"} aria-expanded={open && !closing} onClick={open ? close : openCenter}>
        <MessageCircle size={18} strokeWidth={1.8} />
      </button>

      {mounted && (open || closing) ? createPortal(
        <div className={`ravine-message-center-overlay${closing ? " is-closing" : ""}`} role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div className={`ravine-message-center${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="ravine-message-center-title" dir={ar ? "rtl" : "ltr"}>
            <div className="ravine-message-center-head">
              <div><span>{ar ? "RAVINE / الرسائل" : "RAVINE / MESSAGES"}</span><h2 id="ravine-message-center-title">{ar ? "رسائلك، في مكانها." : "Your conversations, right here."}</h2></div>
              <button type="button" className="ravine-message-center-close" onClick={close} aria-label={ar ? "إغلاق الرسائل" : "Close messages"}><X size={18} /></button>
            </div>
            <div className="ravine-message-center-body"><DirectMessages locale={locale} compact /></div>
            <div className="ravine-message-center-footer">
              <span>{ar ? "يمكنك إدارة كل محادثاتك من الصفحة الكاملة." : "Manage every conversation from the full messages page."}</span>
              <Link className="button primary" href={`/${locale}/messages`} onClick={close}>{ar ? "فتح الرسائل كاملة" : "Open full messages"}</Link>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
