"use client";

import RAVINEPlayerRuntime from "@/components/RAVINEPlayerRuntime";
import type { RAVINEWorkPlayerProps } from "@/components/RAVINEWorkPlayer";
import { isAudioMediaUrl, resolveWorkPlaybackUrl } from "@/lib/ravine-playback-core";

export default function RAVINEPodcastPlayer({ work, locale, chapters = [], assets = [] }: RAVINEWorkPlayerProps) {
  const mainAsset = assets.find((asset) => asset.kind === "main");
  const mainAudio = Boolean(mainAsset?.mime_type?.toLowerCase().startsWith("audio/")) || isAudioMediaUrl(work.mediaUrl);

  return (
    <RAVINEPlayerRuntime
      src={resolveWorkPlaybackUrl(work.id, work.mediaUrl, mainAsset?.mime_type)}
      poster={work.thumbnailUrl}
      title={work.title}
      contentType="podcast"
      audioOnly={mainAudio}
      duration={work.duration}
      locale={locale}
      chapters={chapters}
      assets={assets}
    />
  );
}
