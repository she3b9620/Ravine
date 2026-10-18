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
      .select("id,user_id,creator_id,title,description,video_url,content_type,quality,published,visibility")
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

      if (work.content_type === "series") {
        const { data: seriesMeta, error: seriesMetaError } = await supabase
          .from("videos")
          .select("series_id")
          .eq("id", videoId)
          .maybeSingle();
        // Old series records remain manageable before the structured-series migration is applied.
        if (!seriesMetaError && seriesMeta?.series_id) {
          const { data: remainingEpisodes, error: remainingError } = await supabase
            .from("videos")
            .select("id")
            .eq("series_id", seriesMeta.series_id)
            .eq("content_type", "series")
            .eq("published", true)
            .eq("visibility", "public")
            .limit(1);
          if (remainingError) return NextResponse.json({ error: remainingError.message }, { status: 500 });
          const { error: seriesUpdateError } = await supabase
            .from("ravine_series_titles")
            .update({ published: Boolean(remainingEpisodes?.length), updated_at: new Date().toISOString() })
            .eq("id", seriesMeta.series_id)
            .eq("creator_id", creator.id);
          if (seriesUpdateError) return NextResponse.json({ error: seriesUpdateError.message }, { status: 500 });
        }
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

    let seriesIdForPublish: number | null = null;
    if (contentType === "series") {
      const { data: seriesMeta, error: seriesMetaError } = await supabase
        .from("videos")
        .select("series_id,season_number,episode_number")
        .eq("id", videoId)
        .maybeSingle();
      if (seriesMetaError) {
        return NextResponse.json({ error: "Structured series support requires the RAVINE series database migration." }, { status: 503 });
      }
      seriesIdForPublish = Number(seriesMeta?.series_id);
      const seasonNumber = Number(seriesMeta?.season_number);
      const episodeNumber = Number(seriesMeta?.episode_number);
      if (!Number.isInteger(seriesIdForPublish) || seriesIdForPublish < 1 ||
          !Number.isInteger(seasonNumber) || seasonNumber < 1 ||
          !Number.isInteger(episodeNumber) || episodeNumber < 1) {
        return NextResponse.json({ error: "A series episode must have a series, season number, and episode number." }, { status: 422 });
      }
      const { data: seriesRecord, error: seriesLookupError } = await supabase
        .from("ravine_series_titles")
        .select("id")
        .eq("id", seriesIdForPublish)
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

    if (contentType === "series" && seriesIdForPublish) {
      // Keep the public series card in sync when an episode is published or
      // its visibility changes. One private episode must not expose an
      // otherwise empty series page, and another public episode must keep it live.
      const { data: remainingPublicEpisodes, error: publicEpisodesError } = await supabase
        .from("videos")
        .select("id")
        .eq("series_id", seriesIdForPublish)
        .eq("content_type", "series")
        .eq("published", true)
        .eq("visibility", "public")
        .limit(1);

      if (publicEpisodesError) {
        await supabase.from("videos").update({
          published: Boolean(work.published),
          title: work.title,
          description: work.description,
          content_type: work.content_type,
          quality: work.quality,
          visibility: work.visibility || "public",
        }).eq("id", videoId);
        return NextResponse.json(
          { error: "Could not verify public episodes; the publishing change could not be confirmed." },
          { status: 503 },
        );
      }

      const seriesIsPublic = Boolean(remainingPublicEpisodes?.length);
      const { error: seriesUpdateError } = await supabase
        .from("ravine_series_titles")
        .update({
          published: seriesIsPublic,
          ...(seriesIsPublic ? { visibility: "public" } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", seriesIdForPublish)
        .eq("creator_id", creator.id)
        .eq("user_id", auth.user.id);

      if (seriesUpdateError) {
        await supabase.from("videos").update({
          published: Boolean(work.published),
          title: work.title,
          description: work.description,
          content_type: work.content_type,
          quality: work.quality,
          visibility: work.visibility || "public",
        }).eq("id", videoId);
        return NextResponse.json(
          { error: "Could not synchronize series visibility; the publishing change could not be confirmed." },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({ ok: true, work: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected publishing error." },
      { status: 500 },
    );
  }
}
