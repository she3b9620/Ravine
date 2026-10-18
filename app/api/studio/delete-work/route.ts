import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CLOUDINARY_HOST = "res.cloudinary.com";

function extractCloudinaryPublicId(videoUrl: string | null, cloudName: string) {
  if (!videoUrl || !cloudName) return null;

  try {
    const url = new URL(videoUrl);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== CLOUDINARY_HOST) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 4 || parts[0] !== cloudName || parts[1] !== "video" || parts[2] !== "upload") {
      return null;
    }

    const publicIdParts = parts.slice(3);
    while (publicIdParts.length) {
      const first = publicIdParts[0];
      if (/^v\d+$/.test(first) || first.includes(",") || /^(?:w|h|c|q|f|d|g|ar|br|fl|vc|so|du|ac|vs|eo|ki|pg|l|u|t)_/.test(first)) {
        publicIdParts.shift();
      } else {
        break;
      }
    }

    if (!publicIdParts.length) return null;
    const publicId = publicIdParts.join("/").replace(/\.[^.]+$/, "");
    return publicId && !publicId.startsWith("/") ? publicId : null;
  } catch {
    return null;
  }
}

function isCloudinaryUrl(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.toLowerCase() === CLOUDINARY_HOST;
  } catch {
    return false;
  }
}

async function destroyCloudinaryVideo(publicId: string, cloudName: string, apiKey: string, apiSecret: string) {
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

  const payload = await response.json().catch(() => ({})) as {
    result?: string;
    error?: { message?: string };
  };

  return response.ok && (!payload.result || payload.result === "ok" || payload.result === "not found") && !payload.error;
}

type CreatorOwnership = { user_id: string | null };
type WorkWithCreator = {
  id: number;
  creator_id: number | null;
  user_id: string | null;
  video_url: string | null;
  series_id: number | null;
  creators?: CreatorOwnership | CreatorOwnership[] | null;
};
type WorkMediaAsset = {
  id: number;
  work_id: number;
  media_url: string;
  public_id: string | null;
  kind: string;
};

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { videoId?: number } | null;
    const videoId = Number(body?.videoId);

    if (!Number.isSafeInteger(videoId) || videoId < 1) {
      return jsonError("Invalid work identifier.", 400);
    }

    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return jsonError("Authentication required.", 401);
    }

    const { data: rawWork, error: workError } = await supabase
      .from("videos")
      .select("id,creator_id,user_id,video_url,series_id,creators!inner(user_id)")
      .eq("id", videoId)
      .maybeSingle();

    if (workError || !rawWork) {
      return jsonError("Work not found.", 404);
    }

    const work = rawWork as unknown as WorkWithCreator;
    const creatorOwner = Array.isArray(work.creators)
      ? work.creators[0]?.user_id ?? null
      : work.creators?.user_id ?? null;
    const ownsViaCreator = creatorOwner === auth.user.id;
    const ownsViaWork = work.user_id === auth.user.id;

    if (!ownsViaCreator && !ownsViaWork) {
      return jsonError("You are not allowed to delete this work.", 403);
    }

    // Read related media only after ownership has been established. A query
    // failure must not turn into a partial deletion of the parent work.
    const { data: assetRows, error: assetsError } = await supabase
      .from("work_media_assets")
      .select("id,work_id,media_url,public_id,kind")
      .eq("work_id", videoId);

    if (assetsError) {
      return jsonError("Could not prepare the work's media cleanup.", 500);
    }

    const assets = (assetRows ?? []) as WorkMediaAsset[];
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || "";
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || "";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
    const mediaUrls = [work.video_url, ...assets.map((asset) => asset.media_url)];
    const hasCloudinaryMedia = mediaUrls.some(isCloudinaryUrl);

    if (hasCloudinaryMedia && (!cloudName || !apiKey || !apiSecret)) {
      return jsonError("Cloud media cleanup is unavailable; the work was not deleted.", 503);
    }

    const mainPublicId = extractCloudinaryPublicId(work.video_url, cloudName);
    const auxiliaryPublicIds = assets
      .filter((asset) => asset.kind !== "main")
      .map((asset) => extractCloudinaryPublicId(asset.media_url, cloudName))
      .filter((id): id is string => Boolean(id));

    const publicIds = Array.from(new Set([...auxiliaryPublicIds, mainPublicId].filter((id): id is string => Boolean(id))));

    // Remove trailers/previews first so the primary source remains available if
    // a secondary asset cannot be removed. Delete the database row only after
    // all RAVINE-owned Cloudinary media has been cleaned up successfully.
    for (const publicId of publicIds) {
      let destroyed = false;
      try {
        destroyed = await destroyCloudinaryVideo(publicId, cloudName, apiKey, apiSecret);
      } catch {
        destroyed = false;
      }
      if (!destroyed) {
        return jsonError("Could not remove every media asset; the work was not deleted.", 502);
      }
    }

    const { error: deleteError } = await supabase
      .from("videos")
      .delete()
      .eq("id", videoId);

    if (deleteError) {
      return jsonError("The work record could not be deleted.", 500);
    }

    // When a deleted episode was the last public episode, keep its series
    // title out of the public catalogue. This sync is best-effort after deletion.
    const seriesId = Number(work.series_id);
    if (Number.isSafeInteger(seriesId) && seriesId > 0) {
      const { data: remainingEpisodes, error: remainingError } = await supabase
        .from("videos")
        .select("id")
        .eq("series_id", seriesId)
        .eq("content_type", "series")
        .eq("published", true)
        .eq("visibility", "public")
        .limit(1);

      if (!remainingError) {
        const { error: seriesUpdateError } = await supabase
          .from("ravine_series_titles")
          .update({
            published: Boolean(remainingEpisodes?.length),
            updated_at: new Date().toISOString(),
          })
          .eq("id", seriesId)
          .eq("user_id", auth.user.id);

        if (seriesUpdateError) {
          console.error("RAVINE could not sync series visibility after deleting an episode.");
        }
      } else {
        console.error("RAVINE could not check remaining public episodes after deletion.");
      }
    }

    return NextResponse.json({ ok: true }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return jsonError("Unexpected work deletion failure.", 500);
  }
}
