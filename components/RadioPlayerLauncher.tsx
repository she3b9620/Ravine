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
      setVisible(Boolean(player && player.dataset.userHidden !== "true"));
    };
    window.addEventListener("ravine:radio-state", sync);
    window.addEventListener("ravine:radio-player-state", sync);
    sync();
    return () => {
      window.removeEventListener("ravine:radio-state", sync);
      window.removeEventListener("ravine:radio-player-state", sync);
    };
  }, []);

  const togglePlayer = () => {
    const player = document.querySelector<HTMLElement>(".ravine-radio-mini");
    if (!player) {
      window.dispatchEvent(new CustomEvent("ravine:radio-player-open"));
      return;
    }

    const nextVisible = player.dataset.userHidden === "true";
    player.dataset.userHidden = nextVisible ? "false" : "true";
    setVisible(nextVisible);
    window.dispatchEvent(new CustomEvent("ravine:radio-player-state", { detail: { visible: nextVisible } }));
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
