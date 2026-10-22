"use client";

type Locale = "ar" | "en";

export default function RavineHeroVideoButton({ locale }: { locale: Locale }) {
  function playHeroVideo() {
    window.dispatchEvent(
      new CustomEvent("ravine-video-control", {
        detail: { action: "play" },
      })
    );
  }

  return (
    <button
      type="button"
      className="button ravine-reference-cta-secondary"
      onClick={playHeroVideo}
      aria-label={locale === "ar" ? "شاهد فيديو الواجهة" : "Play the hero video"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5.5 19 12 8 18.5Z" />
      </svg>
      <span>{locale === "ar" ? "شاهد الفيديو" : "Watch video"}</span>
    </button>
  );
}
