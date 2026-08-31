"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  website_url: string | null;
  country: string | null;
  is_verified: boolean;
  is_suspended: boolean;
};

export default function AccountPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setError("");

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/ar/auth";
        return;
      }

      setEmail(user.email ?? "");

      const { data, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id,username,display_name,bio,avatar_url,cover_url,website_url,country,is_verified,is_suspended"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        setError(profileError.message);
      }

      const current = data as Profile | null;

      if (current) {
        setProfile(current);
        setDisplayName(current.display_name ?? "");
        setUsername(current.username ?? "");
        setBio(current.bio ?? "");
        setCountry(current.country ?? "");
        setWebsite(current.website_url ?? "");
      } else {
        setDisplayName(
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          ""
        );
      }

      setLoading(false);
    }

    void loadAccount();
  }, []);

  async function uploadImage(
    bucket: "avatars" | "covers",
    file: File,
    userId: string
  ) {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const path =
      `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg"
        });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl }
    } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/ar/auth";
      return;
    }

    let avatarUrl = profile?.avatar_url || null;
    let coverUrl = profile?.cover_url || null;

    if (avatarFile) {
      avatarUrl = await uploadImage(
        "avatars",
        avatarFile,
        user.id
      );
    }

    if (coverFile) {
      coverUrl = await uploadImage(
        "covers",
        coverFile,
        user.id
      );
    }

    const payload = {
      id: user.id,
      display_name: displayName.trim() || null,
      username: username.trim().toLowerCase() || null,
      bio: bio.trim() || null,
      country: country.trim() || null,
      website_url: website.trim() || null,
      avatar_url: avatarUrl,
      cover_url: coverUrl
    };

    const { data, error: saveError } =
      await supabase
        .from("profiles")
        .upsert(payload, {
          onConflict: "id"
        })
        .select()
        .single();

    if (saveError) {
      setError(saveError.message);
    } else {
      setProfile(data as Profile);
      setMessage("Profile updated successfully.");
    }

    setSaving(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/ar";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-4xl text-center">
          Loading account...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-12 text-[#F1E9DC]">
      <div className="mx-auto max-w-4xl">

        <a
          href="/ar"
          className="text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
        >
          ← Back to RAVINE
        </a>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#C47A52]">
              RAVINE ACCOUNT
            </div>

            <h1 className="mt-3 text-4xl font-black">
              Your Account
            </h1>

            <p className="mt-2 text-sm text-[#F1E9DC]/45">
              {email}
            </p>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-red-500/30 px-5 py-2.5 text-sm text-red-300"
          >
            Sign out
          </button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/ar/library"
            className="rounded-2xl border border-[#183F46]/60 bg-[#151719] p-5"
          >
            <div className="text-sm font-bold">My Library</div>
            <div className="mt-1 text-xs text-[#F1E9DC]/40">
              Saved, liked and history
            </div>
          </a>

          <a
            href="/ar/notifications"
            className="rounded-2xl border border-[#183F46]/60 bg-[#151719] p-5"
          >
            <div className="text-sm font-bold">Notifications</div>
            <div className="mt-1 text-xs text-[#F1E9DC]/40">
              Activity and updates
            </div>
          </a>

          <a
            href="/ar/creator"
            className="rounded-2xl border border-[#183F46]/60 bg-[#151719] p-5"
          >
            <div className="text-sm font-bold">Creator Dashboard</div>
            <div className="mt-1 text-xs text-[#F1E9DC]/40">
              Manage your videos
            </div>
          </a>

          <a
            href="/ar/admin"
            className="rounded-2xl border border-[#183F46]/60 bg-[#151719] p-5"
          >
            <div className="text-sm font-bold">Admin</div>
            <div className="mt-1 text-xs text-[#F1E9DC]/40">
              Moderation
            </div>
          </a>
        </div>

        <form
          onSubmit={saveProfile}
          className="mt-8 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6 md:p-8"
        >
          <h2 className="text-2xl font-bold">
            Profile
          </h2>

          {profile?.is_verified && (
            <div className="mt-3 text-xs font-semibold text-[#C47A52]">
              Verified account
            </div>
          )}

          {profile?.is_suspended && (
            <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
              This account is suspended.
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-3xl border border-[#F1E9DC]/10 bg-[#090909]">
            <div
              className="h-36 bg-cover bg-center"
              style={{
                backgroundImage: profile?.cover_url
                  ? `url(${profile.cover_url})`
                  : "linear-gradient(135deg,#183F46,#151719)"
              }}
            />

            <div className="-mt-10 px-6 pb-5">
              <img
                src={
                  profile?.avatar_url ||
                  "/RAVINE.png"
                }
                alt=""
                className="h-20 w-20 rounded-full border-4 border-[#151719] object-cover"
              />
            </div>
          </div>

          <label className="mt-6 block text-sm font-medium">
            Avatar

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setAvatarFile(
                  event.target.files?.[0] || null
                )
              }
              className="mt-2 block w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#C47A52] file:px-4 file:py-2 file:font-bold file:text-[#090909]"
            />
          </label>

          <label className="mt-5 block text-sm font-medium">
            Cover image

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setCoverFile(
                  event.target.files?.[0] || null
                )
              }
              className="mt-2 block w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#C47A52] file:px-4 file:py-2 file:font-bold file:text-[#090909]"
            />
          </label>
          <label className="mt-6 block text-sm font-medium">
            Display name

            <input
              value={displayName}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
              maxLength={80}
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            />
          </label>

          <label className="mt-5 block text-sm font-medium">
            Username

            <input
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value.replace(
                    /\s+/g,
                    ""
                  )
                )
              }
              maxLength={40}
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            />
          </label>

          <label className="mt-5 block text-sm font-medium">
            Bio

            <textarea
              value={bio}
              onChange={(event) =>
                setBio(event.target.value)
              }
              rows={5}
              maxLength={500}
              className="mt-2 w-full resize-y rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            />
          </label>

          <label className="mt-5 block text-sm font-medium">
            Country

            <input
              value={country}
              onChange={(event) =>
                setCountry(event.target.value)
              }
              maxLength={80}
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            />
          </label>

          <label className="mt-5 block text-sm font-medium">
            Website

            <input
              type="url"
              value={website}
              onChange={(event) =>
                setWebsite(event.target.value)
              }
              placeholder="https://example.com"
              className="mt-2 w-full rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 outline-none focus:border-[#C47A52]"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-7 rounded-2xl bg-[#C47A52] px-6 py-3 text-sm font-bold text-[#090909] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

          {message && (
            <div className="mt-5 rounded-2xl border border-[#183F46] bg-[#183F46]/20 p-4 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
        </form>

      </div>
    </main>
  );
}