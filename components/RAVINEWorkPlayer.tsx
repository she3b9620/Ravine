"use client";

import RAVINEShortsPlayer from "@/components/RAVINEShortsPlayer";
import RAVINEVideoPlayer from "@/components/RAVINEVideoPlayer";
import RAVINEPodcastPlayer from "@/components/RAVINEPodcastPlayer";
import RAVINEDocumentaryPlayer from "@/components/RAVINEDocumentaryPlayer";
import { isPlayableRAVINEWork, type RAVINEWork } from "@/lib/ravine-work-universe";
import type { RAVINEPlaybackAsset } from "@/lib/ravine-playback-core";

export type RAVINEWorkPlayerProps = {
  work: RAVINEWork;
  locale: "ar" | "en";
  chapters?: Array<{
    id: number;
    title: string;
    start_seconds: number;
    end_seconds: number | null;
    thumbnail_url: string | null;
  }>;
  assets?: RAVINEPlaybackAsset[];
};

export default function RAVINEWorkPlayer(props: RAVINEWorkPlayerProps) {
  // Keep every player path fail-closed: Cloudinary URLs can be public even when a Work
  // is a draft, hidden from discovery, or not public. Supabase signed-media routes
  // enforce this server-side too, but direct Cloudinary playback must obey it here.
  const playbackAllowed = isPlayableRAVINEWork(props.work);
  const safeProps: RAVINEWorkPlayerProps = playbackAllowed
    ? props
    : {
        ...props,
        work: { ...props.work, mediaUrl: null },
        assets: [],
      };

  switch (safeProps.work.type) {
    case "short":
      return <RAVINEShortsPlayer {...safeProps} />;
    case "podcast":
      return <RAVINEPodcastPlayer {...safeProps} />;
    case "documentary":
      return <RAVINEDocumentaryPlayer {...safeProps} />;
    case "film":
    case "series":
    case "live":
    case "video":
    default:
      return <RAVINEVideoPlayer {...safeProps} />;
  }
}
