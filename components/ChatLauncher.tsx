"use client";

import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import DirectMessages from "@/components/DirectMessages";

type Locale = "ar" | "en";

export default function ChatLauncher({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="ravine-header-icon ravine-chat-launcher"
        aria-label={ar ? "الرسائل" : "Messages"}
        title={ar ? "الرسائل" : "Messages"}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MessageCircle size={18} strokeWidth={1.8} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="ravine-message-center-overlay" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
              <div className="ravine-message-center" role="dialog" aria-modal="true" aria-labelledby="ravine-message-center-title" dir={ar ? "rtl" : "ltr"}>
                <div className="ravine-message-center-head">
                  <div>
                    <span>{ar ? "RAVINE / الرسائل" : "RAVINE / MESSAGES"}</span>
                    <h2 id="ravine-message-center-title">{ar ? "رسائلك، في مكانها." : "Your conversations, right here."}</h2>
                  </div>
                  <button type="button" className="ravine-message-center-close" onClick={() => setOpen(false)} aria-label={ar ? "إغلاق الرسائل" : "Close messages"}>
                    <X size={18} />
                  </button>
                </div>

                <div className="ravine-message-center-body">
                  <DirectMessages locale={locale} compact />
                </div>

                <div className="ravine-message-center-footer">
                  <span>{ar ? "يمكنك إدارة كل محادثاتك من الصفحة الكاملة." : "Manage every conversation from the full messages page."}</span>
                  <Link className="button primary" href={`/${locale}/messages`} onClick={() => setOpen(false)}>
                    {ar ? "فتح الرسائل كاملة" : "Open full messages"}
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
