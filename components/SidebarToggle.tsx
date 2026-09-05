"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ravine-sidebar-open";

export default function SidebarToggle({ locale }: { locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setOpen(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.ravineSidebar = open ? "open" : "closed";
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    return () => {
      delete document.documentElement.dataset.ravineSidebar;
    };
  }, [open]);

  return (
    <button
      type="button"
      className="ravine-sidebar-toggle"
      aria-label={open ? (ar ? "إخفاء القائمة الجانبية" : "Hide sidebar") : (ar ? "إظهار القائمة الجانبية" : "Show sidebar")}
      aria-expanded={open}
      title={open ? (ar ? "إخفاء القائمة" : "Hide sidebar") : (ar ? "إظهار القائمة" : "Show sidebar")}
      onClick={() => setOpen((value) => !value)}
    >
      {open ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
    </button>
  );
}
