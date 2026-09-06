"use client";

import { useEffect } from "react";

export const RAVINE_LOGO_MOTION_KEY = "ravine-logo-motion";

function applyLogoMotion(enabled: boolean) {
  document.documentElement.dataset.ravineLogoMotion = enabled ? "on" : "off";
}

export default function RavineLogoMotion() {
  useEffect(() => {
    const stored = window.localStorage.getItem(RAVINE_LOGO_MOTION_KEY);
    applyLogoMotion(stored !== "off");

    const onChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      if (typeof customEvent.detail?.enabled === "boolean") {
        applyLogoMotion(customEvent.detail.enabled);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === RAVINE_LOGO_MOTION_KEY) {
        applyLogoMotion(event.newValue !== "off");
      }
    };

    window.addEventListener("ravine-logo-motion-change", onChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("ravine-logo-motion-change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
