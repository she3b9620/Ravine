"use client";

import { useEffect } from "react";

const VOLUME_INPUT = '.guest-shell .ravine-video-volume-popover input[type="range"]';
const AUDIO_BUTTON = '.guest-shell .ravine-hero-video-audio-toggle';

function clampVolume(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function syncVolumeIndicator(value?: number) {
  const input = document.querySelector<HTMLInputElement>(VOLUME_INPUT);
  if (!input) return;

  const next = clampVolume(
    typeof value === "number" ? value : Number(input.value || 0)
  );

  input.style.setProperty("--ravine-volume-progress", `${next}%`);
  const label = input.closest("label");
  label?.setAttribute("data-ravine-volume", String(next));
}

function setVolumeTo100() {
  const input = document.querySelector<HTMLInputElement>(VOLUME_INPUT);
  if (!input) return;

  input.value = "100";
  syncVolumeIndicator(100);

  window.dispatchEvent(
    new CustomEvent("ravine-video-control", {
      detail: { action: "set-volume", muted: false, volume: 100 },
    })
  );

  window.dispatchEvent(
    new CustomEvent("ravine-video-audio-state", {
      detail: { muted: false, volume: 100 },
    })
  );
}

export default function GuestInteractionPolish() {
  useEffect(() => {
    const syncFromDom = () => syncVolumeIndicator();

    const onVolumeState = (event: Event) => {
      const detail = (event as CustomEvent<{ volume?: number }>).detail;
      syncVolumeIndicator(detail?.volume);
    };

    const onRangeInput = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.matches(VOLUME_INPUT)) {
        syncVolumeIndicator(Number(target.value));
      }
    };

    const onAudioClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>(AUDIO_BUTTON);
      if (!button) return;

      const wasMuted = button.getAttribute("aria-pressed") === "false";
      if (!wasMuted) return;

      window.setTimeout(setVolumeTo100, 0);
    };

    const observer = new MutationObserver(() => syncFromDom());

    document.addEventListener("input", onRangeInput);
    document.addEventListener("click", onAudioClick);
    window.addEventListener("ravine-video-audio-state", onVolumeState);
    observer.observe(document.body, { childList: true, subtree: true });
    syncFromDom();

    return () => {
      document.removeEventListener("input", onRangeInput);
      document.removeEventListener("click", onAudioClick);
      window.removeEventListener("ravine-video-audio-state", onVolumeState);
      observer.disconnect();
    };
  }, []);

  return null;
}
