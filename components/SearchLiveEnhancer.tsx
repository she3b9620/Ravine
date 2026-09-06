"use client";

import { createRoot, type Root } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import SearchResultsPanel from "./SearchResultsPanel";

function SearchLiveMount({ root }: { root: Root }) {
  const [mount, setMount] = useState<HTMLDivElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    let active = true;
    let dialogObserver: MutationObserver | null = null;
    let poll: number | null = null;

    const findDialog = () => document.querySelector<HTMLElement>(".ravine-search-dialog");

    const attach = (dialog: HTMLElement) => {
      const form = dialog.querySelector(".ravine-search-form");
      if (!form || !dialog.isConnected) return;
      let panel = dialog.querySelector<HTMLDivElement>(":scope > .ravine-search-live-mount");
      if (!panel) {
        panel = document.createElement("div");
        panel.className = "ravine-search-live-mount";
        form.insertAdjacentElement("afterend", panel);
      }
      if (active) setMount(panel);
    };

    const sync = () => {
      const dialog = findDialog();
      if (dialog) attach(dialog);
      else setMount(null);
    };

    sync();
    poll = window.setInterval(sync, 250);
    dialogObserver = new MutationObserver(sync);
    dialogObserver.observe(document.body, { childList: true, subtree: true });
    observerRef.current = dialogObserver;

    return () => {
      active = false;
      if (poll) window.clearInterval(poll);
      dialogObserver?.disconnect();
      observerRef.current = null;
    };
  }, [root]);

  return mount;
}

export default function SearchLiveEnhancer() {
  const rootRef = useRef<Root | null>(null);
  const hostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mountRenderer = () => {
      const dialog = document.querySelector<HTMLElement>(".ravine-search-dialog");
      const mount = dialog?.querySelector<HTMLDivElement>(":scope > .ravine-search-live-mount");
      if (!mount) return;

      if (hostRef.current === mount && rootRef.current) return;
      if (rootRef.current) rootRef.current.unmount();
      hostRef.current = mount;
      rootRef.current = createRoot(mount);
      rootRef.current.render(<LiveSearchBridge />);
    };

    mountRenderer();
    const observer = new MutationObserver(mountRenderer);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(mountRenderer, 250);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      if (rootRef.current) rootRef.current.unmount();
      rootRef.current = null;
      hostRef.current = null;
    };
  }, []);

  return null;
}

function LiveSearchBridge() {
  const [state, setState] = useState({
    query: "",
    category: "",
    type: "",
    duration: "",
    format: "",
    quality: "",
  });
  const [locale, setLocale] = useState<"ar" | "en">("ar");

  useEffect(() => {
    let active = true;
    let poll: number | null = null;

    const read = () => {
      const dialog = document.querySelector<HTMLElement>(".ravine-search-dialog");
      if (!dialog) return;
      const input = dialog.querySelector<HTMLInputElement>(".ravine-search-input input");
      const getHidden = (name: string) => dialog.querySelector<HTMLInputElement>(`.ravine-search-form input[name="${name}"]`)?.value || "";
      const nextLocale = (document.documentElement.lang || "ar").toLowerCase().startsWith("en") ? "en" : "ar";
      const next = {
        query: input?.value || "",
        category: getHidden("category"),
        type: getHidden("type"),
        duration: getHidden("duration"),
        format: getHidden("format"),
        quality: getHidden("quality"),
      };
      if (active) {
        setLocale(nextLocale);
        setState((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      }
    };

    read();
    poll = window.setInterval(read, 160);
    return () => {
      active = false;
      if (poll) window.clearInterval(poll);
    };
  }, []);

  return <SearchResultsPanel locale={locale} {...state} />;
}
