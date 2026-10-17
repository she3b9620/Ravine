import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const contentTypes = new Set([
  "short",
  "video",
  "podcast",
  "documentary",
  "short_film",
  "feature_film",
]);
const visibilityModes = new Set([
  "public",
  "followers",
  "members",
  "tier",
  "invite_only",
  "private",
]);

type PublishBody = {
  workId?: number | null;
  creatorIdentityId?: number;
  title?: string;
  description?: string | null;
  workType?: string;
  primaryMediaUrl?: string;
  visibility?: string;
  posterUrl?: string | null;
};

function rpcStatus(message: string) {
  if (message.includes("RAVINE_AUTH_REQUIRED")) return 401;
  if (message.includes("RAVINE_CREATOR_IDENTITY_NOT_OWNED") || message.includes("RAVINE_WORK_NOT_OWNED") || message.includes("RAVINE_TIER_RESTRICTED")) return 403;
  if (message.includes("RAVINE_MONTHLY_QUOTA_REACHED")) return 429;
  if (message.includes("RAVINE_INVALID_") || message.includes("RAVINE_MEDIA_REQUIRED")) return 422;
  return 500;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PublishBody;
    const creatorIdentityId = Number(body.creatorIdentityId);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const workType = typeof body.workType === "string" ? body.workType : "";
    const primaryMediaUrl = typeof body.primaryMediaUrl === "string" ? body.primaryMediaUrl.trim() : "";
    const visibility = typeof body.visibility === "string" ? body.visibility : "public";
    const workId = body.workId == null ? null : Number(body.workId);

    if (!Number.isInteger(creatorIdentityId) || creatorIdentityId < 1) {
      return NextResponse.json({ error: "A valid creator identity is required." }, { status: 400 });
    }
    if (workId !== null && (!Number.isInteger(workId) || workId < 1)) {
      return NextResponse.json({ error: "Invalid work id." }, { status: 400 });
    }
    if (!title || title.length > 200 || !contentTypes.has(workType)) {
      return NextResponse.json({ error: "A title and supported work type are required." }, { status: 422 });
    }
    if (!primaryMediaUrl || primaryMediaUrl.length > 4096) {
      return NextResponse.json({ error: "A media URL is required." }, { status: 422 });
    }
    if (!visibilityModes.has(visibility)) {
      return NextResponse.json({ error: "Unsupported visibility mode." }, { status: 422 });
    }

    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("ravine_publish_creator_work", {
      p_work_id: workId,
      p_creator_identity_id: creatorIdentityId,
      p_title: title,
      p_description: typeof body.description === "string" ? body.description.slice(0, 20000) : null,
      p_work_type: workType,
      p_primary_media_url: primaryMediaUrl,
      p_visibility: visibility,
      p_poster_url: typeof body.posterUrl === "string" ? body.posterUrl.slice(0, 4096) : null,
    });

    if (error) {
      const status = rpcStatus(error.message || "");
      return NextResponse.json(
        { error: status === 500 ? "Could not publish work." : error.message },
        { status },
      );
    }

    return NextResponse.json({ ok: true, result: data }, { status: workId === null ? 201 : 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request or unexpected publishing error." }, { status: 400 });
  }
}
