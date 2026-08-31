"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  Film,
  Gamepad2,
  Cpu,
  Music2,
  GraduationCap,
  Mic2,
  Clapperboard,
  Sparkles,
  Bell,
  Library,
  Search
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Video = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  published: boolean | null;
};

type Creator = {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

const icons: Record<string, any> = {
  cinema: Film,
  gaming: Gamepad2,
  technology: Cpu,
  music: Music2,
  education: GraduationCap,
  podcast: Mic2,
  documentary: Clapperboard,
  lifestyle: Sparkles
};

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatViews(value: number | null) {
  const n = Number(value ?? 0);

  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;

  return n.toLocaleString();
}

export default function HomePage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = createClient();

  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [dark, setDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const userResult = await supabase.auth.getUser();

      setCurrentUser(userResult.data.user ?? null);

      const [videoResult, creatorResult, categoryResult] =
        await Promise.all([
          supabase
            .from("videos")
            .select(
              "id,title,description,thumbnail_url,duration,views,likes,published"
            )
            .eq("published", true)
            .order("created_at", { ascending: false })
            .limit(12),

          supabase
            .from("creators")
            .select("id,name,username,avatar_url,bio")
            .order("id", { ascending: true })
            .limit(8),

          supabase
            .from("categories")
            .select("id,name,slug")
            .order("name", { ascending: true })
        ]);

      const firstError =
        videoResult.error ||
        creatorResult.error ||
        categoryResult.error;

      if (firstError) {
        setError(firstError.message);
      }

      setVideos(videoResult.data ?? []);
      setCreators(creatorResult.data ?? []);
      setCategories(categoryResult.data ?? []);

      setLoading(false);
    }

    void load();
  }, []);

  const bg = dark ? "#090909" : "#F1E9DC";
  const card = dark ? "#151719" : "#F8F4EC";
  const text = dark ? "#F1E9DC" : "#090909";
  const secondary = dark
    ? "rgba(241,233,220,.55)"
    : "rgba(23,23,23,.58)";
  const border = dark
    ? "rgba(241,233,220,.09)"
    : "rgba(23,23,23,.10)";

  function doSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = search.trim();

    if (!query) return;

    window.location.href =
      `/${locale}/search?q=${encodeURIComponent(query)}`;
  }

  const heroVideo = videos[0] ?? null;

  const fallbackCategories: Category[] = [
    { id: 1, name: "Cinema", slug: "cinema" },
    { id: 2, name: "Gaming", slug: "gaming" },
    { id: 3, name: "Technology", slug: "technology" },
    { id: 4, name: "Music", slug: "music" },
    { id: 5, name: "Education", slug: "education" },
    { id: 6, name: "Podcast", slug: "podcast" },
    { id: 7, name: "Documentary", slug: "documentary" },
    { id: 8, name: "Lifestyle", slug: "lifestyle" }
  ];

  const visibleCategories =
    categories.length > 0
      ? categories.slice(0, 8)
      : fallbackCategories;

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen"
      style={{
        backgroundColor: bg,
        color: text
      }}
    >
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          backgroundColor: dark
            ? "rgba(9,9,9,.94)"
            : "rgba(241,233,220,.96)",
          borderColor: border
        }}
      >
        <div className="mx-auto flex h-[100px] max-w-7xl items-center justify-between gap-6 px-5 md:px-8 lg:px-12">
          <div className="flex min-w-0 items-center gap-8">
            <a
              href={`/${locale}`}
              className="shrink-0"
            >
              <img
                src="/RAVINE.png"
                alt="RAVINE"
                className={`h-[76px] w-auto object-contain ${
                  dark ? "" : "invert"
                }`}
              />
            </a>

            <nav className="hidden items-center gap-7 text-sm md:flex">
              <a href={`/${locale}`}>
                {isArabic ? "الرئيسية" : "Home"}
              </a>

              <a
                href="#discover"
                style={{ color: secondary }}
              >
                {isArabic ? "اكتشف" : "Discover"}
              </a>

              <a
                href="#categories"
                style={{ color: secondary }}
              >
                {isArabic ? "التصنيفات" : "Categories"}
              </a>

              <a
                href="#creators"
                style={{ color: secondary }}
              >
                {isArabic ? "المبدعون" : "Creators"}
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <form
              onSubmit={doSearch}
              className="hidden sm:flex"
            >
              <div
                className="flex items-center rounded-full border px-3"
                style={{
                  backgroundColor: card,
                  borderColor: border
                }}
              >
                <Search
                  size={16}
                  style={{ color: secondary }}
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder={
                    isArabic
                      ? "ابحث في RAVINE..."
                      : "Search RAVINE..."
                  }
                  className="w-40 bg-transparent px-3 py-2 text-sm outline-none"
                  style={{ color: text }}
                />
              </div>
            </form>

            <a
              href={isArabic ? "/en" : "/ar"}
              className="rounded-full border px-3 py-2 text-xs font-semibold"
              style={{
                backgroundColor: card,
                borderColor: border
              }}
            >
              {isArabic ? "English" : "العربية"}
            </a>

            <button
              type="button"
              onClick={() => setDark((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-full border"
              style={{
                backgroundColor: card,
                borderColor: border
              }}
            >
              {dark ? "☀" : "☾"}
            </button>

            <a
              href={`/${locale}/library`}
              className="hidden rounded-full border p-2.5 sm:block"
              style={{ borderColor: border }}
            >
              <Library size={17} />
            </a>

            <a
              href={`/${locale}/notifications`}
              className="hidden rounded-full border p-2.5 sm:block"
              style={{ borderColor: border }}
            >
              <Bell size={17} />
            </a>

            <a
              href={`/${locale}/creator`}
              className="hidden text-sm sm:block"
            >
              {isArabic ? "إنشاء" : "Create"}
            </a>

            {currentUser ? (
              <a
                href={`/${locale}/library`}
                className="rounded-full border px-3 py-2 text-xs font-semibold"
                style={{
                  backgroundColor: card,
                  borderColor: border
                }}
              >
                {currentUser.email?.split("@")[0] || "Account"}
              </a>
            ) : (
              <a
                href={`/${locale}/auth`}
                className="rounded-full px-4 py-2 text-sm font-bold"
                style={{
                  backgroundColor: "#C47A52",
                  color: bg
                }}
              >
                {isArabic
                  ? "تسجيل الدخول"
                  : "Sign In"}
              </a>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[5%] top-[10%] h-80 w-80 rounded-full bg-[#C47A52]/20 blur-[120px]" />
          <div className="absolute right-[4%] top-[4%] h-[30rem] w-[30rem] rounded-full bg-[#183F46]/65 blur-[130px]" />
        </div>

        <div className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-14 px-5 py-16 md:px-8 lg:grid-cols-2 lg:gap-20">
          <div>
            <span
              className="text-xs font-bold uppercase tracking-[.25em]"
              style={{ color: secondary }}
            >
              {isArabic
                ? "مميّز اليوم"
                : "FEATURES TODAY"}
            </span>

            <h1 className="mt-5 max-w-3xl py-3 text-5xl font-black leading-[1.02] tracking-[-0.055em] md:text-6xl lg:text-[5.25rem]">
              {isArabic
                ? "مساحة للأصوات الأصلية"
                : "A PLACE FOR ORIGINAL VOICES"}
            </h1>

            <p
              className="mt-7 text-lg font-light tracking-wide md:text-xl"
              style={{ color: secondary }}
            >
              {isArabic
                ? "اصنع. شارك. اكتشف."
                : "Create. Share. Discover."}
            </p>

            <p
              className="mt-5 max-w-xl text-sm leading-7"
              style={{ color: secondary }}
            >
              {isArabic
                ? "مساحة للمبدعين والفيديوهات والأفكار التي تستحق أن تُكتشف."
                : "A creator-first home for remarkable videos, curious audiences, and ideas that deserve to be discovered."}
            </p>

            <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {visibleCategories.map((category) => {
                const Icon =
                  icons[category.slug] || Sparkles;

                return (
                  <a
                    key={category.id}
                    href={`/${locale}/search?q=${encodeURIComponent(
                      category.name
                    )}`}
                    className="group flex min-h-[115px] flex-col items-center justify-center gap-3 rounded-2xl border px-4 py-5 text-sm transition hover:-translate-y-1"
                    style={{
                      backgroundColor: card,
                      borderColor: border
                    }}
                  >
                    <Icon
                      size={24}
                      strokeWidth={1.7}
                      className="transition group-hover:scale-110"
                    />

                    <span className="text-center">
                      {category.name}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          <a
            href={
              heroVideo
                ? `/${locale}/watch/${heroVideo.id}`
                : `/${locale}/search`
            }
            className="block overflow-hidden rounded-2xl border transition hover:-translate-y-1"
            style={{
              backgroundColor: card,
              borderColor: border
            }}
          >
            <div className="relative aspect-video overflow-hidden bg-[#183F46]">
              <img
                src={
                  heroVideo?.thumbnail_url ||
                  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200"
                }
                alt={heroVideo?.title || "RAVINE"}
                className="h-full w-full object-cover"
              />

              {heroVideo?.duration && (
                <span className="absolute bottom-4 right-4 rounded bg-black/80 px-2 py-1 text-xs text-white">
                  {formatDuration(heroVideo.duration)}
                </span>
              )}
            </div>

            <div className="p-6">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: secondary }}
              >
                RAVINE
              </span>

              <h2 className="mt-3 text-xl font-bold">
                {heroVideo?.title ||
                  (isArabic
                    ? "اكتشف RAVINE"
                    : "Discover RAVINE")}
              </h2>

              <p
                className="mt-2 text-xs"
                style={{ color: secondary }}
              >
                {heroVideo
                  ? `${formatViews(heroVideo.views)} views`
                  : isArabic
                    ? "محتوى يستحق الاكتشاف"
                    : "Content worth discovering"}
              </p>
            </div>
          </a>
        </div>
      </section>

      <section
        id="discover"
        className="mx-auto max-w-7xl px-5 py-16 md:px-8"
      >
        <div className="mb-8">
          <span
            className="text-xs font-bold uppercase tracking-[.25em]"
            style={{ color: secondary }}
          >
            {isArabic
              ? "جديد من المجتمع"
              : "FRESH FROM THE COMMUNITY"}
          </span>

          <h2 className="mt-2 text-3xl font-bold">
            {isArabic
              ? "ماذا يحدث الآن"
              : "What's happening"}
          </h2>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-xl border"
                style={{
                  backgroundColor: card,
                  borderColor: border
                }}
              >
                <div className="aspect-video animate-pulse bg-[#183F46]/20" />

                <div className="space-y-3 p-4">
                  <div className="h-4 w-4/5 animate-pulse rounded bg-[#183F46]/20" />
                  <div className="h-3 w-3/5 animate-pulse rounded bg-[#183F46]/20" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div
            className="rounded-2xl border p-8 text-sm"
            style={{
              backgroundColor: card,
              borderColor: border,
              color: secondary
            }}
          >
            {isArabic
              ? "لا يوجد محتوى منشور حاليًا."
              : "No published content yet."}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <a
                key={video.id}
                href={`/${locale}/watch/${video.id}`}
                className="overflow-hidden rounded-xl border transition hover:-translate-y-1"
                style={{
                  backgroundColor: card,
                  borderColor: border
                }}
              >
                <div className="relative aspect-video overflow-hidden bg-[#183F46]">
                  <img
                    src={
                      video.thumbnail_url ||
                      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900"
                    }
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />

                  {video.duration && (
                    <span className="absolute bottom-3 right-3 rounded bg-black/80 px-2 py-1 text-xs text-white">
                      {formatDuration(video.duration)}
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold leading-6">
                    {video.title}
                  </h3>

                  <p
                    className="mt-2 text-xs"
                    style={{ color: secondary }}
                  >
                    {formatViews(video.views)} views ·{" "}
                    {Number(video.likes ?? 0).toLocaleString()} likes
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section
        id="categories"
        className="border-y py-16"
        style={{
          backgroundColor: dark ? "#183F46" : "#E8E2D8",
          borderColor: border
        }}
      >
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <span
            className="text-xs font-bold uppercase tracking-[.25em]"
            style={{ color: secondary }}
          >
            {isArabic
              ? "اتبع فضولك"
              : "FOLLOW YOUR CURIOSITY"}
          </span>

          <h2 className="mt-2 text-3xl font-bold">
            {isArabic
              ? "تصفح التصنيفات"
              : "Browse categories"}
          </h2>

          <div className="mt-9 flex flex-wrap gap-3">
            {visibleCategories.map((category) => {
              const Icon =
                icons[category.slug] || Sparkles;

              return (
                <a
                  key={category.id}
                  href={`/${locale}/search?q=${encodeURIComponent(
                    category.name
                  )}`}
                  className="rounded-full border px-5 py-2.5 text-sm transition hover:-translate-y-0.5"
                  style={{
                    backgroundColor: dark
                      ? "#151719"
                      : "#F8F4EC",
                    borderColor: dark
                      ? "rgba(196,122,82,.24)"
                      : "rgba(24,63,70,.18)"
                  }}
                >
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{category.name}</span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="creators"
        className="mx-auto max-w-7xl px-5 py-16 md:px-8"
      >
        <span
          className="text-xs font-bold uppercase tracking-[.25em]"
          style={{ color: secondary }}
        >
          {isArabic
            ? "أشخاص يستحقون المعرفة"
            : "PEOPLE TO KNOW"}
        </span>

        <h2 className="mt-2 text-3xl font-bold">
          {isArabic
            ? "مبدعون يستحقون الاكتشاف"
            : "Creators worth discovering"}
        </h2>

        {creators.length === 0 ? (
          <div
            className="mt-8 rounded-3xl border p-8 text-sm"
            style={{
              backgroundColor: card,
              borderColor: border,
              color: secondary
            }}
          >
            {isArabic
              ? "لا يوجد مبدعون حاليًا."
              : "No creators yet."}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {creators.map((creator) => (
              <a
                key={creator.id}
                href={`/${locale}/creator/${
                  creator.username || creator.id
                }`}
                className="rounded-xl border p-5 text-center transition hover:-translate-y-1"
                style={{
                  backgroundColor: card,
                  borderColor: border
                }}
              >
                <img
                  src={
                    creator.avatar_url ||
                    "https://i.pravatar.cc/150"
                  }
                  alt={creator.name}
                  className="mx-auto h-20 w-20 rounded-full object-cover"
                />

                <h3 className="mt-4 text-sm font-bold">
                  {creator.name}
                </h3>

                {creator.username && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: secondary }}
                  >
                    @{creator.username}
                  </p>
                )}

                {creator.bio && (
                  <p
                    className="mt-2 line-clamp-2 text-xs leading-5"
                    style={{ color: secondary }}
                  >
                    {creator.bio}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div
          className="rounded-3xl border p-10 text-center md:p-14"
          style={{
            background:
              dark
                ? "linear-gradient(110deg,#111318,#16181D)"
                : "linear-gradient(110deg,#E8E2D8,#FFFFFF)",
            borderColor: border
          }}
        >
          <span
            className="text-xs font-bold uppercase tracking-[.25em]"
            style={{ color: secondary }}
          >
            {isArabic
              ? "مكان عملك هنا"
              : "YOUR WORK BELONGS HERE"}
          </span>

          <h2 className="mt-3 text-3xl font-black md:text-4xl">
            {isArabic
              ? "اصنع شيئًا يستحق أن يُكتشف."
              : "Make something worth finding."}
          </h2>

          <p
            className="mx-auto mt-4 max-w-lg text-sm leading-7"
            style={{ color: secondary }}
          >
            {isArabic
              ? "انشر بطريقتك ووصل إلى الأشخاص الذين يهتمون بما تصنع."
              : "Publish on your terms and reach people who care about what you create."}
          </p>

          <a
            href={`/${locale}/creator`}
            className="mt-8 inline-block rounded-full px-8 py-3 text-sm font-bold"
            style={{
              backgroundColor: "#C47A52",
              color: bg
            }}
          >
            {isArabic
              ? "أنشئ قناتك"
              : "Create your channel"}
          </a>
        </div>
      </section>

      <footer
        className="border-t px-5 py-12 md:px-8"
        style={{ borderColor: border }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-xs md:flex-row md:items-center md:justify-between">
          <span className="font-bold tracking-widest">
            RAVINE
          </span>

          <span style={{ color: secondary }}>
            © 2026 RAVINE.{" "}
            {isArabic
              ? "صُنعت للأصوات الأصلية."
              : "Built for original voices."}
          </span>

          <div
            className="flex gap-5"
            style={{ color: secondary }}
          >
            <span>Instagram</span>
            <span>X</span>
            <span>Vimeo</span>
          </div>
        </div>
      </footer>
    </main>
  );
}