"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_MESSAGE_LENGTH = 4000;

export type RavineActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: "AUTH_REQUIRED" | "INVALID_INPUT" | "DATABASE_ERROR"; message: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null as const };
  }

  return { supabase, user };
}

export async function followCreator(
  creatorIdentityId: number,
  following: boolean,
): Promise<RavineActionResult<{ following: boolean }>> {
  if (!Number.isInteger(creatorIdentityId) || creatorIdentityId <= 0) {
    return { ok: false, code: "INVALID_INPUT", message: "Invalid creator identity." };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "Authentication is required." };
  }

  if (following) {
    const { error } = await supabase.from("ravine_next_follows").insert({
      follower_user_id: user.id,
      creator_identity_id: creatorIdentityId,
    });

    if (error && error.code !== "23505") {
      return { ok: false, code: "DATABASE_ERROR", message: "Could not follow creator." };
    }
  } else {
    const { error } = await supabase
      .from("ravine_next_follows")
      .delete()
      .eq("follower_user_id", user.id)
      .eq("creator_identity_id", creatorIdentityId);

    if (error) {
      return { ok: false, code: "DATABASE_ERROR", message: "Could not unfollow creator." };
    }
  }

  return { ok: true, data: { following } };
}

export async function toggleSaveWork(
  workId: number,
  saved: boolean,
): Promise<RavineActionResult<{ saved: boolean }>> {
  if (!Number.isInteger(workId) || workId <= 0) {
    return { ok: false, code: "INVALID_INPUT", message: "Invalid work." };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "Authentication is required." };
  }

  if (saved) {
    const { error } = await supabase.from("ravine_next_saves").insert({
      user_id: user.id,
      work_id: workId,
    });

    if (error && error.code !== "23505") {
      return { ok: false, code: "DATABASE_ERROR", message: "Could not save work." };
    }
  } else {
    const { error } = await supabase
      .from("ravine_next_saves")
      .delete()
      .eq("user_id", user.id)
      .eq("work_id", workId);

    if (error) {
      return { ok: false, code: "DATABASE_ERROR", message: "Could not remove saved work." };
    }
  }

  return { ok: true, data: { saved } };
}

export async function setWorkReaction(
  workId: number,
  reaction: "like" | "love" | "celebrate" | "insightful" | null,
): Promise<RavineActionResult<{ reaction: typeof reaction }>> {
  if (!Number.isInteger(workId) || workId <= 0) {
    return { ok: false, code: "INVALID_INPUT", message: "Invalid work." };
  }

  if (reaction !== null && !["like", "love", "celebrate", "insightful"].includes(reaction)) {
    return { ok: false, code: "INVALID_INPUT", message: "Invalid reaction." };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "Authentication is required." };
  }

  const { error: removeError } = await supabase
    .from("ravine_next_reactions")
    .delete()
    .eq("user_id", user.id)
    .eq("work_id", workId);

  if (removeError) {
    return { ok: false, code: "DATABASE_ERROR", message: "Could not update reaction." };
  }

  if (reaction) {
    const { error } = await supabase.from("ravine_next_reactions").insert({
      user_id: user.id,
      work_id: workId,
      reaction,
    });

    if (error) {
      return { ok: false, code: "DATABASE_ERROR", message: "Could not update reaction." };
    }
  }

  return { ok: true, data: { reaction } };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<RavineActionResult<{ notificationId: string }>> {
  if (!/^[0-9a-f-]{36}$/i.test(notificationId)) {
    return { ok: false, code: "INVALID_INPUT", message: "Invalid notification." };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "Authentication is required." };
  }

  const { error } = await supabase
    .from("ravine_next_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, code: "DATABASE_ERROR", message: "Could not mark notification as read." };
  }

  return { ok: true, data: { notificationId } };
}

export async function sendDirectMessage(
  conversationId: string,
  recipientUserId: string,
  body: string,
): Promise<RavineActionResult<{ messageId: string }>> {
  if (!/^[0-9a-f-]{36}$/i.test(conversationId) || !/^[0-9a-f-]{36}$/i.test(recipientUserId)) {
    return { ok: false, code: "INVALID_INPUT", message: "Invalid conversation or recipient." };
  }

  const normalizedBody = body.trim();
  if (!normalizedBody || normalizedBody.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, code: "INVALID_INPUT", message: "Message length is invalid." };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "Authentication is required." };
  }

  if (recipientUserId === user.id) {
    return { ok: false, code: "INVALID_INPUT", message: "You cannot message yourself." };
  }

  const { data, error } = await supabase
    .from("ravine_next_messages")
    .insert({
      conversation_id: conversationId,
      sender_user_id: user.id,
      recipient_user_id: recipientUserId,
      body: normalizedBody,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, code: "DATABASE_ERROR", message: "Could not send message." };
  }

  return { ok: true, data: { messageId: data.id as string } };
}
