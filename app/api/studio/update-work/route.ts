import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CONTENT_TYPES = new Set(["short", "video", "podcast", "documentary", "short_film", "film", "series"]);
const VISIBILITY = new Set(["public", "followers", "unlisted", "private", "custom"]);
const QUALITY = new Set(["1080p", "2k", "4k", "1440p", "2160p"]);

type Body = { videoId?: number; title?: string; description?: string | null; contentType?: string; quality?: string; visibility?: string };

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const videoId = Number(body.videoId);
    const title = text(body.title, 160);
    const description = text(body.description, 5000);
    const contentType = text(body.contentType, 32);
    const quality = text(body.quality, 16);
    const visibility = text(body.visibility, 32);

    if (!Number.isInteger(videoId) || videoId < 1 || !title) {
      return NextResponse.json({ error: "RAVINE_INVALID_WORK_UPDATE" }, { status: 400 });
    }
    if (!CONTENT_TYPES.has(contentType) || !QUALITY.has(quality) || !VISIBILITY.has(visibility)) {
      return NextResponse.json({ error: "RAVINE_INVALID_WORK_METADATA" }, { status: 422 });
    }

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "RAVINE_AUTH_REQUIRED" }, { status: 401 });

    const { data: work } = await supabase.from("videos").select("id").eq("id", videoId).eq("user_id", auth.user.id).maybeSingle();
    if (!work) return NextResponse.json({ error: "RAVINE_WORK_OWNER_MISMATCH" }, { status: 403 });

    const { data, error } = await supabase
      .from("videos")
      .update({ title, description: description || null, content_type: contentType, quality, visibility })
      .eq("id", videoId)
      .eq("user_id", auth.user.id)
      .select("id,title,description,content_type,quality,published,visibility,video_url,views,likes,created_at")
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message || "RAVINE_WORK_UPDATE_FAILED" }, { status: 500 });
    return NextResponse.json({ ok: true, work: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "RAVINE_WORK_UPDATE_FAILED" }, { status: 500 });
  }
}
