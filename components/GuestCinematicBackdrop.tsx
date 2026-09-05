"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GuestCinematicBackdropProps = {
  locale: "ar" | "en";
};

const VIDEO_IDS = [
  "RLKQ-cHohFc",
  "O2zRehtoU1w",
  "DBjjCRSXdGQ",
  "Aoyx39cAjgc",
  "NTwlc9Oa9BQ",
  "vgdPiCr0TnQ",
] as const;

export default function GuestCinematicBackdrop({ locale }: GuestCinematicBackdropProps) {
  const pathname = usePathname();
  const [isGuestHome, setIsGuestHome] = useState(false);

  const embedUrl = useMemo(() => {
    const first = VIDEO_IDS[0];
    const playlist = VIDEO_IDS.join(",");
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "0",
      loop: "1",
      playlist,
      playsinline: "1",
      modestbranding: "1",
      rel: "0",
      iv_load_policy: "3",
      disablekb: "1",
      fs: "0",
      origin: typeof window !== "undefined" ? window.location.origin : "",
    });
    return `https://www.youtube-nocookie.com/embed/${first}?${params.toString()}`;
  }, []);

  useEffect(() => {
    if (pathname !== `/${locale}`) {
      setIsGuestHome(false);
      return;
    }

    let mounted = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setIsGuestHome(!data.user);
    }).catch(() => {
      if (mounted) setIsGuestHome(false);
    });

    return () => {
      mounted = false;
    };
  }, [locale, pathname]);

  if (!isGuestHome) return null;

  return (
    <div className="ravine-guest-cinematic-backdrop" aria-hidden="true">
      <iframe
        src={embedUrl}
        title="RAVINE cinematic background"
        loading="eager"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <div className="ravine-guest-cinematic-wash" />
      <div className="ravine-guest-cinematic-vignette" />
    </div>
  );
}
