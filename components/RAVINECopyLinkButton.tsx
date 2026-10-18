"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import styles from "./RAVINECopyLinkButton.module.css";

type Locale = "ar" | "en";

export default function RAVINECopyLinkButton({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function shareLink() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: document.title, url });
        setStatus("copied");
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("Clipboard copy failed");
      }
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    window.setTimeout(() => setStatus("idle"), 2600);
  }

  const label = status === "copied"
    ? (ar ? "تم نسخ الرابط" : "Link copied")
    : status === "error"
      ? (ar ? "تعذرت المشاركة" : "Could not share")
      : (ar ? "مشاركة المجموعة العامة" : "Share public collection");

  return (
    <div className={styles.root}>
      <button type="button" className={styles.button} onClick={() => void shareLink()} aria-label={label} title={label}>
        {status === "copied" ? <Check size={14} aria-hidden="true" /> : status === "error" ? <Share2 size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        <span>{status === "copied" ? (ar ? "تم النسخ" : "Copied") : status === "error" ? (ar ? "حاول مجددًا" : "Try again") : (ar ? "مشاركة" : "Share")}</span>
      </button>
      <span className={styles.visuallyHidden} role="status" aria-live="polite">{label}</span>
    </div>
  );
}
