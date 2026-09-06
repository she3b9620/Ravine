"use client";

import { createRoot, type Root } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import SearchResultsPanel from "./SearchResultsPanel";

type SearchState = {
  open: boolean;
  locale: "ar" | "en";
  query: string;
  category: string;
  type: string;
  duration: string;
  format: string;
  quality: string;
};

const SEARCH_STATE_EVENT = "ravine-search-state";

export default function SearchLiveEnhancer() {
  const rootRef = useRef<Root | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let latestState: SearchState = {
      open: false,
      locale: document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "ar",
      query: "",
      category: "",
      type: "",
      duration: "",
      format: "",
      quality: "",
    };

    const unmount = () => {
      rootRef.current?.unmount();
      rootRef.current = null;
      hostRef.current = null;
    };

    const ensureMount = () => {
      if (disposed) return;

      const dialog = document.querySelector<HTMLElement>(".ravine-search-dialog");
      const form = dialog?.querySelector<HTMLElement>(".ravine-search-form");

      if (!dialog || !form || !latestState.open) {
        if (!dialog || !latestState.open) unmount();
        return;
      }

      let mount = dialog.querySelector<HTMLDivElement>(":scope > .ravine-search-live-mount");
      if (!mount) {
        mount = document.createElement("div");
        mount.className = "ravine-search-live-mount";
        form.insertAdjacentElement("afterend", mount);
      }

      if (hostRef.current !== mount || !rootRef.current) {
        rootRef.current?.unmount();
        hostRef.current = mount;
        rootRef.current = createRoot(mount);
      }

      rootRef.current.render(<SearchResultsPanel {...latestState} />);
    };

    const onSearchState = (event: Event) => {
      const detail = (event as CustomEvent<SearchState>).detail;
      if (!detail) return;
      latestState = detail;
      if (!detail.open) {
        unmount();
        return;
      }
      ensureMount();
    };

    window.addEventListener(SEARCH_STATE_EVENT, onSearchState as EventListener);

    ensureMount();

    const observer = new MutationObserver(() => ensureMount());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener(SEARCH_STATE_EVENT, onSearchState as EventListener);
      unmount();
    };
  }, []);

  return null;
}
