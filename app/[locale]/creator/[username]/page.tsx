"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Film,
  Globe2,
  Heart,
  Play,
  Sparkles,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import PlatformShell from "@/components/PlatformShell";
import { createClient } from "@/lib/supabase/client";

type Creator = {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  user_id: string | null;
  specialty: string | null;
  followers: number | null;
};

type Profile = {
  avatar_url: string | null;
  cover_url: string | null;
  display_name: string | null;
  bio: string | null;
  website_url: string | null;
  country: string | null;
  is_verified: boolean | null;
};

type Video = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  content_type: string | null;
  category: string | null;
  created_at: string | null;
};

function formatCount(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return "";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export default function CreatorProfilePage() {
  const locale = useLocale();
  const ar = locale === "ar";
  const params = useParams();
  const username = String(params.username);
  const supabase = createClient();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const { data: creatorData, error: creatorError } = await supabase
        .from("creators")
        .select("id,name,username,avatar_url,bio,user_id,specialty,followers")
        .eq("username", username)
        .maybeSingle();

      if (!mounted) return;

      if (creatorError) {
        setError(creatorError.message);
        setLoading(false);
        return;
      }

      if (!creatorData) {
        setError(ar ? "المبدع غير موجود." : "Creator not found.");
        setLoading(false);
        return;
      }

      setCreator(creatorData as Creator);

      const [profileResult, followCountResult, userResult, videoResult] = await Promise.all([
        creatorData.user_id
          ? supabase
              .from("profiles")
              .select("avatar_url,cover_url,display_name,bio,website_url,country,is_verified")
              .eq("id", creatorData.user_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("creator_id", creatorData.id),
        supabase.auth.getUser(),
        supabase
          .from("videos")
          .select("id,title,description,thumbnail_url,duration,views,likes,content_type,category,created_at")
          .eq("creator_id", creatorData.id)
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(36),
      ]);

      if (!mounted) return;

      setProfile(profileResult.data as Profile | null);
      setFollowers(followCountResult.count ?? creatorData.followers ?? 0);

      const user = userResult.data.user;
      if (user) {
        const { data: followRow } = await supabase
          .from("follows")
          .select("creator_id")
          .eq("follower_id", user.id)
          .eq("creator_id", creatorData.id)
          .maybeSingle();
        if (mounted) setFollowing(Boolean(followRow));
      }

      if (videoResult.error) {
        setError(videoResult.error.message);
        setVideos([]);
      } else {
        setVideos((videoResult.data ?? []) as Video[]);
      }

      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [ar, supabase, username]);

  async function toggleFollow() {
    if (!creator || followLoading) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = `/${locale}/auth`;
      return;
    }

    setFollowLoading(true);
    setError("");

    try {
      if (following) {
        const { error: deleteError } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("creator_id", creator.id);
        if (deleteError) throw deleteError;
        setFollowing(false);
        setFollowers((value) => Math.max(0, value - 1));
      } else {
        const { error: insertError } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, creator_id: creator.id });
        if (insertError) throw insertError;
        setFollowing(true);
        setFollowers((value) => value + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : ar ? "تعذر تحديث المتابعة." : "Unable to update follow.");
    } finally {
      setFollowLoading(false);
    }
  }

  const avatar = profile?.avatar_url || creator?.avatar_url || "/RAVINE.png";
  const cover = profile?.cover_url || "";
  const displayName = profile?.display_name || creator?.name || "RAVINE Creator";
  const bio = profile?.bio || creator?.bio || "";
  const specialty = creator?.specialty || (ar ? "مبدع بصري" : "Visual creator");
  const verified = Boolean(profile?.is_verified);

  const featuredVideo = videos[0] ?? null;
  const regularVideos = useMemo(() => (featuredVideo ? videos.slice(1) : videos), [featuredVideo, videos]);
  const totalViews = useMemo(() => videos.reduce((sum, video) => sum + (video.views ?? 0), 0), [videos]);
  const totalLikes = useMemo(() => videos.reduce((sum, video) => sum + (video.likes ?? 0), 0), [videos]);
  const categorySet = useMemo(() => {
    return Array.from(new Set(videos.map((video) => video.category).filter(Boolean) as string[])).slice(0, 6);
  }, [videos]);

  if (loading) {
    return (
      <PlatformShell>
        <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-8 lg:px-10">
          <div className="animate-pulse space-y-5">
            <div className="h-[300px] rounded-[34px] bg-white/5" />
            <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
              <div className="h-72 rounded-[30px] bg-white/5" />
              <div className="h-72 rounded-[30px] bg-white/5" />
            </div>
          </div>
        </div>
      </PlatformShell>
    );
  }

  if (!creator) {
    return (
      <PlatformShell>
        <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 md:px-8">
          <a href={`/${locale}/creators`} className="inline-flex items-center gap-2 text-sm opacity-55 transition hover:opacity-100" dir={ar ? "rtl" : "ltr"}>
            <ArrowLeft size={16} className={ar ? "rotate-180" : ""} />
            {ar ? "العودة إلى المبدعين" : "Back to creators"}
          </a>
          <div className="mt-6 rounded-[30px] border border-red-400/15 bg-red-500/5 p-8">
            <h1 className="text-2xl font-black">{ar ? "تعذر العثور على هذا المبدع" : "This creator could not be found"}</h1>
            <p className="mt-3 text-sm opacity-55">{error || (ar ? "تحقق من الرابط وحاول مرة أخرى." : "Check the profile URL and try again.")}</p>
          </div>
        </div>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell>
      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-5 md:px-8 lg:px-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <a href={`/${locale}/creators`} className="inline-flex items-center gap-2 text-xs font-semibold opacity-45 transition hover:opacity-100" dir={ar ? "rtl" : "ltr"}>
            <ArrowLeft size={15} className={ar ? "rotate-180" : ""} />
            {ar ? "كل المبدعين" : "All creators"}
          </a>
          <div className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] opacity-35 sm:flex">
            <Sparkles size={13} /> RAVINE Select Profile
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[36px] border" style={{ borderColor: "rgba(196,122,82,.24)", background: "linear-gradient(150deg, rgba(21,23,25,.95), rgba(9,9,9,.98))" }}>
          <div className="absolute inset-0">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover opacity-35" />
            ) : (
              <div className="h-full w-full" style={{ background: "radial-gradient(circle at 85% 15%, rgba(196,122,82,.22), transparent 34%), radial-gradient(circle at 12% 25%, rgba(24,63,70,.35), transparent 40%), linear-gradient(135deg,#183F46 0%,#151719 48%,#090909 100%)" }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/55 to-[#090909]" />
          </div>

          <div className="relative flex min-h-[430px] flex-col justify-end p-6 md:min-h-[500px] md:p-10 lg:p-12" dir={ar ? "rtl" : "ltr"}>
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.2em]" style={{ color: "#C47A52" }}>
                <span>{ar ? "مبدع RAVINE" : "RAVINE Creator"}</span>
                {verified && (
                  <span className="rounded-full border px-2 py-1" style={{ borderColor: "rgba(196,122,82,.30)" }}>
                    {ar ? "موثّق" : "Verified"}
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-end gap-5">
                  <img src={avatar} alt={displayName} className="h-24 w-24 rounded-[26px] border-2 object-cover shadow-2xl md:h-32 md:w-32" style={{ borderColor: "rgba(241,233,220,.16)", background: "#090909" }} />
                  <div className="pb-1">
                    <h1 className="text-4xl font-black tracking-[-.04em] md:text-6xl">{displayName}</h1>
                    {creator.username && <p className="mt-2 text-sm font-medium" style={{ color: "#C47A52" }}>@{creator.username}</p>}
                    <p className="mt-3 text-sm font-semibold opacity-55">{specialty}{profile?.country ? ` · ${profile.country}` : ""}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={toggleFollow} disabled={followLoading} className="rounded-full px-6 py-3 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" style={{ background: following ? "rgba(21,23,25,.84)" : "#C47A52", color: following ? "#F1E9DC" : "#090909", border: following ? "1px solid rgba(241,233,220,.12)" : "1px solid #C47A52" }}>
                    {followLoading ? (ar ? "جارٍ الحفظ" : "Saving") : following ? (ar ? "تتابعه" : "Following") : (ar ? "متابعة" : "Follow")}
                  </button>
                  {profile?.website_url && (
                    <a href={profile.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5" style={{ borderColor: "rgba(241,233,220,.12)", background: "rgba(9,9,9,.45)" }}>
                      <ExternalLink size={15} />
                      {ar ? "الموقع" : "Website"}
                    </a>
                  )}
                </div>
              </div>

              {bio && <p className="mt-7 max-w-3xl text-sm leading-7 opacity-65 md:text-base">{bio}</p>}

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold opacity-55">
                <span className="inline-flex items-center gap-2"><Users size={14} /> {formatCount(followers, locale)} {ar ? "متابع" : "followers"}</span>
                <span className="inline-flex items-center gap-2"><Film size={14} /> {formatCount(videos.length, locale)} {ar ? "عمل" : "works"}</span>
                <span className="inline-flex items-center gap-2"><Play size={14} /> {formatCount(totalViews, locale)} {ar ? "مشاهدة" : "views"}</span>
                <span className="inline-flex items-center gap-2"><Heart size={14} /> {formatCount(totalLikes, locale)} {ar ? "إعجاب" : "likes"}</span>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-500/5 p-4 text-sm text-red-200" dir={ar ? "rtl" : "ltr"}>{error}</div>
        )}

        {categorySet.length > 0 && (
          <div className="mt-7 flex flex-wrap gap-2" dir={ar ? "rtl" : "ltr"}>
            {categorySet.map((category) => (
              <span key={category} className="rounded-full border px-4 py-2 text-xs font-semibold" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.6)" }}>{category}</span>
            ))}
          </div>
        )}

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.45fr_.55fr]" dir={ar ? "rtl" : "ltr"}>
          {featuredVideo ? (
            <a href={`/${locale}/watch/${featuredVideo.id}`} className="group relative overflow-hidden rounded-[32px] border" style={{ borderColor: "rgba(241,233,220,.10)", background: "#151719" }}>
              <div className="aspect-[16/9] overflow-hidden">
                <img src={featuredVideo.thumbnail_url || "/RAVINE.png"} alt={featuredVideo.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em]" style={{ color: "#C47A52" }}><Sparkles size={14} /> {ar ? "عمل مختار" : "Featured work"}</div>
                <h2 className="max-w-3xl text-2xl font-black md:text-4xl">{featuredVideo.title}</h2>
                <p className="mt-3 line-clamp-2 max-w-2xl text-sm opacity-65">{featuredVideo.description || (ar ? "العمل الأبرز المنشور على RAVINE." : "The creator's latest featured work on RAVINE.")}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs opacity-55">
                  <span>{formatCount(featuredVideo.views ?? 0, locale)} {ar ? "مشاهدة" : "views"}</span>
                  <span>{formatCount(featuredVideo.likes ?? 0, locale)} {ar ? "إعجاب" : "likes"}</span>
                  {formatDuration(featuredVideo.duration) && <span>{formatDuration(featuredVideo.duration)}</span>}
                </div>
              </div>
            </a>
          ) : (
            <div className="rounded-[32px] border p-10" style={{ borderColor: "rgba(241,233,220,.09)", background: "#151719" }}>
              <Film size={30} className="opacity-40" />
              <h2 className="mt-5 text-2xl font-black">{ar ? "الأعمال قادمة هنا" : "The work lives here next"}</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 opacity-50">{ar ? "عندما ينشر هذا المبدع أعماله، سيظهر العمل الأبرز هنا كواجهة سينمائية." : "When this creator publishes, the strongest work will lead the profile here."}</p>
            </div>
          )}

          <div className="rounded-[32px] border p-6 md:p-7" style={{ borderColor: "rgba(24,63,70,.55)", background: "linear-gradient(150deg, rgba(24,63,70,.19), rgba(21,23,25,.78))" }}>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em]" style={{ color: "#C47A52" }}><Globe2 size={15} /> {ar ? "بروفايل مهني" : "Professional identity"}</div>
            <h2 className="mt-5 text-2xl font-black">{ar ? "الأسلوب قبل الأرقام." : "Craft before numbers."}</h2>
            <p className="mt-3 text-sm leading-7 opacity-55">{ar ? "RAVINE يعامل صفحة المبدع كهوية احترافية: تخصص، أعمال، حضور وروابط، وليس مجرد قائمة فيديوهات." : "RAVINE treats the creator page as a professional identity: craft, work, presence and links—not just a video list."}</p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(241,233,220,.08)" }}><div className="text-xl font-black">{formatCount(videos.length, locale)}</div><div className="mt-1 text-xs opacity-40">{ar ? "أعمال منشورة" : "Published works"}</div></div>
              <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(241,233,220,.08)" }}><div className="text-xl font-black">{formatCount(followers, locale)}</div><div className="mt-1 text-xs opacity-40">{ar ? "متابعون" : "Followers"}</div></div>
            </div>
          </div>
        </section>

        <section className="mt-12" dir={ar ? "rtl" : "ltr"}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] opacity-35">WORKS</p>
              <h2 className="mt-2 text-3xl font-black">{ar ? "أعمال المبدع" : "Creator works"}</h2>
            </div>
            <span className="text-xs opacity-35">{videos.length.toLocaleString(ar ? "ar-EG" : "en-US")}</span>
          </div>

          {regularVideos.length === 0 ? (
            <div className="rounded-[30px] border p-9 text-sm opacity-55" style={{ borderColor: "rgba(241,233,220,.08)", background: "rgba(21,23,25,.65)" }}>{ar ? "لا توجد أعمال منشورة إضافية حتى الآن." : "No additional published works yet."}</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {regularVideos.map((video) => (
                <a key={video.id} href={`/${locale}/watch/${video.id}`} className="group overflow-hidden rounded-[28px] border transition duration-500 hover:-translate-y-1" style={{ borderColor: "rgba(241,233,220,.08)", background: "linear-gradient(160deg, rgba(21,23,25,.88), rgba(9,9,9,.97))" }}>
                  <div className="relative aspect-video overflow-hidden bg-[#183F46]">
                    <img src={video.thumbnail_url || "/RAVINE.png"} alt={video.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
                    {formatDuration(video.duration) && <span className="absolute bottom-3 end-3 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold">{formatDuration(video.duration)}</span>}
                    <span className="absolute start-4 top-4 rounded-full border bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: "rgba(241,233,220,.15)" }}>{video.content_type === "short" ? "CUT" : "WORK"}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-lg font-black leading-6">{video.title}</h3>
                      <ArrowUpRight size={17} className="mt-1 shrink-0 opacity-30 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                    </div>
                    <p className="mt-3 text-xs opacity-40">{formatCount(video.views ?? 0, locale)} {ar ? "مشاهدة" : "views"} · {formatCount(video.likes ?? 0, locale)} {ar ? "إعجاب" : "likes"}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        <div className="mt-12 flex flex-col gap-4 rounded-[30px] border p-6 md:flex-row md:items-center md:justify-between md:p-7" style={{ borderColor: "rgba(196,122,82,.18)", background: "linear-gradient(135deg, rgba(196,122,82,.08), rgba(24,63,70,.10))" }} dir={ar ? "rtl" : "ltr"}>
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em]" style={{ color: "#C47A52" }}>RAVINE COMMUNITY</p>
            <h2 className="mt-2 text-xl font-black">{ar ? "المرحلة التالية: مساحة مجتمع المبدع." : "Next: the creator community layer."}</h2>
            <p className="mt-1 text-sm opacity-50">{ar ? "البروفايل أصبح هوية؛ لاحقًا يضاف المجتمع، التحديثات، ما وراء الكواليس والفعاليات." : "The profile is now an identity; community, updates, BTS and events plug into it next."}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold opacity-55" style={{ borderColor: "rgba(241,233,220,.10)" }}><Sparkles size={14} /> RAVINE Select</span>
        </div>

        <div className="mt-7 text-center text-xs opacity-30">
          {ar ? "حيث تصبح الرؤية سينما." : "Where vision becomes cinema."}
        </div>
      </div>
    </PlatformShell>
  );
}
