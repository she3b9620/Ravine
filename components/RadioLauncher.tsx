"use client";

import { Radio } from "lucide-react";
import { useEffect, useState } from "react";

type Locale = "ar" | "en";

export default function RadioLauncher({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      if (typeof detail?.open === "boolean") setOpen(detail.open);
    };

    window.addEventListener("ravine:radio-state", onState);
    return () => window.removeEventListener("ravine:radio-state", onState);
  }, []);

  const toggle = () => {
    window.dispatchEvent(new CustomEvent("ravine:radio-toggle"));
  };

  return (
    <button
      type="button"
      className={`ravine-header-icon ravine-radio-launcher${open ? " is-active" : ""}`}
      aria-label={ar ? "راديو رَافِين" : "RAVINE Radio"}
      title={ar ? "راديو رَافِين" : "RAVINE Radio"}
      aria-expanded={open}
      onClick={toggle}
    >
      <Radio size={18} strokeWidth={1.8} />
    </button>
  );
}
