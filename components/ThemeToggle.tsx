"use client";

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
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  const label = theme === "dark"
    ? locale === "ar" ? "الوضع الفاتح" : "Light mode"
    : locale === "ar" ? "الوضع الداكن" : "Dark mode";

  return (
    <button type="button" className={styles.toggle} onClick={toggleTheme} aria-label={label} title={label}>
      <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
    </button>
  );
}
