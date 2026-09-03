import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function extractStoragePath(videoUrl: string | null) {
  if (!videoUrl) return null;
  const marker = "/storage/v1/object/public/videos/";
  const index = videoUrl.indexOf(marker);
  if (index !== -1) {
    try {
      return decodeURIComponent(videoUrl.slice(index + marker.length));
    } catch {
      return videoUrl.slice(index + marker.length);
    }
  }
  if (!videoUrl.startsWith("http://") && !videoUrl.startsWith("https://")) {
    return videoUrl.replace(/^\/+/, "");
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const videoId = Number(id);

  if (!Number.isInteger(videoId) || videoId <= 0) {
    return NextResponse.json({ error: "Invalid video id." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Video service is not configured." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id,video_url,published")
    .eq("id", videoId)
    .eq("published", true)
    .maybeSingle();

  if (videoError) {
    return NextResponse.json({ error: "Unable to load video." }, { status: 500 });
  }

  if (!video?.video_url) {
    return NextResponse.json({ error: "Video file is unavailable." }, { status: 404 });
  }

  const storagePath = extractStoragePath(video.video_url);
  if (!storagePath) {
    return NextResponse.json({ error: "Video file is unavailable." }, { status: 404 });
  }

  const { data, error: signedError } = await supabase.storage
    .from("videos")
    .createSignedUrl(storagePath, 60 * 60);

  if (signedError || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to create secure video URL." }, { status: 502 });
  }

  return NextResponse.json(
    { signedUrl: data.signedUrl },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
