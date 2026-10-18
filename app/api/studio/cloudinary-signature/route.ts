import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignatureRequest = { creatorId?: number };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as SignatureRequest | null;
    const creatorId = Number(body?.creatorId);
    if (!Number.isSafeInteger(creatorId) || creatorId < 1) {
      return jsonError("Invalid creator identity.", 400);
    }

    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return jsonError("RAVINE_AUTH_REQUIRED", 401);
    }

    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("id,user_id")
      .eq("id", creatorId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (creatorError) return jsonError("Could not verify creator ownership.", 500);
    if (!creator) return jsonError("RAVINE_UPLOAD_OWNER_MISMATCH", 403);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return jsonError("RAVINE_CLOUDINARY_NOT_CONFIGURED", 503);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `ravine/creators/${creator.id}/works`;
    const publicId = `${creator.id}-${randomUUID()}`;
    const signedParameters = {
      folder,
      overwrite: "false",
      public_id: publicId,
      timestamp: String(timestamp),
    };
    const signatureBase = Object.entries(signedParameters)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    const signature = createHash("sha1")
      .update(`${signatureBase}${apiSecret}`)
      .digest("hex");

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      publicId,
      overwrite: "false",
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Pragma": "no-cache",
      },
    });
  } catch {
    return jsonError("Could not prepare the Cloudinary upload.", 500);
  }
}
