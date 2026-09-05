"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { requestRavineAuth } from "./AuthModal";

type Props = {
  creatorId: number;
  locale: "ar" | "en";
  creatorUserId: string | null;
};

function localizeFollowError(error: { message?: string } | null, ar: boolean) {
  const message = error?.message ?? "";
  if (ar && /permission denied for table follows/i.test(message)) return "لا تملك صلاحية تنفيذ هذه العملية حاليًا.";
  return ar ? "تعذر تحديث المتابعة حاليًا." : message || "Unable to update the follow state right now.";
}

export default function FollowCreator({ creatorId, locale, creatorUserId }: Props) {
  const ar = locale === "ar";
  const [userId, setUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

        const { data, error } = await supabase
          .from("follows")
          .select("creator_id")
          .eq("follower_id", auth.user.id)
          .eq("creator_id", creatorId)
          .maybeSingle();

        if (!active) return;
        setFollowing(Boolean(data));
        if (error) setErrorMessage(localizeFollowError(error, ar));
        setBusy(false);
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error && ar ? "تعذر تحميل حالة المتابعة حاليًا." : "Unable to load follow state right now.");
          setBusy(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [creatorId, ar]);

  async function toggle() {
    if (!userId) {
      requestRavineAuth(`/${locale}/creators/${creatorId}`);
      return;
    }

    setBusy(true);
    setErrorMessage("");
    const supabase = createClient();

    try {
      if (following) {
        const { error } = await supabase.from("follows").delete().eq("follower_id", userId).eq("creator_id", creatorId);
        if (error) {
          setErrorMessage(localizeFollowError(error, ar));
        } else {
          setFollowing(false);
        }
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: userId, creator_id: creatorId });
        if (error) {
          setErrorMessage(localizeFollowError(error, ar));
        } else {
          setFollowing(true);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ravine-follow-control">
      <button className={`button ${following ? "secondary" : "primary"}`} type="button" onClick={() => void toggle()} disabled={busy}>
        {busy ? "…" : following ? (ar ? "تتابعه" : "Following") : (ar ? "متابعة المبدع" : "Follow creator")}
      </button>
      {errorMessage ? <p className="ravine-inline-error" role="alert">{errorMessage}</p> : null}
    </div>
  );
}
