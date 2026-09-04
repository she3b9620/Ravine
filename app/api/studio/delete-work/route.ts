import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function extractCloudinaryPublicId(videoUrl: string) {
  try {
    const url = new URL(videoUrl);
    const marker = "/upload/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;

    const remainder = url.pathname.slice(index + marker.length).replace(/^\/+/, "");
    const parts = remainder.split("/").filter(Boolean);
    while (parts.length && (/^v\d+$/.test(parts[0]) || parts[0].includes("_"))) {
      parts.shift();
    }
    if (!parts.length) return null;

    const filename = parts.join("/");
    return filename.replace(/\.[^.]+$/, "");
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { videoId?: number };
    const videoId = Number(body.videoId);
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
      .select("id,user_id,video_url")
      .eq("id", videoId)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: workError?.message || "Work not found." }, { status: 404 });
    }

    if (work.user_id !== auth.user.id) {
      return NextResponse.json({ error: "You are not allowed to delete this work." }, { status: 403 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (work.video_url?.includes("res.cloudinary.com/") && cloudName && apiKey && apiSecret) {
      const publicId = extractCloudinaryPublicId(work.video_url);
      if (publicId) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = createHash("sha1")
          .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
          .digest("hex");

        const formData = new URLSearchParams({
          public_id: publicId,
          timestamp,
          api_key: apiKey,
          signature,
        });

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/destroy`,
          { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: formData },
        );
        const payload = await response.json() as { result?: string; error?: { message?: string } };
        if (!response.ok || (payload.result && payload.result !== "ok" && payload.result !== "not found")) {
          return NextResponse.json({ error: payload.error?.message || "Cloudinary deletion failed." }, { status: 502 });
        }
      }
    }

    const { error: deleteError } = await supabase.from("videos").delete().eq("id", videoId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected deletion error." },
      { status: 500 },
    );
  }
}
