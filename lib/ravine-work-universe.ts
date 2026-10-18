export const RAVINE_WORK_TYPES = [
  "short",
  "short_film",
  "video",
  "film",
  "series",
  "documentary",
  "podcast",
  "live",
] as const;

export type RAVINEWorkType = (typeof RAVINE_WORK_TYPES)[number];

export type RAVINEWorkAccess = "public" | "unlisted" | "followers" | "members" | "tier" | "invite_only" | "private" | "custom";

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
  if (value === "short_film") return "short_film";
  if (value === "film") return "film";
  if (value === "series") return "series";
  if (value === "documentary") return "documentary";
  if (value === "podcast") return "podcast";
  if (value === "live") return "live";
  return "video";
}

function normalizeRAVINEWorkAccess(value: string | null | undefined): RAVINEWorkAccess {
  const normalized = (value || "public").trim().toLowerCase();
  if (["public", "unlisted", "followers", "members", "tier", "invite_only", "private", "custom"].includes(normalized)) {
    return normalized as RAVINEWorkAccess;
  }
  return "private";
}

export function toRAVINEWork(source: RAVINEWorkSource, access?: RAVINEWorkAccess): RAVINEWork {
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
    access: access ?? normalizeRAVINEWorkAccess(source.visibility),
  };
}

export function isPlayableRAVINEWork(work: RAVINEWork) {
  // Access and discovery are enforced separately; an authorized owner preview,
  // unlisted link, or follower-only work can play even when it is not discoverable.
  return Boolean(work.mediaUrl);
}
