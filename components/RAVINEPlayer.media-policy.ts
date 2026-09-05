export type RAVINEAuxiliaryAsset = {
  id: number;
  kind: string;
  media_url: string;
};

export function isYouTubeUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

export function toRAVINEAuxiliarySrc(asset: RAVINEAuxiliaryAsset | undefined) {
  if (!asset?.media_url || isYouTubeUrl(asset.media_url)) return null;
  try {
    const url = new URL(asset.media_url);
    if (url.pathname.includes("/storage/v1/object/public/videos/") || url.pathname.includes("/storage/v1/object/sign/videos/")) {
      return `/api/media/asset/${asset.id}`;
    }
  } catch {
    return null;
  }
  return null;
}
