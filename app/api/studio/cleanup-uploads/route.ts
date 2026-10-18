import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

function isCreatorUploadPublicId(value: unknown, creatorId: number) {
  if (typeof value !== "string" || value.length > 200) return false;
  return new RegExp(
    `^ravine/creators/${creatorId}/works/${creatorId}-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`,
    "i",
  ).test(value);
}

async function destroyUpload(publicId: string, cloudName: string, apiKey: string, apiSecret: string) {
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
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formData,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    },
  );
  const payload = await response.json().catch(() => ({})) as { result?: string; error?: unknown };
  return response.ok
    && (payload.result === "ok" || payload.result === "not found")
    && !payload.error;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as {
      creatorId?: number;
      publicIds?: unknown;
    } | null;

    const creatorId = Number(body?.creatorId);
    if (!Number.isSafeInteger(creatorId) || creatorId < 1 || !Array.isArray(body?.publicIds)) {
      return jsonError("Invalid cleanup request.", 400);
    }

    const publicIds = Array.from(new Set(body.publicIds));
    if (!publicIds.length || publicIds.length > 3 || !publicIds.every((id) => isCreatorUploadPublicId(id, creatorId))) {
      return jsonError("The requested media identifiers are not valid for this creator.", 400);
    }

    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return jsonError("Authentication required.", 401);

    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("id")
      .eq("id", creatorId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (creatorError || !creator) {
      return jsonError("Creator ownership could not be verified.", 403);
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return jsonError("Cloudinary cleanup is not configured.", 503);
    }

    // Rollback accepts only newly generated IDs, but syntax alone is not proof
    // that an ID is temporary. Refuse cleanup if any visible work or media
    // metadata already points at it. Complete every preflight before destroying
    // anything so a later referenced ID cannot leave a partially cleaned batch.
    const referenceChecks = await Promise.all((publicIds as string[]).map(async (publicId) => {
      const [videoReference, assetPublicIdReference, assetUrlReference] = await Promise.all([
        supabase.from("videos").select("id").ilike("video_url", `%${publicId}%`).limit(1),
        supabase.from("work_media_assets").select("id").eq("public_id", publicId).limit(1),
        supabase.from("work_media_assets").select("id").ilike("media_url", `%${publicId}%`).limit(1),
      ]);
      const queryFailed = Boolean(videoReference.error || assetPublicIdReference.error || assetUrlReference.error);
      const referenced = Boolean(videoReference.data?.length || assetPublicIdReference.data?.length || assetUrlReference.data?.length);
      return { queryFailed, referenced };
    }));

    if (referenceChecks.some((check) => check.queryFailed)) {
      return jsonError("Could not verify whether temporary media is already in use; no media was removed.", 503);
    }
    if (referenceChecks.some((check) => check.referenced)) {
      return jsonError("An upload is already attached to work metadata and cannot be removed by rollback.", 409);
    }

    for (const publicId of publicIds as string[]) {
      let removed = false;
      try {
        removed = await destroyUpload(publicId, cloudName, apiKey, apiSecret);
      } catch {
        removed = false;
      }
      if (!removed) {
        return jsonError("Some temporary media could not be cleaned up.", 502);
      }
    }

    return NextResponse.json(
      { ok: true, removed: publicIds.length },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return jsonError("Unexpected upload cleanup failure.", 500);
  }
}
