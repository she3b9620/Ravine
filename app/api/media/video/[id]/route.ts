import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseStorageUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || url.origin !== new URL(supabaseUrl).origin) return null;
    const marker = "/storage/v1/object/public/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    const remainder = url.pathname.slice(index + marker.length).replace(/^\/+/, "");
    const [bucket, ...parts] = remainder.split("/");
    if (bucket !== "videos" || parts.length === 0) return null;
    return parts.join("/");
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const videoId = Number(id);
  if (!Number.isInteger(videoId) || videoId < 1) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data: video, error } = await supabase
    .from("videos")
    .select("video_url,published,visibility,discovery_enabled")
    .eq("id", videoId)
    .maybeSingle();

  if (error || !video || video.published !== true || video.visibility !== "public" || video.discovery_enabled === false) {
    return new NextResponse("Not found", { status: 404 });
  }

  const storagePath = parseStorageUrl(video.video_url);
  if (!storagePath) {
    return new NextResponse("No RAVINE-hosted media", { status: 404 });
  }

  const { data, error: signedError } = await supabase.storage
    .from("videos")
    .createSignedUrl(storagePath, 60 * 60);

  if (signedError || !data?.signedUrl) {
    return new NextResponse("Media unavailable", { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, 302);
}
