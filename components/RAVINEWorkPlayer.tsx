"use client";

import RAVINEShortsPlayer from "@/components/RAVINEShortsPlayer";
import RAVINEVideoPlayer from "@/components/RAVINEVideoPlayer";
import RAVINEPodcastPlayer from "@/components/RAVINEPodcastPlayer";
import RAVINEDocumentaryPlayer from "@/components/RAVINEDocumentaryPlayer";
import type { RAVINEWork } from "@/lib/ravine-work-universe";
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
  switch (props.work.type) {
    case "short":
      return <RAVINEShortsPlayer {...props} />;
    case "podcast":
      return <RAVINEPodcastPlayer {...props} />;
    case "documentary":
      return <RAVINEDocumentaryPlayer {...props} />;
    case "film":
    case "live":
    case "video":
    default:
      return <RAVINEVideoPlayer {...props} />;
  }
}
