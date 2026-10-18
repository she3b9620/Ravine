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
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  let creatorIdentityOwner = Boolean(user && video.user_id === user.id);

  if (user && !creatorIdentityOwner && video.creator_id) {
    const { data: creator } = await supabase
      .from("creators")
      .select("user_id")
      .eq("id", video.creator_id)
      .maybeSingle();
    creatorIdentityOwner = creator?.user_id === user.id;
  }

  // Use the same server-side admin RPC as the protected platform tooling.
  // A failed/missing RPC is intentionally treated as non-admin.
  let admin = false;
  if (user && !creatorIdentityOwner) {
    const { data: adminResult, error: adminError } = await supabase.rpc("is_ravine_admin");
    admin = !adminError && adminResult === true;
  }

  // Drafts are accessible only to the owner or a verified RAVINE administrator.
  if (video.published !== true && !creatorIdentityOwner && !admin) return false;

  const rawVisibility = (video.visibility || "public").trim().toLowerCase();
  const policy = visibilityPolicies[rawVisibility] || "private";
  let followsCreator = false;

  if (policy === "followers" && user && video.creator_id && !creatorIdentityOwner) {
    const { data: follow, error } = await supabase
      .from("follows")
      .select("creator_id")
      .eq("follower_id", user.id)
      .eq("creator_id", video.creator_id)
      .maybeSingle();
    followsCreator = !error && Boolean(follow);
  }

  return canAccessRAVINEWork(policy, {
    authenticated: Boolean(user),
    creatorIdentityOwner,
    followsCreator,
    // Membership tiers and invitation lists are intentionally fail-closed
    // until the connected database policies and UI are verified.
    member: false,
    invited: false,
    admin,
  });
}
