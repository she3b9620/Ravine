"use client";

import { createRoot, type Root } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import SearchResultsPanel from "./SearchResultsPanel";

export default function SearchLiveEnhancer() {
  const rootRef = useRef<Root | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;

    const ensureMount = () => {
      if (disposed) return;
      const dialog = document.querySelector<HTMLElement>(".ravine-search-dialog");
      const form = dialog?.querySelector(".ravine-search-form");
      if (!dialog || !form) {
        if (hostRef.current && !hostRef.current.isConnected) {
          rootRef.current?.unmount();
          rootRef.current = null;
          hostRef.current = null;
        }
        return;
      }

      let mount = dialog.querySelector<HTMLDivElement>(":scope > .ravine-search-live-mount");
      if (!mount) {
        mount = document.createElement("div");
        mount.className = "ravine-search-live-mount";
        form.insertAdjacentElement("afterend", mount);
      }

      if (hostRef.current === mount && rootRef.current) return;
      rootRef.current?.unmount();
      hostRef.current = mount;
      rootRef.current = createRoot(mount);
      rootRef.current.render(<LiveSearchBridge />);
    };

    ensureMount();
    const observer = new MutationObserver(ensureMount);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(ensureMount, 220);

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearInterval(timer);
      rootRef.current?.unmount();
      rootRef.current = null;
      hostRef.current = null;
    };
  }, []);

  return null;
}

function LiveSearchBridge() {
  const [state, setState] = useState({ query: "", category: "", type: "", duration: "", format: "", quality: "" });
  const [locale, setLocale] = useState<"ar" | "en">("ar");

  useEffect(() => {
    const read = () => {
      const dialog = document.querySelector<HTMLElement>(".ravine-search-dialog");
      if (!dialog) return;
      const input = dialog.querySelector<HTMLInputElement>(".ravine-search-input input");
      const hidden = (name: string) => dialog.querySelector<HTMLInputElement>(`.ravine-search-form input[name="${name}"]`)?.value || "";
      const next = { query: input?.value || "", category: hidden("category"), type: hidden("type"), duration: hidden("duration"), format: hidden("format"), quality: hidden("quality") };
      const nextLocale = (document.documentElement.lang || "ar").toLowerCase().startsWith("en") ? "en" : "ar";
      setLocale(nextLocale);
      setState((old) => JSON.stringify(old) === JSON.stringify(next) ? old : next);
    };
    read();
    const timer = window.setInterval(read, 120);
    return () => window.clearInterval(timer);
  }, []);

  return <SearchResultsPanel locale={locale} {...state} />;
}
