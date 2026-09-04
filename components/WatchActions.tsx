"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark, Check, Heart, LogIn, Maximize2, Minimize2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { requestRavineAuth } from "./AuthModal";
import "./WatchActions.module.css";

export default function WatchActions({ videoId, duration, locale }: { videoId: number; duration: number | null; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [cinemaMode, setCinemaMode] = useState(false);

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

    return () => {
      mounted = false;
    };
  }, [videoId]);

  function requireAuth() {
    if (userId) return true;
    setMessage(ar ? "سجّل الدخول لاستخدام التفاعل والحفظ." : "Sign in to like, save, and keep your progress.");
    requestRavineAuth(`/${locale}/watch/${videoId}`);
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

  const markProgress = useCallback(async (seconds: number, completed = false) => {
    setProgress(seconds);
    if (!userId || (seconds < 5 && !completed)) return;

    const supabase = createClient();
    await supabase.from("watch_history").upsert({
      user_id: userId,
      video_id: videoId,
      progress_seconds: Math.max(0, Math.floor(seconds)),
      completed,
      last_watched_at: new Date().toISOString(),
    }, { onConflict: "user_id,video_id" });
  }, [userId, videoId]);

  function toggleCinemaMode() {
    const next = !cinemaMode;
    setCinemaMode(next);
    document.querySelector(".watch-page")?.classList.toggle("cinema-active", next);
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
        <button className={`watch-action ${cinemaMode ? "active" : ""}`} type="button" onClick={toggleCinemaMode} aria-pressed={cinemaMode}>
          {cinemaMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          {cinemaMode ? (ar ? "الخروج من السينما" : "Exit Cinema") : (ar ? "وضع السينما" : "Cinema Mode")}
        </button>
        {!userId && (
          <button className="watch-action" type="button" onClick={() => requestRavineAuth(`/${locale}/watch/${videoId}`)}>
            <LogIn size={17} />{ar ? "دخول" : "Sign in"}
          </button>
        )}
      </div>

      {duration && userId && (
        <div className="watch-progress-note">
          <Check size={14} />
          {percent > 0 ? (ar ? `استمرار المشاهدة ${percent}%` : `${percent}% watched`) : (ar ? "سيُحفظ تقدمك أثناء المشاهدة" : "Your progress will be saved as you watch")}
        </div>
      )}

      {message && <p className="watch-action-message">{message}</p>}
      <WatchVideoBridge onTimeUpdate={markProgress} resumeSeconds={progress} duration={duration} />
    </div>
  );
}

function WatchVideoBridge({ onTimeUpdate, resumeSeconds, duration }: { onTimeUpdate: (seconds: number, completed?: boolean) => void; resumeSeconds: number; duration: number | null }) {
  useEffect(() => {
    const video = document.querySelector<HTMLVideoElement>(".watch-video");
    if (!video) return;

    if (resumeSeconds > 5 && (!Number.isFinite(video.duration) || resumeSeconds < video.duration - 2)) {
      const resume = () => {
        try { video.currentTime = resumeSeconds; } catch { /* Metadata may not be ready yet. */ }
      };
      if (video.readyState >= 1) resume();
      else video.addEventListener("loadedmetadata", resume, { once: true });
      return () => video.removeEventListener("loadedmetadata", resume);
    }
    return undefined;
  }, [resumeSeconds]);

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
