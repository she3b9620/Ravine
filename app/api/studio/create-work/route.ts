import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CONTENT_TYPES = new Set(["short", "video", "podcast", "documentary", "short_film", "film", "series"]);
const VISIBILITY = new Set(["public", "followers", "unlisted", "private", "custom"]);
const QUALITY = new Set(["1080p", "2k", "4k", "1440p", "2160p"]);

type Body = {
  creatorId?: number;
  title?: string;
  description?: string | null;
  videoUrl?: string;
  duration?: number | null;
  contentType?: string;
  quality?: string;
  visibility?: string;
  seriesId?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  aspectRatio?: string;
  mediaAssets?: Array<{
    kind: "main" | "trailer" | "preview";
    mediaUrl?: string | null;
    publicId?: string | null;
    duration?: number | null;
    mimeType?: string | null;
    sortOrder?: number;
  }>;
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const creatorId = Number(body.creatorId);
    const title = cleanText(body.title, 160);
    const description = cleanText(body.description, 5000);
    const contentType = cleanText(body.contentType, 32) || "video";
    const quality = cleanText(body.quality, 16) || "1080p";
    const visibility = cleanText(body.visibility, 32) || "public";
    const videoUrl = cleanText(body.videoUrl, 2000);

    if (!Number.isInteger(creatorId) || creatorId < 1 || !title || !videoUrl) {
      return NextResponse.json({ error: "A creator, title, and media source are required." }, { status: 400 });
    }
    if (!CONTENT_TYPES.has(contentType)) return NextResponse.json({ error: "RAVINE_INVALID_CONTENT_TYPE" }, { status: 422 });
    if (!VISIBILITY.has(visibility)) return NextResponse.json({ error: "Invalid visibility." }, { status: 422 });
    if (!QUALITY.has(quality)) return NextResponse.json({ error: "Invalid quality." }, { status: 422 });
    if (!/^https:\/\//i.test(videoUrl)) return NextResponse.json({ error: "Media URL must use HTTPS." }, { status: 422 });

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "RAVINE_AUTH_REQUIRED" }, { status: 401 });

    const { data: creator } = await supabase.from("creators").select("id").eq("id", creatorId).eq("user_id", auth.user.id).maybeSingle();
    if (!creator) return NextResponse.json({ error: "RAVINE_UPLOAD_OWNER_MISMATCH" }, { status: 403 });

    if (contentType === "series") {
      const seriesId = Number(body.seriesId);
      const seasonNumber = Number(body.seasonNumber);
      const episodeNumber = Number(body.episodeNumber);
      if (!Number.isInteger(seriesId) || seriesId < 1 || !Number.isInteger(seasonNumber) || seasonNumber < 1 || !Number.isInteger(episodeNumber) || episodeNumber < 1) {
        return NextResponse.json({ error: "RAVINE_SERIES_EPISODE_METADATA_REQUIRED" }, { status: 422 });
      }
      const { data: series } = await supabase.from("ravine_series_titles").select("id").eq("id", seriesId).eq("creator_id", creatorId).eq("user_id", auth.user.id).maybeSingle();
      if (!series) return NextResponse.json({ error: "RAVINE_SERIES_OWNER_MISMATCH" }, { status: 403 });
    }

    const { data: work, error: insertError } = await supabase.from("videos").insert({
      creator_id: creatorId,
      user_id: auth.user.id,
      title,
      description: description || null,
      video_url: videoUrl,
      duration: typeof body.duration === "number" ? body.duration : null,
      published: false,
      visibility,
      content_type: contentType,
      ...(contentType === "series" ? { series_id: Number(body.seriesId), season_number: Number(body.seasonNumber), episode_number: Number(body.episodeNumber) } : {}),
      aspect_ratio: body.aspectRatio === "9:16" ? "9:16" : "16:9",
      quality,
      is_creator_content: true,
      views: 0,
      likes: 0,
    }).select("id").single();

    if (insertError || !work) return NextResponse.json({ error: insertError?.message || "Could not create the work." }, { status: 500 });

    const assets = (body.mediaAssets || []).filter((asset) => asset.mediaUrl).map((asset, index) => ({
      work_id: work.id,
      kind: asset.kind,
      media_url: asset.mediaUrl || null,
      public_id: asset.publicId || null,
      duration: typeof asset.duration === "number" ? asset.duration : null,
      mime_type: asset.mimeType || null,
      sort_order: Number.isInteger(asset.sortOrder) ? asset.sortOrder : index,
    }));
    if (assets.length) {
      const { error: assetsError } = await supabase.from("work_media_assets").insert(assets);
      if (assetsError) {
        await supabase.from("videos").delete().eq("id", work.id).eq("user_id", auth.user.id);
        return NextResponse.json({ error: assetsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, workId: work.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected work creation error." }, { status: 500 });
  }
}
