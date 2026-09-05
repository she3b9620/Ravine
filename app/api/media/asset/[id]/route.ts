import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseStorageUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || url.origin !== new URL(supabaseUrl).origin) return null;

    const markers = [
      "/storage/v1/object/public/",
      "/storage/v1/object/sign/",
    ];

    const marker = markers.find((item) => url.pathname.includes(item));
    if (!marker) return null;

    const index = url.pathname.indexOf(marker);
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
  const assetId = Number(id);

  if (!Number.isInteger(assetId) || assetId < 1) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data: asset, error } = await supabase
    .from("work_media_assets")
    .select("media_url,work_id,kind")
    .eq("id", assetId)
    .maybeSingle();

  if (error || !asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: work, error: workError } = await supabase
    .from("videos")
    .select("published,visibility,discovery_enabled")
    .eq("id", asset.work_id)
    .maybeSingle();

  if (
    workError ||
    !work ||
    work.published !== true ||
    work.visibility !== "public" ||
    work.discovery_enabled === false
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const storagePath = parseStorageUrl(asset.media_url);
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
