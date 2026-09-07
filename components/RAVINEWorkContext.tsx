import Link from "next/link";
import styles from "./RAVINEWorkContext.module.css";
import type { RAVINEWork } from "@/lib/ravine-work-universe";

type Props = {
  work: RAVINEWork;
  locale: "ar" | "en";
  playable: boolean;
};

const typeLabel: Record<RAVINEWork["type"], { ar: string; en: string }> = {
  short: { ar: "Short", en: "Short" },
  video: { ar: "فيديو", en: "Video" },
  film: { ar: "فيلم", en: "Film" },
  documentary: { ar: "وثائقي", en: "Documentary" },
  podcast: { ar: "بودكاست", en: "Podcast" },
  live: { ar: "بث مباشر", en: "Live" },
};

const accessLabel: Record<RAVINEWork["access"], { ar: string; en: string }> = {
  public: { ar: "عام", en: "Public" },
  followers: { ar: "للمتابعين", en: "Followers" },
  members: { ar: "للأعضاء", en: "Members" },
  tier: { ar: "باشتراك", en: "Tier" },
  invite_only: { ar: "بدعوة", en: "Invite only" },
};

function durationLabel(seconds: number | null, ar: boolean) {
  if (!seconds || seconds < 1) return ar ? "غير محددة" : "Not specified";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

export default function RAVINEWorkContext({ work, locale, playable }: Props) {
  const ar = locale === "ar";
  const type = typeLabel[work.type][ar ? "ar" : "en"];
  const access = accessLabel[work.access][ar ? "ar" : "en"];

  return (
    <section className={styles.context} aria-labelledby="ravine-work-context-title">
      <div className={styles.header}>
        <span className={styles.eyebrow}>RAVINE / WORK</span>
        <h1 id="ravine-work-context-title" className={styles.title}>{work.title}</h1>
        <p className={styles.description}>
          {work.description || (ar ? "عمل إبداعي من مجتمع RAVINE." : "A creative work from the RAVINE community.")}
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.item}><span className={styles.label}>{ar ? "النوع" : "Type"}</span><span className={styles.value}>{type}</span></div>
        <div className={styles.item}><span className={styles.label}>{ar ? "الوصول" : "Access"}</span><span className={styles.value}>{access}</span></div>
        <div className={styles.item}><span className={styles.label}>{ar ? "المدة" : "Duration"}</span><span className={styles.value}>{durationLabel(work.duration, ar)}</span></div>
        <div className={styles.item}><span className={styles.label}>{ar ? "التشغيل" : "Playback"}</span><span className={styles.value}>{playable ? (ar ? "متاح" : "Available") : (ar ? "غير متاح" : "Unavailable")}</span></div>
      </div>

      <div className={styles.actions}>
        {playable ? (
          <Link className={`${styles.action} ${styles.primary}`} href={`/${locale}/watch/${work.id}`}>
            {ar ? "تشغيل العمل" : "Play work"}
          </Link>
        ) : null}
        <Link className={styles.action} href={`/${locale}/discover`}>
          {ar ? "العودة إلى اكتشف" : "Back to Discover"}
        </Link>
      </div>
    </section>
  );
}
