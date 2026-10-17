import { createClient } from "@/lib/supabase/server";

export type RAVINEFilmFormat = "short_film" | "feature_film";

export type RAVINEFilmCollectionItem = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  content_type: string | null;
  work_format: string | null;
  quality: string | null;
  creator_id: number | null;
  visibility: string | null;
  discovery_enabled: boolean | null;
  created_at: string | null;
};

export type RAVINEFilmCollectionResult = {
  items: RAVINEFilmCollectionItem[];
  schemaReady: boolean;
  unclassifiedCount: number;
  loadError: boolean;
};

const FILM_SELECT =
  "id,title,description,thumbnail_url,video_url,duration,views,likes,content_type,work_format,quality,creator_id,visibility,discovery_enabled,created_at";
const LEGACY_FILM_SELECT =
  "id,title,description,thumbnail_url,video_url,duration,views,likes,content_type,quality,creator_id,visibility,discovery_enabled,created_at";

export async function getRAVINEFilmCollection(
  format: RAVINEFilmFormat,
): Promise<RAVINEFilmCollectionResult> {
  const supabase = await createClient();
  const result = await supabase
    .from("videos")
    .select(FILM_SELECT)
    .eq("published", true)
    .eq("content_type", "film")
    .eq("visibility", "public")
    .eq("discovery_enabled", true)
    .order("created_at", { ascending: false })
    .limit(120);

  if (result.error) {
    // Preview/production may still be using the pre-bridge schema. Never fail the
    // whole page just because the staged work_format column is not installed yet.
    if (result.error.message.toLowerCase().includes("work_format")) {
      const legacy = await supabase
        .from("videos")
        .select(LEGACY_FILM_SELECT)
        .eq("published", true)
        .eq("content_type", "film")
        .eq("visibility", "public")
        .eq("discovery_enabled", true)
        .order("created_at", { ascending: false })
        .limit(120);

      if (legacy.error) {
        return { items: [], schemaReady: false, unclassifiedCount: 0, loadError: true };
      }

      return {
        items: [],
        schemaReady: false,
        unclassifiedCount: (legacy.data ?? []).length,
        loadError: false,
      };
    }

    return { items: [], schemaReady: false, unclassifiedCount: 0, loadError: true };
  }

  const records = (result.data ?? []) as unknown as RAVINEFilmCollectionItem[];
  const items = records.filter((item) => item.work_format === format);
  const unclassifiedCount = records.filter(
    (item) => item.work_format !== "short_film" && item.work_format !== "feature_film",
  ).length;

  return { items, schemaReady: true, unclassifiedCount, loadError: false };
}
