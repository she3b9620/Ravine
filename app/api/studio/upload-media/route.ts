import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function signature(params: Record<string, string>, secret: string) {
  const body = Object.entries(params)
    .filter(([, value]) => value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${body}${secret}`).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "RAVINE_AUTH_REQUIRED" }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    const creatorId = Number(form.get("creatorId"));
    if (!(file instanceof File) || file.size < 1) return NextResponse.json({ error: "A media file is required." }, { status: 400 });
    if (!Number.isInteger(creatorId) || creatorId < 1) return NextResponse.json({ error: "Invalid creator identity." }, { status: 400 });
    if (file.size > 500 * 1024 * 1024) return NextResponse.json({ error: "Media file exceeds the 500MB limit." }, { status: 413 });

    const { data: creator } = await supabase.from("creators").select("id").eq("id", creatorId).eq("user_id", auth.user.id).maybeSingle();
    if (!creator) return NextResponse.json({ error: "RAVINE_UPLOAD_OWNER_MISMATCH" }, { status: 403 });

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Media upload is not configured." }, { status: 503 });

    const timestamp = String(Math.floor(Date.now() / 1000));
    const upload = new FormData();
    upload.append("file", file);
    upload.append("api_key", apiKey);
    upload.append("timestamp", timestamp);
    upload.append("folder", `ravine/${auth.user.id}`);
    upload.append("signature", signature({ folder: `ravine/${auth.user.id}`, timestamp }, apiSecret));

    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`, { method: "POST", body: upload });
    const payload = await response.json() as { secure_url?: string; public_id?: string; duration?: number; error?: { message?: string } };
    if (!response.ok || !payload.secure_url) return NextResponse.json({ error: payload.error?.message || "Media upload failed." }, { status: 502 });
    return NextResponse.json({ secure_url: payload.secure_url, public_id: payload.public_id, duration: payload.duration, resource_type: "video" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected upload error." }, { status: 500 });
  }
}
