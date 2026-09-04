import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedContentTypes = new Set(["video", "short", "documentary", "podcast", "film"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { videoId?: number; published?: boolean };
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
      .select("id,user_id,creator_id,title,description,video_url,content_type,quality,published")
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
        .select("id,title,description,content_type,quality,published,video_url,views,likes,created_at")
        .single();

      if (error || !data) return NextResponse.json({ error: error?.message || "Could not unpublish work." }, { status: 500 });
      return NextResponse.json({ ok: true, work: data });
    }

    const title = typeof work.title === "string" ? work.title.trim() : "";
    const description = typeof work.description === "string" ? work.description.trim() : "";
    const contentType = typeof work.content_type === "string" ? work.content_type : "video";
    const quality = typeof work.quality === "string" ? work.quality : "1080p";

    if (!title || !work.video_url) {
      return NextResponse.json({ error: "A title and media source are required before publishing." }, { status: 422 });
    }

    if (!allowedContentTypes.has(contentType)) {
      return NextResponse.json({ error: "This content type is not supported." }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("videos")
      .update({
        published: true,
        title,
        description: description || null,
        content_type: contentType,
        quality,
      })
      .eq("id", videoId)
      .select("id,title,description,content_type,quality,published,video_url,views,likes,created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Could not publish work." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, work: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected publishing error." },
      { status: 500 },
    );
  }
}
