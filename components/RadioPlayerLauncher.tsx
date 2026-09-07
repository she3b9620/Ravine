"use client";

import { Music2 } from "lucide-react";
import { useEffect, useState } from "react";

type Locale = "ar" | "en";

export default function RadioPlayerLauncher({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      const player = document.querySelector<HTMLElement>(".ravine-radio-mini");
      const next = Boolean(player && player.dataset.userHidden !== "true");
      setVisible(next);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-user-hidden", "class"] });
    return () => observer.disconnect();
  }, []);

  const togglePlayer = () => {
    const player = document.querySelector<HTMLElement>(".ravine-radio-mini");
    if (!player) {
      window.dispatchEvent(new CustomEvent("ravine:radio-toggle"));
      return;
    }

    const hidden = player.dataset.userHidden === "true";
    player.dataset.userHidden = hidden ? "false" : "true";
    setVisible(hidden);
  };

  return (
    <button
      type="button"
      className={`ravine-header-icon ravine-radio-player-launcher${visible ? " is-active" : ""}`}
      aria-label={ar ? "مشغل راديو رَافِين" : "RAVINE Radio Player"}
      title={ar ? "مشغل راديو رَافِين" : "RAVINE Radio Player"}
      aria-pressed={visible}
      onClick={togglePlayer}
    >
      <Music2 size={18} strokeWidth={1.8} />
    </button>
  );
}
