export type RAVINEPlayerKind = "short" | "video" | "podcast" | "documentary";

export type RAVINEPlaybackAsset = {
  id: number;
  kind: string;
  media_url: string;
  duration: number | null;
  label: string | null;
  language: string | null;
  mime_type: string | null;
};

export function getRAVINEPlayerKind(contentType: string | null | undefined): RAVINEPlayerKind {
  if (contentType === "short") return "short";
  if (contentType === "podcast") return "podcast";
  if (contentType === "documentary") return "documentary";
  return "video";
}

export function isYouTubeUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

export function isSupabaseVideoStorageUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.pathname.includes("/storage/v1/object/public/videos/") || url.pathname.includes("/storage/v1/object/sign/videos/");
  } catch {
    return false;
  }
}

export function isCloudinaryVideoUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase().endsWith("res.cloudinary.com") && url.pathname.includes("/video/upload/");
  } catch {
    return false;
  }
}

export function toCloudinaryBrowserVideoUrl(value: string | null | undefined) {
  if (!value || !isCloudinaryVideoUrl(value)) return value ?? null;

  try {
    const url = new URL(value);
    if (/\.(m3u8|mpd)$/i.test(url.pathname)) return url.toString();
    if (url.pathname.includes("/f_mp4,vc_h264/")) return url.toString();

    const marker = "/video/upload/";
    const index = url.pathname.indexOf(marker);
    if (index < 0) return url.toString();

    const before = url.pathname.slice(0, index + marker.length);
    const after = url.pathname.slice(index + marker.length);
    if (!after) return url.toString();

    const hasExtension = /\.[a-z0-9]+$/i.test(after);
    const transformed = hasExtension ? after.replace(/\.[a-z0-9]+$/i, ".mp4") : `${after}.mp4`;
    url.pathname = `${before}f_mp4,vc_h264/${transformed}`;
    return url.toString();
  } catch {
    return value;
  }
}

export function resolveWorkPlaybackUrl(workId: number, value: string | null | undefined) {
  if (!value || isYouTubeUrl(value)) return null;
  if (isSupabaseVideoStorageUrl(value)) return `/api/media/video/${workId}`;
  return toCloudinaryBrowserVideoUrl(value);
}

export function resolveAssetPlaybackUrl(asset: RAVINEPlaybackAsset) {
  if (!asset.media_url || isYouTubeUrl(asset.media_url)) return null;
  if (isSupabaseVideoStorageUrl(asset.media_url)) return `/api/media/asset/${asset.id}`;
  return toCloudinaryBrowserVideoUrl(asset.media_url);
}

export function formatRAVINETime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const total = Math.max(0, Math.floor(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}
