"use client";

import RAVINEPlayerRuntime from "@/components/RAVINEPlayerRuntime";
import type { RAVINEWorkPlayerProps } from "@/components/RAVINEWorkPlayer";
import { resolveWorkPlaybackUrl } from "@/lib/ravine-playback-core";

export default function RAVINEVideoPlayer({ work, locale, chapters = [], assets = [] }: RAVINEWorkPlayerProps) {
  return (
    <RAVINEPlayerRuntime
      src={resolveWorkPlaybackUrl(work.id, work.mediaUrl)}
      poster={work.thumbnailUrl}
      title={work.title}
      contentType={work.type === "film" ? "video" : work.type}
      duration={work.duration}
      locale={locale}
      chapters={chapters}
      assets={assets}
    />
  );
}
