const VIDEO_MIME_TYPES = new Set(["video/mp4","video/webm","video/quicktime","video/x-matroska"]);
const AUDIO_MIME_TYPES = new Set(["audio/mpeg","audio/mp4","audio/wav","audio/x-wav","audio/ogg","audio/aac","audio/x-m4a"]);
const VIDEO_EXTENSIONS = new Set(["mp4","webm","mov","mkv"]);
const AUDIO_EXTENSIONS = new Set(["mp3","m4a","mp4","wav","ogg","aac","oga"]);

export function classifyRavineMediaFile(file) {
  if (!file || typeof file.name !== "string" || !file.name.trim()) return null;
  const mime = String(file.type || "").trim().toLowerCase();
  const match = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
  const extension = match?.[1] || "";
  const allowedVideoExtension = VIDEO_EXTENSIONS.has(extension);
  const allowedAudioExtension = AUDIO_EXTENSIONS.has(extension);
  if (VIDEO_MIME_TYPES.has(mime)) return !extension || allowedVideoExtension ? "video" : null;
  if (AUDIO_MIME_TYPES.has(mime)) return !extension || allowedAudioExtension ? "audio" : null;
  if (!mime || mime === "application/octet-stream") {
    if (allowedVideoExtension) return "video";
    if (allowedAudioExtension) return "audio";
  }
  return null;
}
export function isAllowedRavineMediaFile(file, allowAudio = false) {
  const kind = classifyRavineMediaFile(file);
  return kind === "video" || (allowAudio && kind === "audio");
}
