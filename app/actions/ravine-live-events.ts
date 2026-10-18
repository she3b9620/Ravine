"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Locale = "ar" | "en";
const allowedTypes = new Set(["solo", "co_live", "guest", "panel", "podcast", "gaming", "watch_party", "workshop", "premiere"]);
const allowedModes = new Set(["video", "audio", "hybrid"]);

function safeLocale(value: FormDataEntryValue | null): Locale {
  return value === "en" ? "en" : "ar";
}

export async function createRAVINELiveEventAction(formData: FormData) {
  const locale = safeLocale(formData.get("locale"));
  const creatorId = Number(formData.get("creator_id"));
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const liveType = String(formData.get("live_type") ?? "solo");
  const mode = String(formData.get("mode") ?? "video");
  const scheduledRaw = String(formData.get("scheduled_at") ?? "").trim();

  if (!Number.isSafeInteger(creatorId) || creatorId <= 0 || !title || !allowedTypes.has(liveType) || !allowedModes.has(mode)) {
    redirect("/" + locale + "/events?error=input");
  }

  let scheduledAt: string | null = null;
  if (scheduledRaw) {
    const timestamp = Date.parse(scheduledRaw);
    if (!Number.isFinite(timestamp)) redirect("/" + locale + "/events?error=time");
    if (timestamp <= Date.now()) redirect("/" + locale + "/events?error=past");
    scheduledAt = new Date(timestamp).toISOString();
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/events"));

  const { data: creator, error: creatorError } = await supabase
    .from("creators")
    .select("id")
    .eq("id", creatorId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (creatorError || !creator) redirect("/" + locale + "/events?error=permission");

  const { error } = await supabase.from("live_events").insert({
    creator_id: creatorId,
    title,
    description: description || null,
    live_type: liveType,
    mode,
    status: "scheduled",
    scheduled_at: scheduledAt,
    started_at: null,
    ended_at: null,
    recording_video_id: null,
  });
  if (error) redirect("/" + locale + "/events?error=create");

  revalidatePath("/" + locale + "/events");
  redirect("/" + locale + "/events?notice=created");
}

export async function cancelRAVINELiveEventAction(formData: FormData) {
  const locale = safeLocale(formData.get("locale"));
  const eventId = Number(formData.get("event_id"));
  if (!Number.isSafeInteger(eventId) || eventId <= 0) redirect("/" + locale + "/events?error=input");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/events"));

  const { data: event, error: eventError } = await supabase
    .from("live_events")
    .select("id,creator_id,status")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event) redirect("/" + locale + "/events?error=permission");
  if (event.status !== "scheduled") redirect("/" + locale + "/events?error=status");

  const { data: creator, error: creatorError } = await supabase
    .from("creators")
    .select("id")
    .eq("id", event.creator_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (creatorError || !creator) redirect("/" + locale + "/events?error=permission");

  const { data: updated, error } = await supabase
    .from("live_events")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("creator_id", creator.id)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();
  if (error || !updated) redirect("/" + locale + "/events?error=status");

  revalidatePath("/" + locale + "/events");
  redirect("/" + locale + "/events?notice=cancelled");
}
