import { canAccessRAVINEWork, type RAVINEAccessPolicy } from "@/lib/ravine-access";
import { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type RAVINEVideoAccessRecord = {
  published: boolean | null;
  visibility: string | null;
  user_id: string | null;
  creator_id: number | null;
};

const visibilityPolicies: Record<string, RAVINEAccessPolicy> = {
  public: "public",
  unlisted: "unlisted",
  followers: "followers",
  members: "members",
  tier: "tier",
  invite_only: "invite_only",
  private: "private",
  // Custom audience management is not enabled yet, so unknown recipients
  // remain owner-only until its explicit access list is implemented.
  custom: "private",
};

export async function canAccessRAVINEVideo(
  supabase: ServerSupabase,
  video: RAVINEVideoAccessRecord,
): Promise<boolean> {
  const rawVisibility = (video.visibility || "public").trim().toLowerCase();
  const policy = visibilityPolicies[rawVisibility] || "private";

  // Public and unlisted published works need no identity or admin lookup.
  // Their direct page URL is the intended access boundary.
  if (video.published === true && (policy === "public" || policy === "unlisted")) return true;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return false;

  let creatorIdentityOwner = video.user_id === user.id;
  if (!creatorIdentityOwner && video.creator_id) {
    const { data: creator } = await supabase
      .from("creators")
      .select("user_id")
      .eq("id", video.creator_id)
      .maybeSingle();
    creatorIdentityOwner = creator?.user_id === user.id;
  }
  if (creatorIdentityOwner) return true;

  // Use the same server-side admin RPC as protected platform tooling.
  // A failed or missing RPC is intentionally treated as non-admin.
  const { data: adminResult, error: adminError } = await supabase.rpc("is_ravine_admin");
  const admin = !adminError && adminResult === true;
  if (admin) return true;

  // Drafts stay owner/admin-only. Membership tiers and invitations remain
  // fail-closed until their connected database policies and UI are verified.
  if (video.published !== true) return false;

  let followsCreator = false;
  if (policy === "followers" && video.creator_id) {
    const { data: follow, error } = await supabase
      .from("follows")
      .select("creator_id")
      .eq("follower_id", user.id)
      .eq("creator_id", video.creator_id)
      .maybeSingle();
    followsCreator = !error && Boolean(follow);
  }

  return canAccessRAVINEWork(policy, {
    authenticated: true,
    creatorIdentityOwner: false,
    followsCreator,
    member: false,
    invited: false,
    admin: false,
  });
}
