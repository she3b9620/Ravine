import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const creatorTiers = new Set([
  "viewer",
  "creator",
  "elevated_creator",
  "artist",
  "elevated_artist",
]);

type Body = {
  creatorIdentityId?: number;
  creatorTier?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const creatorIdentityId = Number(body.creatorIdentityId);
    const creatorTier = typeof body.creatorTier === "string" ? body.creatorTier : "";

    if (!Number.isInteger(creatorIdentityId) || creatorIdentityId < 1) {
      return NextResponse.json({ error: "A valid creator identity is required." }, { status: 400 });
    }
    if (!creatorTiers.has(creatorTier)) {
      return NextResponse.json({ error: "Unsupported creator tier." }, { status: 422 });
    }

    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("ravine_admin_set_creator_tier", {
      p_creator_identity_id: creatorIdentityId,
      p_creator_tier: creatorTier,
    });

    if (error) {
      const message = error.message || "";
      const status = message.includes("RAVINE_AUTH_REQUIRED") ? 401
        : message.includes("RAVINE_ADMIN_REQUIRED") ? 403
        : message.includes("RAVINE_CREATOR_IDENTITY_NOT_FOUND") ? 404
        : message.includes("RAVINE_INVALID_CREATOR_TIER") ? 422
        : 500;
      return NextResponse.json(
        { error: status === 500 ? "Could not update creator tier." : message },
        { status },
      );
    }

    return NextResponse.json({ ok: true, result: data });
  } catch {
    return NextResponse.json({ error: "Invalid request or unexpected tier update error." }, { status: 400 });
  }
}
