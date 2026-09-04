"use client";

import { useEffect, useState } from "react";
import { Bookmark, Check, Heart, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function WatchActions({ videoId, duration, locale }: { videoId: number; duration: number | null; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted || !data.user) return;
      setUserId(data.user.id);
      const [like, save, history] = await Promise.all([
        supabase.from("video_likes").select("video_id").eq("user_id", data.user.id).eq("video_id", videoId).maybeSingle(),
        supabase.from("video_saves").select("video_id").eq("user_id", data.user.id).eq("video_id", videoId).maybeSingle(),
        supabase.from("watch_history").select("progress_seconds,completed").eq("user_id", data.user.id).eq("video_id", videoId).maybeSingle(),
      ]);
      if (!mounted) return;
      setLiked(Boolean(like.data));
      setSaved(Boolean(save.data));
      setProgress(Number(history.data?.progress_seconds || 0));
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [videoId]);

  function requireAuth() {
    if (userId) return true;
    setMessage(ar ? "سجّل الدخول لاستخدام التفاعل والحفظ." : "Sign in to like, save, and keep your progress.");
    return false;
  }

  async function toggleLike() {
    if (!requireAuth() || busy) return;
    setBusy("like");
    const supabase = createClient();
    const result = liked
      ? await supabase.from("video_likes").delete().eq("user_id", userId!).eq("video_id", videoId)
      : await supabase.from("video_likes").insert({ user_id: userId!, video_id: videoId });
    if (result.error) setMessage(result.error.message); else setLiked(!liked);
    setBusy(null);
  }

  async function toggleSave() {
    if (!requireAuth() || busy) return;
    setBusy("save");
    const supabase = createClient();
    const result = saved
      ? await supabase.from("video_saves").delete().eq("user_id", userId!).eq("video_id", videoId)
      : await supabase.from("video_saves").insert({ user_id: userId!, video_id: videoId });
    if (result.error) setMessage(result.error.message); else setSaved(!saved);
    setBusy(null);
  }

  async function markProgress(seconds: number, completed = false) {
    setProgress(seconds);
    if (!userId) return;
    if (seconds < 5 && !completed) return;
    const supabase = createClient();
    await supabase.from("watch_history").upsert({
      user_id: userId,
      video_id: videoId,
      progress_seconds: Math.max(0, Math.floor(seconds)),
      completed,
      last_watched_at: new Date().toISOString(),
    }, { onConflict: "user_id,video_id" });
  }

  const percent = duration ? Math.min(100, Math.round((progress / duration) * 100)) : 0;

  return (
    <div className="watch-actions">
      <div className="watch-action-row">
        <button className={`watch-action ${liked ? "active" : ""}`} type="button" onClick={() => void toggleLike()} disabled={busy !== null}>
          <Heart size={17} fill={liked ? "currentColor" : "none"} />{liked ? (ar ? "أعجبني" : "Liked") : (ar ? "إعجاب" : "Like")}
        </button>
        <button className={`watch-action ${saved ? "active" : ""}`} type="button" onClick={() => void toggleSave()} disabled={busy !== null}>
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />{saved ? (ar ? "محفوظ" : "Saved") : (ar ? "حفظ" : "Save")}
        </button>
        {!userId && <a className="watch-action" href={`/${locale}/auth?next=/${locale}/watch/${videoId}`}><LogIn size={17} />{ar ? "دخول" : "Sign in"}</a>}
      </div>
      {duration && userId && <div className="watch-progress-note"><Check size={14} />{percent > 0 ? (ar ? `استمرار المشاهدة ${percent}%` : `${percent}% watched`) : (ar ? "سيُحفظ تقدمك أثناء المشاهدة" : "Your progress will be saved as you watch")}</div>}
      {message && <p className="watch-action-message">{message}</p>}
      <WatchVideoBridge onTimeUpdate={markProgress} duration={duration} />
    </div>
  );
}

function WatchVideoBridge({ onTimeUpdate, duration }: { onTimeUpdate: (seconds: number, completed?: boolean) => void; duration: number | null }) {
  useEffect(() => {
    const video = document.querySelector<HTMLVideoElement>(".watch-video");
    if (!video) return;
    const onTime = () => onTimeUpdate(video.currentTime, false);
    const onPause = () => onTimeUpdate(video.currentTime, false);
    const onEnded = () => onTimeUpdate(video.duration || duration || 0, true);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [duration, onTimeUpdate]);
  return null;
}
