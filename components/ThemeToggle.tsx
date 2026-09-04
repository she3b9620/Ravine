"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

const STORAGE_KEY = "ravine-theme";
type Theme = "dark" | "light";

export default function ThemeToggle({ locale }: { locale: "ar" | "en" }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme: Theme = stored === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.remove("theme-switching");
    void root.offsetWidth;
    root.dataset.theme = nextTheme;
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 520);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  const label = theme === "dark"
    ? locale === "ar" ? "الوضع الفاتح" : "Light mode"
    : locale === "ar" ? "الوضع الداكن" : "Dark mode";

  return (
    <button type="button" className={`${styles.toggle} theme-toggle-visual`} onClick={toggleTheme} aria-label={label} title={label}>
      <span className={styles.icon} aria-hidden="true">
        {theme === "dark" ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
      </span>
    </button>
  );
}
