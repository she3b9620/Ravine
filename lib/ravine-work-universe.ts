export const RAVINE_WORK_TYPES = [
  "short",
  "video",
  "film",
  "documentary",
  "podcast",
  "live",
] as const;

export type RAVINEWorkType = (typeof RAVINE_WORK_TYPES)[number];

export type RAVINEWorkAccess = "public" | "followers" | "members" | "tier" | "invite_only";

export type RAVINEWork = {
  id: number;
  title: string;
  description: string;
  type: RAVINEWorkType;
  creatorId: number | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  duration: number | null;
  published: boolean;
  visibility: string;
  discoveryEnabled: boolean;
  access: RAVINEWorkAccess;
};

export type RAVINEWorkSource = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  content_type: string | null;
  published: boolean;
  visibility?: string | null;
  discovery_enabled?: boolean | null;
  creator_id: number | null;
};

export function normalizeRAVINEWorkType(value: string | null | undefined): RAVINEWorkType {
  if (value === "short") return "short";
  if (value === "film") return "film";
  if (value === "documentary") return "documentary";
  if (value === "podcast") return "podcast";
  if (value === "live") return "live";
  return "video";
}

export function toRAVINEWork(source: RAVINEWorkSource, access: RAVINEWorkAccess = "public"): RAVINEWork {
  return {
    id: source.id,
    title: source.title || "Untitled",
    description: source.description || "",
    type: normalizeRAVINEWorkType(source.content_type),
    creatorId: source.creator_id ?? null,
    thumbnailUrl: source.thumbnail_url ?? null,
    mediaUrl: source.video_url ?? null,
    duration: source.duration ?? null,
    published: source.published === true,
    visibility: source.visibility || "public",
    discoveryEnabled: source.discovery_enabled !== false,
    access,
  };
}

export function isPlayableRAVINEWork(work: RAVINEWork) {
  return work.published && work.visibility === "public" && work.discoveryEnabled && Boolean(work.mediaUrl);
}
