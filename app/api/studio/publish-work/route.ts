import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedContentTypes = new Set(["short", "video", "podcast", "documentary", "short_film", "film", "series"]);
const allowedVisibility = new Set(["public", "followers", "unlisted", "private", "custom"]);

type Body = {
  videoId?: number;
  published?: boolean;
  visibility?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const videoId = Number(body.videoId);
    const published = body.published === true;

    if (!Number.isInteger(videoId) || videoId < 1) {
      return NextResponse.json({ error: "Invalid video id." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: work, error: workError } = await supabase
      .from("videos")
      .select("id,user_id,creator_id,title,description,video_url,content_type,quality,published,visibility,series_id,season_number,episode_number")
      .eq("id", videoId)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: workError?.message || "Work not found." }, { status: 404 });
    }

    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("id,user_id")
      .eq("id", work.creator_id)
      .maybeSingle();

    if (creatorError || !creator || creator.user_id !== auth.user.id) {
      return NextResponse.json({ error: "You are not allowed to change this work." }, { status: 403 });
    }

    if (!published) {
      const { data, error } = await supabase
        .from("videos")
        .update({ published: false })
        .eq("id", videoId)
        .select("id,title,description,content_type,quality,published,visibility,video_url,views,likes,created_at")
        .single();

      if (error || !data) return NextResponse.json({ error: error?.message || "Could not unpublish work." }, { status: 500 });

      if (work.content_type === "series" && work.series_id) {
        const { data: remainingEpisodes, error: remainingError } = await supabase
          .from("videos")
          .select("id")
          .eq("series_id", work.series_id)
          .eq("content_type", "series")
          .eq("published", true)
          .eq("visibility", "public")
          .limit(1);
        if (remainingError) return NextResponse.json({ error: remainingError.message }, { status: 500 });
        const { error: seriesUpdateError } = await supabase
          .from("ravine_series_titles")
          .update({ published: Boolean(remainingEpisodes?.length), updated_at: new Date().toISOString() })
          .eq("id", work.series_id)
          .eq("creator_id", creator.id);
        if (seriesUpdateError) return NextResponse.json({ error: seriesUpdateError.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, work: data });
    }

    const title = typeof work.title === "string" ? work.title.trim() : "";
    const description = typeof work.description === "string" ? work.description.trim() : "";
    const contentType = typeof work.content_type === "string" ? work.content_type : "video";
    const quality = typeof work.quality === "string" ? work.quality : "1080p";
    const visibility = typeof body.visibility === "string"
      ? body.visibility
      : typeof work.visibility === "string" ? work.visibility : "public";

    if (!title || !work.video_url) {
      return NextResponse.json({ error: "A title and media source are required before publishing." }, { status: 422 });
    }

    if (!allowedContentTypes.has(contentType)) {
      return NextResponse.json({ error: "This content type is not supported." }, { status: 422 });
    }

    if (contentType === "series") {
      if (!Number.isInteger(Number(work.series_id)) || Number(work.series_id) < 1 ||
          !Number.isInteger(Number(work.season_number)) || Number(work.season_number) < 1 ||
          !Number.isInteger(Number(work.episode_number)) || Number(work.episode_number) < 1) {
        return NextResponse.json({ error: "A series episode must have a series, season number, and episode number." }, { status: 422 });
      }
      const { data: seriesRecord, error: seriesLookupError } = await supabase
        .from("ravine_series_titles")
        .select("id")
        .eq("id", work.series_id)
        .eq("creator_id", creator.id)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (seriesLookupError || !seriesRecord) {
        return NextResponse.json({ error: seriesLookupError?.message || "Series ownership could not be verified." }, { status: 403 });
      }
    }

    if (!allowedVisibility.has(visibility)) {
      return NextResponse.json({ error: "This visibility mode is not supported." }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("videos")
      .update({
        published: true,
        title,
        description: description || null,
        content_type: contentType,
        quality,
        visibility,
      })
      .eq("id", videoId)
      .select("id,title,description,content_type,quality,published,visibility,video_url,views,likes,created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Could not publish work." }, { status: 500 });
    }

    if (contentType === "series" && visibility === "public" && work.series_id) {
      const { error: seriesUpdateError } = await supabase
        .from("ravine_series_titles")
        .update({ published: true, visibility: "public", updated_at: new Date().toISOString() })
        .eq("id", work.series_id)
        .eq("creator_id", creator.id);
      if (seriesUpdateError) return NextResponse.json({ error: seriesUpdateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, work: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected publishing error." },
      { status: 500 },
    );
  }
}
