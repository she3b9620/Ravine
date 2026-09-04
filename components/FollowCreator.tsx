"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { requestRavineAuth } from "./AuthModal";

type Props = {
  creatorId: number;
  locale: "ar" | "en";
  creatorUserId: string | null;
};

export default function FollowCreator({ creatorId, locale, creatorUserId }: Props) {
  const ar = locale === "ar";
  const [userId, setUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!active) return;
        setUserId(auth.user?.id ?? null);
        if (!auth.user || !creatorId) {
          setBusy(false);
          return;
        }

        const { data } = await supabase
          .from("follows")
          .select("creator_id")
          .eq("follower_id", auth.user.id)
          .eq("creator_id", creatorId)
          .maybeSingle();

        if (active) {
          setFollowing(Boolean(data));
          setBusy(false);
        }
      } catch {
        if (active) setBusy(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [creatorId]);

  async function toggle() {
    if (!userId) {
      requestRavineAuth(`/${locale}/creators/${creatorId}`);
      return;
    }

    setBusy(true);
    const supabase = createClient();

    try {
      if (following) {
        const { error } = await supabase.from("follows").delete().eq("follower_id", userId).eq("creator_id", creatorId);
        if (!error) setFollowing(false);
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: userId, creator_id: creatorId });
        if (!error) setFollowing(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className={`button ${following ? "secondary" : "primary"}`} type="button" onClick={() => void toggle()} disabled={busy}>
      {busy ? "…" : following ? (ar ? "تتابعه" : "Following") : (ar ? "متابعة المبدع" : "Follow creator")}
    </button>
  );
}
