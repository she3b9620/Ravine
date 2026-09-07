"use client";

import { useEffect } from "react";

export default function RadioPlayerBridge() {
  useEffect(() => {
    const onOpen = () => {
      const existing = document.querySelector<HTMLElement>(".ravine-radio-mini");
      if (existing) {
        existing.dataset.userHidden = "false";
        window.dispatchEvent(new CustomEvent("ravine:radio-player-state", { detail: { visible: true } }));
        return;
      }

      window.dispatchEvent(new CustomEvent("ravine:radio-toggle"));
      window.setTimeout(() => {
        const firstTrack = document.querySelector<HTMLButtonElement>(
          ".ravine-radio-drawer .ravine-radio-card .ravine-radio-search-result",
        );
        firstTrack?.click();

        window.setTimeout(() => {
          const player = document.querySelector<HTMLElement>(".ravine-radio-mini");
          if (!player) return;
          player.dataset.userHidden = "false";
          window.dispatchEvent(new CustomEvent("ravine:radio-player-state", { detail: { visible: true } }));
        }, 120);
      }, 120);
    };

    window.addEventListener("ravine:radio-player-open", onOpen);
    return () => window.removeEventListener("ravine:radio-player-open", onOpen);
  }, []);

  return null;
}
