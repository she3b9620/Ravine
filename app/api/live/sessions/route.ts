import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const liveModes = new Set([
  "solo",
  "co_live",
  "guest",
  "panel",
  "workshop",
  "qa",
  "premiere",
  "watch_party",
  "gaming",
  "audio",
  "camera_off",
  "bts",
  "sessions",
]);

type Body = {
  action?: "create" | "start" | "end" | "cancel";
  creatorIdentityId?: number;
  sessionId?: string;
  title?: string;
  mode?: string;
  startsAt?: string | null;
  relatedWorkId?: number | null;
};

function databaseStatus(message: string) {
  if (message.includes("RAVINE_AUTH_REQUIRED")) return 401;
  if (message.includes("RAVINE_CREATOR_IDENTITY_NOT_OWNED") || message.includes("RAVINE_TIER_RESTRICTED")) return 403;
  if (message.includes("RAVINE_INVALID_")) return 422;
  return 500;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const action = body.action;

    if (!action || !["create", "start", "end", "cancel"].includes(action)) {
      return NextResponse.json({ error: "A supported live-session action is required." }, { status: 422 });
    }

    // Do not expose a session as live until an actual media provider is configured.
    if (action === "start") {
      return NextResponse.json(
        { error: "Live streaming provider is not configured. Session status cannot be changed to live yet." },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (action === "create") {
      const creatorIdentityId = Number(body.creatorIdentityId);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const mode = typeof body.mode === "string" ? body.mode : "";
      const relatedWorkId = body.relatedWorkId == null ? null : Number(body.relatedWorkId);

      if (!Number.isSafeInteger(creatorIdentityId) || creatorIdentityId < 1) {
        return NextResponse.json({ error: "A valid creator identity is required." }, { status: 400 });
      }
      if (!title || title.length > 200 || !liveModes.has(mode)) {
        return NextResponse.json({ error: "A title and supported live mode are required." }, { status: 422 });
      }
      if (relatedWorkId !== null && (!Number.isSafeInteger(relatedWorkId) || relatedWorkId < 1)) {
        return NextResponse.json({ error: "Invalid related work id." }, { status: 400 });
      }

      const startsAt = typeof body.startsAt === "string" && body.startsAt.trim() ? new Date(body.startsAt) : null;
      if (!startsAt || Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
        return NextResponse.json({ error: "A future scheduled start time is required." }, { status: 422 });
      }

      const { data: identity, error: identityError } = await supabase
        .from("ravine_next_creator_identities")
        .select("id")
        .eq("id", creatorIdentityId)
        .eq("owner_user_id", auth.user.id)
        .maybeSingle();

      if (identityError) {
        return NextResponse.json({ error: "Live sessions are not available until the required RAVINE database migrations are installed." }, { status: 503 });
      }
      if (!identity) {
        return NextResponse.json({ error: "Creator identity not found or not owned by this account." }, { status: 403 });
      }

      if (relatedWorkId !== null) {
        const { data: relatedWork, error: relatedWorkError } = await supabase
          .from("ravine_next_works")
          .select("id")
          .eq("id", relatedWorkId)
          .eq("creator_identity_id", creatorIdentityId)
          .maybeSingle();

        if (relatedWorkError) {
          return NextResponse.json({ error: "Could not verify the related work against the RAVINE database." }, { status: 503 });
        }
        if (!relatedWork) {
          return NextResponse.json({ error: "Related work must belong to the selected creator identity." }, { status: 422 });
        }
      }

      const status = "scheduled";
      const { data: session, error } = await supabase
        .from("ravine_next_live_sessions")
        .insert({
          creator_identity_id: creatorIdentityId,
          title,
          mode,
          status,
          starts_at: startsAt.toISOString(),
          related_work_id: relatedWorkId,
        })
        .select("id,creator_identity_id,title,mode,status,starts_at,ended_at,related_work_id,created_at")
        .single();

      if (error || !session) {
        const message = error?.message || "Could not create live session.";
        const statusCode = databaseStatus(message);
        return NextResponse.json(
          { error: statusCode === 500 ? "Could not create live session." : message },
          { status: statusCode },
        );
      }

      return NextResponse.json({ ok: true, session }, { status: 201 });
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
      return NextResponse.json({ error: "A valid live-session id is required." }, { status: 400 });
    }

    const { data: existing, error: lookupError } = await supabase
      .from("ravine_next_live_sessions")
      .select("id,status,creator_identity_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: "Live sessions are not available until the required RAVINE database migrations are installed." }, { status: 503 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Live session not found." }, { status: 404 });
    }

    const transitions = {
      start: { from: ["scheduled"] as string[], to: "live" },
      end: { from: ["live"] as string[], to: "recorded" },
      cancel: { from: ["scheduled"] as string[], to: "cancelled" },
    } as const;
    const transition = transitions[action as keyof typeof transitions];

    if (!transition || !transition.from.includes(existing.status)) {
      return NextResponse.json({ error: "This live-session status transition is not allowed." }, { status: 409 });
    }

    const patch = transition.to === "live"
      ? { status: "live", starts_at: new Date().toISOString(), ended_at: null }
      : transition.to === "recorded"
        ? { status: "recorded", ended_at: new Date().toISOString() }
        : { status: "cancelled" };

    const { data: session, error } = await supabase
      .from("ravine_next_live_sessions")
      .update(patch)
      .eq("id", sessionId)
      .eq("creator_identity_id", existing.creator_identity_id)
      .select("id,creator_identity_id,title,mode,status,starts_at,ended_at,related_work_id,created_at")
      .single();

    if (error || !session) {
      const message = error?.message || "Could not update live session.";
      const statusCode = databaseStatus(message);
      return NextResponse.json(
        { error: statusCode === 500 ? "Could not update live session." : message },
        { status: statusCode },
      );
    }

    return NextResponse.json({ ok: true, session });
  } catch {
    return NextResponse.json({ error: "Invalid request or unexpected live-session error." }, { status: 400 });
  }
}
