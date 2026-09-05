"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "ravine-sidebar-open";

export default function SidebarToggle({ locale }: { locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const rootRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setOpen(true);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const sidebar = document.querySelector<HTMLElement>(".ravine-sidebar");

    document.documentElement.dataset.ravineSidebar = open ? "open" : "closed";
    document.documentElement.dataset.ravineSidebarDirection = ar ? "rtl" : "ltr";
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");

    // The RTL sidebar rule uses !important, so the state must use the same
    // priority. This makes the open position deterministic on the Arabic shell.
    if (sidebar) {
      sidebar.dataset.sidebarOpen = open ? "true" : "false";
      sidebar.style.setProperty("transform", open ? "translateX(0)" : ar ? "translateX(100%)" : "translateX(-100%)", "important");
      sidebar.style.setProperty("opacity", open ? "1" : "0", "important");
      sidebar.style.setProperty("visibility", open ? "visible" : "hidden", "important");
      sidebar.style.setProperty("pointer-events", open ? "auto" : "none", "important");
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!open) return;
      const target = event.target as Node | null;
      if (root?.contains(target) || sidebar?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (open && event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, ar]);

  return (
    <button
      ref={rootRef}
      type="button"
      className="ravine-sidebar-toggle"
      aria-label={open ? (ar ? "إخفاء القائمة الجانبية" : "Hide sidebar") : (ar ? "إظهار القائمة الجانبية" : "Show sidebar")}
      aria-expanded={open}
      title={open ? (ar ? "إخفاء القائمة" : "Hide sidebar") : (ar ? "إظهار القائمة" : "Show sidebar")}
      onClick={() => setOpen((value) => !value)}
    >
      {open ? <X aria-hidden="true" size={19} strokeWidth={2} /> : <Menu aria-hidden="true" size={19} strokeWidth={2} />}
    </button>
  );
}
