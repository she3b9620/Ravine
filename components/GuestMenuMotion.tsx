"use client";

import { useEffect } from "react";

export default function GuestMenuMotion() {
  useEffect(() => {
    let allowNextClick = false;
    let closeTimer: number | undefined;

    const getGuestMenu = () => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>("header button")).find(
        (item) => item.getAttribute("aria-label") === "فتح القائمة" || item.getAttribute("aria-label") === "Open menu"
      );
      const nav = document.querySelector("header nav");
      if (!button || !nav) return null;
      return { button, shell: nav.parentElement };
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>(
        'header button[aria-label="فتح القائمة"], header button[aria-label="Open menu"]'
      );
      if (!button) return;

      if (allowNextClick) {
        allowNextClick = false;
        return;
      }

      const menu = getGuestMenu();
      if (!menu?.shell) return;

      event.preventDefault();
      event.stopPropagation();
      menu.shell.classList.remove("ravine-menu-opening");
      menu.shell.classList.add("ravine-menu-closing");

      if (closeTimer) window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        menu.shell?.classList.remove("ravine-menu-closing");
        allowNextClick = true;
        button.click();
      }, 320);
    };

    const observer = new MutationObserver(() => {
      const menu = getGuestMenu();
      if (!menu?.shell) return;
      if (!menu.shell.classList.contains("ravine-menu-shell")) {
        menu.shell.classList.add("ravine-menu-shell");
        menu.shell.classList.add("ravine-menu-opening");
        window.setTimeout(() => menu.shell?.classList.remove("ravine-menu-opening"), 380);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      observer.disconnect();
      if (closeTimer) window.clearTimeout(closeTimer);
    };
  }, []);

  return null;
}
