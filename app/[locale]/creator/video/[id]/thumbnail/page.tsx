"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Video = {
  id: number;
  title: string;
  thumbnail_url: string | null;
  creator_id: number;
};

export default function VideoThumbnailPage() {
  const locale = useLocale();
  const params = useParams();
  const id = String(params.id);

  const supabase = useMemo(() => createClient(), []);

  const [video, setVideo] = useState<Video | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVideo() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/${locale}/auth?next=/${locale}/creator/video/${id}/thumbnail`;
        return;
      }

      const { data: creator } = await supabase
        .from("creators")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!creator) {
        setError("Creator profile not found.");
        setLoading(false);
        return;
      }

      const { data, error: videoError } = await supabase
        .from("videos")
        .select("id,title,thumbnail_url,creator_id")
        .eq("id", id)
        .eq("creator_id", creator.id)
        .maybeSingle();

      if (videoError) {
        setError(videoError.message);
      } else if (!data) {
        setError("Video not found or you do not own it.");
      } else {
        setVideo(data);
      }

      setLoading(false);
    }

    void loadVideo();
  }, [id, locale, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!file) {
      setError(locale === "ar" ? "اختر صورة مصغرة." : "Choose a thumbnail image.");
      return;
    }

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError(locale === "ar" ? "الصورة يجب أن تكون JPG أو PNG أو WebP." : "The image must be JPG, PNG, or WebP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(locale === "ar" ? "الصورة أكبر من 10MB." : "The image is larger than 10 MB.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/ar/auth";
        return;
      }

      const { data: creator, error: creatorError } =
        await supabase
          .from("creators")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (creatorError || !creator) {
        throw new Error(
          creatorError?.message ||
          "Creator profile not found."
        );
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const path =
        `${creator.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("thumbnails")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType:
              file.type || "image/jpeg"
          });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl }
      } = supabase.storage
        .from("thumbnails")
        .getPublicUrl(path);

      const { error: updateError } =
        await supabase
          .from("videos")
          .update({
            thumbnail_url: publicUrl
          })
          .eq("id", Number(id))
          .eq("creator_id", creator.id);

      if (updateError) {
        await supabase.storage
          .from("thumbnails")
          .remove([path]);

        throw updateError;
      }

      setVideo((current) =>
        current
          ? {
              ...current,
              thumbnail_url: publicUrl
            }
          : current
      );

      setFile(null);

      const input =
        document.getElementById(
          "thumbnail"
        ) as HTMLInputElement | null;

      if (input) input.value = "";

      setMessage(
        "Thumbnail updated successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update thumbnail."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-[#090909 px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-3xl text-center">
          Loading...
        </div>
      </main>
    );
  }

  if (!video || error) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-3xl">

          <a
            href={`/${locale}/creator`}
            className="text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
          >
            ← Creator Dashboard
          </a>

          <div className="mt-8 rounded-3xl border border-red-500/20 bg-[#151719] p-8">
            <h1 className="text-2xl font-bold">
              Unable to load video
            </h1>

            <p className="mt-3 text-sm text-red-200">
              {error}
            </p>
          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-12 text-[#F1E9DC]">
      <div className="mx-auto max-w-3xl">

        <a
          href="/ar/creator"
          className="text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
        >
          ← Creator Dashboard
        </a>

        <div className="mt-8">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#C47A52]">
            RAVINE CREATOR
          </div>

          <h1 className="mt-3 text-4xl font-black">
            Change Thumbnail
          </h1>

          <p className="mt-3 text-sm text-[#F1E9DC]/50">
            {video.title}
          </p>
        </div>

        {video.thumbnail_url && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-[#183F46]/60 bg-[#151719]">
            <div className="aspect-video">
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6 md:p-8"
        >
          <label className="block text-sm font-medium">
            New thumbnail

            <input
              id="thumbnail"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setFile(
                  event.target.files?.[0] ?? null
                )
              }
              required
              className="mt-3 block w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-4 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#C47A52] file:px-4 file:py-2 file:font-bold file:text-[#090909]"
            />
          </label>

          {file && (
            <p className="mt-3 text-xs text-[#F1E9DC]/40">
              {file.name} ·{" "}
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full rounded-2xl bg-[#C47A52] px-5 py-3 font-bold text-[#090909] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Thumbnail"}
          </button>

          {message && (
            <div className="mt-5 rounded-2xl border border-[#183F46] bg-[#183F46]/20 p-4 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
        </form>

      </div>
    </main>
  );
}