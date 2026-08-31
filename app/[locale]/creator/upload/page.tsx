"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: number;
  name: string;
  slug: string;
};

export default function UploadVideoPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategories() {
      const { data, error: categoryError } =
        await supabase
          .from("categories")
          .select("id,name,slug")
          .order("name", { ascending: true });

      if (categoryError) {
        setError(categoryError.message);
      } else {
        setCategories(data ?? []);
      }

      setLoading(false);
    }

    void loadCategories();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!title.trim()) {
      setError("Enter a video title.");
      return;
    }

    if (!videoFile) {
      setError("Choose a video file.");
      return;
    }

    if (!thumbnailFile) {
      setError("Choose a thumbnail image.");
      return;
    }

    setUploading(true);

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
          .single();

      if (creatorError || !creator) {
        throw new Error(
          creatorError?.message ||
          "Creator profile not found."
        );
      }

      const videoName = videoFile.name
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-");

      const thumbnailExtension =
        thumbnailFile.name.split(".").pop() || "jpg";

      const videoPath =
        `${creator.id}/${crypto.randomUUID()}-${videoName}`;

      const thumbnailPath =
        `${creator.id}/${crypto.randomUUID()}.${thumbnailExtension}`;

      const { error: videoUploadError } =
        await supabase.storage
          .from("videos")
          .upload(videoPath, videoFile, {
            cacheControl: "3600",
            upsert: false,
            contentType:
              videoFile.type || "video/mp4"
          });

      if (videoUploadError) {
        throw videoUploadError;
      }

      const { error: thumbnailUploadError } =
        await supabase.storage
          .from("thumbnails")
          .upload(
            thumbnailPath,
            thumbnailFile,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                thumbnailFile.type || "image/jpeg"
            }
          );

      if (thumbnailUploadError) {
        await supabase.storage
          .from("videos")
          .remove([videoPath]);

        throw thumbnailUploadError;
      }

      const {
        data: { publicUrl: thumbnailUrl }
      } = supabase.storage
        .from("thumbnails")
        .getPublicUrl(thumbnailPath);

      const { error: insertError } =
        await supabase
          .from("videos")
          .insert({
            creator_id: creator.id,
            category_id: categoryId
              ? Number(categoryId)
              : null,
            title: title.trim(),
            description:
              description.trim() || null,
            video_url: videoPath,
            thumbnail_url: thumbnailUrl,
            duration: null,
            views: 0,
            likes: 0,
            published: false
          });

      if (insertError) {
        await Promise.all([
          supabase.storage
            .from("videos")
            .remove([videoPath]),
          supabase.storage
            .from("thumbnails")
            .remove([thumbnailPath])
        ]);

        throw insertError;
      }

      setTitle("");
      setDescription("");
      setCategoryId("");
      setVideoFile(null);
      setThumbnailFile(null);

      const videoInput =
        document.getElementById(
          "video-file"
        ) as HTMLInputElement | null;

      const thumbnailInput =
        document.getElementById(
          "thumbnail-file"
        ) as HTMLInputElement | null;

      if (videoInput) videoInput.value = "";
      if (thumbnailInput) thumbnailInput.value = "";

      setMessage(
        "Video and thumbnail uploaded successfully. Saved as draft."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-3xl text-center">
          Loading...
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
            Upload Video
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#F1E9DC]/50">
            Add your video and a custom thumbnail.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6 md:p-8"
        >

          <label className="block text-sm font-medium">
            Video title

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              maxLength={200}
              required
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
              placeholder="Enter your video title"
            />
          </label>

          <label className="mt-6 block text-sm font-medium">
            Description

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={6}
              className="mt-2 w-full resize-y rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
              placeholder="Tell people what this video is about..."
            />
          </label>

          <label className="mt-6 block text-sm font-medium">
            Category

            <select
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            >
              <option value="">
                Select a category
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-6 block text-sm font-medium">
            Video file

            <input
              id="video-file"
              type="file"
              accept="video/*"
              required
              onChange={(event) =>
                setVideoFile(
                  event.target.files?.[0] ?? null
                )
              }
              className="mt-2 block w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-4 text-sm text-[#F1E9DC]/70 file:mr-4 file:rounded-xl file:border-0 file:bg-[#C47A52] file:px-4 file:py-2 file:font-semibold file:text-[#090909]"
            />

            {videoFile && (
              <div className="mt-2 text-xs text-[#F1E9DC]/40">
                {videoFile.name} ·{" "}
                {(videoFile.size / 1024 / 1024).toFixed(1)} MB
              </div>
            )}
          </label>

          <label className="mt-6 block text-sm font-medium">
            Thumbnail

            <input
              id="thumbnail-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(event) =>
                setThumbnailFile(
                  event.target.files?.[0] ?? null
                )
              }
              className="mt-2 block w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-4 text-sm text-[#F1E9DC]/70 file:mr-4 file:rounded-xl file:border-0 file:bg-[#C47A52] file:px-4 file:py-2 file:font-semibold file:text-[#090909]"
            />

            {thumbnailFile && (
              <div className="mt-2 text-xs text-[#F1E9DC]/40">
                {thumbnailFile.name} ·{" "}
                {(thumbnailFile.size / 1024 / 1024).toFixed(1)} MB
              </div>
            )}
          </label>

          <div className="mt-8 rounded-2xl border border-[#183F46]/60 bg-[#183F46]/10 p-4 text-xs leading-6 text-[#F1E9DC]/50">
            Videos remain private in Storage and are uploaded as drafts.
            The thumbnail is stored separately and can be displayed publicly.
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="mt-6 w-full rounded-2xl bg-[#C47A52] px-5 py-3 font-bold text-[#090909] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading
              ? "Uploading..."
              : "Upload Video"}
          </button>

          {message && (
            <div className="mt-5 rounded-2xl border border-[#183F46] bg-[#183F46]/20 p-4 text-sm text-[#F1E9DC]/80">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
              {error}
            </div>
          )}

        </form>
      </div>
    </main>
  );
}