"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Clapperboard,
  Compass,
  Film,
  Gamepad2,
  Home,
  Library,
  Menu,
  Mic2,
  Moon,
  Palette,
  Play,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import AuthModal from "@/components/AuthModal";

type VideoRecord = {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  views?: number | null;
  created_at?: string | null;
  creator_id?: string | null;
  category_id?: string | null;
  status?: string | null;
  visibility?: string | null;
};

type Creator = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
};

type Category = {
  id: string;
  name?: string | null;
  slug?: string | null;
};

type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
};

const categoryIcons = [
  Film,
  Clapperboard,
  Gamepad2,
  Mic2,
  Video,
  Sparkles,
];

const fallbackCategories: Category[] = [
  { id: "movies", name: "Movies", slug: "movies" },
  { id: "series", name: "Series", slug: "series" },
  { id: "gaming", name: "Gaming", slug: "gaming" },
  { id: "music", name: "Music", slug: "music" },
  { id: "podcasts", name: "Podcasts", slug: "podcasts" },
  { id: "documentary", name: "Documentary", slug: "documentary" },
];

const rangeLabels = ["All", "Today", "This week", "This month"];

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remaining
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatViews(value: number | null | undefined) {
  if (!value) return "0";

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(
      value >= 10_000_000 ? 0 : 1
    )}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(
      value >= 10_000 ? 0 : 1
    )}K`;
  }

  return value.toString();
}

function formatDate(date: string | null | undefined) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HomePage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [, setAuthResolved] = useState(false);

  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    try {
      const storedTheme =
        window.localStorage.getItem("ravine-theme");

      if (storedTheme === "light") {
        setDarkMode(false);
      } else if (storedTheme === "dark") {
        setDarkMode(true);
      } else {
        setDarkMode(
          !window.matchMedia ||
            window.matchMedia(
              "(prefers-color-scheme: dark)"
            ).matches
        );
      }
    } catch {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "ravine-theme",
        darkMode ? "dark" : "light"
      );
    } catch {
      // Ignore storage failures.
    }
  }, [darkMode]);

  useEffect(() => {
    let mounted = true;

    async function loadHome() {
      setLoading(true);

      try {
        const [
          videosResponse,
          categoriesResponse,
          profileResponse,
        ] = await Promise.all([
          supabase
            .from("videos")
            .select(
              "id,title,description,thumbnail_url,duration_seconds,views,created_at,creator_id,category_id,status,visibility"
            )
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
            .limit(32),

          supabase
            .from("categories")
            .select("id,name,slug")
            .order("name", { ascending: true })
            .limit(12),

          supabase.auth.getUser(),
        ]);

        if (!mounted) return;

        const loadedVideos = (videosResponse.data ??
          []) as VideoRecord[];

        const loadedCategories =
          (categoriesResponse.data ??
            []) as Category[];

        setVideos(loadedVideos);

        setCategories(
          loadedCategories.length > 0
            ? loadedCategories
            : fallbackCategories
        );

        const user = profileResponse.data.user;

        if (user?.id) {
          const { data: currentProfile } =
            await supabase
              .from("profiles")
              .select(
                "id,username,display_name,avatar_url"
              )
              .eq("id", user.id)
              .maybeSingle();

          if (mounted) {
            setProfile(
              (currentProfile ??
                null) as Profile | null
            );
          }
        }

        const creatorIds = Array.from(
          new Set(
            loadedVideos
              .map((video: VideoRecord) => video.creator_id)
              .filter(Boolean) as string[]
          )
        ).slice(0, 16);

        if (creatorIds.length > 0) {
          const { data: loadedCreators } =
            await supabase
              .from("profiles")
              .select(
                "id,username,display_name,avatar_url,bio"
              )
              .in("id", creatorIds);

          if (mounted) {
            setCreators(
              (loadedCreators ?? []) as Creator[]
            );
          }
        } else {
          setCreators([]);
        }
      } catch {
        if (!mounted) return;

        setVideos([]);
        setCreators([]);
        setCategories(fallbackCategories);
      } finally {
        if (mounted) {
          setLoading(false);
          setAuthResolved(true);
        }
      }
    }

    loadHome();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const primaryNav: NavItem[] = [
    {
      label: isArabic ? "الرئيسية" : "Home",
      href: `/${locale}`,
      icon: Home,
    },
    {
      label: isArabic ? "استكشف" : "Explore",
      href: `/${locale}/explore`,
      icon: Compass,
    },
    {
      label: isArabic ? "المكتبة" : "Library",
      href: `/${locale}/library`,
      icon: Library,
    },
    {
      label: isArabic ? "الأشخاص" : "Creators",
      href: `/${locale}/creators`,
      icon: Users,
    },
  ];

  const secondaryNav: NavItem[] = [
    {
      label: isArabic ? "الفيديوهات" : "Videos",
      href: `/${locale}/videos`,
      icon: Play,
    },
    {
      label: isArabic ? "الشورتس" : "Shorts",
      href: `/${locale}/shorts`,
      icon: Zap,
    },
    {
      label: isArabic ? "البودكاست" : "Podcasts",
      href: `/${locale}/podcasts`,
      icon: Mic2,
    },
    {
      label: isArabic ? "البث المباشر" : "Live",
      href: `/${locale}/live`,
      icon: Video,
    },
  ];

  const filteredVideos = useMemo<VideoRecord[]>(
    () => {
      let result: VideoRecord[] = [...videos];

      if (searchQuery.trim()) {
        const query =
          searchQuery.trim().toLowerCase();

        result = result.filter(
          (video: VideoRecord) => {
            const title =
              video.title?.toLowerCase() ?? "";

            const description =
              video.description?.toLowerCase() ?? "";

            return (
              title.includes(query) ||
              description.includes(query)
            );
          }
        );
      }

      if (activeRange !== "All") {
        const now = Date.now();

        const days =
          activeRange === "Today"
            ? 1
            : activeRange === "This week"
              ? 7
              : 30;

        const threshold =
          now - days * 24 * 60 * 60 * 1000;

        result = result.filter(
          (video: VideoRecord) => {
            if (!video.created_at) return true;

            const timestamp = new Date(
              video.created_at
            ).getTime();

            return timestamp >= threshold;
          }
        );
      }

      return result;
    },
    [videos, searchQuery, activeRange]
  );

  const trendingVideos: VideoRecord[] =
    filteredVideos.slice(0, 6);

  const freshVideos: VideoRecord[] =
    filteredVideos.slice(6, 14);

  const liveVideos: VideoRecord[] =
    filteredVideos
      .filter(
        (video: VideoRecord) =>
          video.status === "live"
      )
      .slice(0, 4);

  const displayCreators: Creator[] =
    creators.slice(0, 8);

  const pageBg = darkMode
    ? "bg-[#090909]"
    : "bg-[#F4EEE5]";

  const textPrimary = darkMode
    ? "text-[#F1E9DC]"
    : "text-[#181716]";

  const borderColor = darkMode
    ? "border-[#F1E9DC]/[0.08]"
    : "border-[#241F1B]/[0.09]";

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`min-h-screen overflow-x-hidden ${pageBg} ${textPrimary}`}
    >
      <aside
        id="ravine-home-sidebar"
        className={[
          "fixed inset-y-0 start-0 z-[100] flex w-[min(88vw,340px)] flex-col",
          "border-e backdrop-blur-xl",
          "transition-transform duration-300 ease-out",
          sidebarOpen
            ? "translate-x-0"
            : isArabic
              ? "translate-x-full"
              : "-translate-x-full",
          darkMode
            ? "border-white/[0.08] bg-[#0D1011]/[0.97] shadow-[24px_0_70px_rgba(0,0,0,0.42)]"
            : "border-[#1D1814]/[0.08] bg-[#F8F3EB]/[0.98] shadow-[24px_0_70px_rgba(49,39,29,0.15)]",
        ].join(" ")}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={`border-b px-5 pb-5 pt-5 ${borderColor}`}
          >
            <div className="flex items-start justify-between gap-4">
              <Link
                href={`/${locale}`}
                onClick={closeSidebar}
                className="group flex min-w-0 items-center gap-3"
              >
                <span
                  className={[
                    "grid size-11 shrink-0 place-items-center border",
                    "transition-transform duration-200 group-hover:scale-[1.03]",
                    darkMode
                      ? "border-[#C47A52]/35 bg-[#C47A52]/[0.09]"
                      : "border-[#C47A52]/30 bg-[#C47A52]/[0.08]",
                  ].join(" ")}
                >
                  <img
                    src="/logo.png"
                    alt="RAVINE"
                    className="size-7 object-contain"
                  />
                </span>

                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold tracking-[0.20em]">
                    RAVINE
                  </span>

                  <span
                    className={[
                      "mt-1 block text-[9px] font-medium uppercase tracking-[0.22em]",
                      darkMode
                        ? "text-[#C47A52]"
                        : "text-[#A95F39]",
                    ].join(" ")}
                  >
                    Creative Platform
                  </span>
                </span>
              </Link>

              <button
                type="button"
                onClick={closeSidebar}
                aria-label={
                  isArabic
                    ? "إغلاق القائمة"
                    : "Close menu"
                }
                className={[
                  "grid size-9 shrink-0 place-items-center border transition",
                  darkMode
                    ? "border-white/[0.08] bg-white/[0.03] text-[#B7B1AA] hover:border-[#C47A52]/40 hover:bg-[#C47A52]/10 hover:text-[#F1E9DC]"
                    : "border-[#241F1B]/[0.09] bg-black/[0.025] text-[#6B625A] hover:border-[#C47A52]/40 hover:bg-[#C47A52]/10 hover:text-[#241F1B]",
                ].join(" ")}
              >
                <X size={17} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
            <div className="mb-3 px-3">
              <span
                className={[
                  "text-[9px] font-semibold uppercase tracking-[0.24em]",
                  darkMode
                    ? "text-[#6F7475]"
                    : "text-[#9B9188]",
                ].join(" ")}
              >
                {isArabic
                  ? "التنقل"
                  : "Navigation"}
              </span>
            </div>

            <nav className="space-y-1.5">
              {primaryNav.map((item) => {
                const Icon = item.icon;

                const active =
                  item.label ===
                  (isArabic
                    ? "الرئيسية"
                    : "Home");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    className={[
                      "group relative flex min-h-[48px] items-center gap-3 px-3 transition",
                      active
                        ? darkMode
                          ? "bg-[#C47A52]/[0.10] text-[#F1E9DC]"
                          : "bg-[#C47A52]/[0.09] text-[#201A16]"
                        : darkMode
                          ? "text-[#A8AAA8] hover:bg-white/[0.035] hover:text-[#F1E9DC]"
                          : "text-[#706962] hover:bg-black/[0.025] hover:text-[#201A16]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute inset-y-2 start-0 w-[2px] transition-opacity",
                        active
                          ? "bg-[#C47A52] opacity-100"
                          : "bg-[#C47A52] opacity-0 group-hover:opacity-60",
                      ].join(" ")}
                    />

                    <span
                      className={[
                        "grid size-9 place-items-center border transition",
                        active
                          ? darkMode
                            ? "border-[#C47A52]/30 bg-[#C47A52]/10 text-[#C47A52]"
                            : "border-[#C47A52]/25 bg-[#C47A52]/10 text-[#A95F39]"
                          : darkMode
                            ? "border-white/[0.06] bg-white/[0.02]"
                            : "border-[#241F1B]/[0.07] bg-black/[0.018]",
                      ].join(" ")}
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.8}
                      />
                    </span>

                    <span className="flex-1 text-[13px] font-medium">
                      {item.label}
                    </span>

                    {active && (
                      <span className="size-1.5 bg-[#C47A52]" />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div
              className={`my-6 border-t ${borderColor}`}
            />

            <div className="mb-3 px-3">
              <span
                className={[
                  "text-[9px] font-semibold uppercase tracking-[0.24em]",
                  darkMode
                    ? "text-[#6F7475]"
                    : "text-[#9B9188]",
                ].join(" ")}
              >
                {isArabic
                  ? "مساحتك"
                  : "Your space"}
              </span>
            </div>

            <nav className="space-y-1">
              {secondaryNav.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    className={[
                      "group flex min-h-[44px] items-center gap-3 px-3 transition",
                      darkMode
                        ? "text-[#969B9A] hover:bg-white/[0.03] hover:text-[#F1E9DC]"
                        : "text-[#766D65] hover:bg-black/[0.025] hover:text-[#201B18]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid size-8 place-items-center border transition",
                        darkMode
                          ? "border-white/[0.05] bg-white/[0.018] group-hover:border-[#C47A52]/20 group-hover:bg-[#C47A52]/[0.07] group-hover:text-[#C47A52]"
                          : "border-[#241F1B]/[0.07] bg-black/[0.015] group-hover:border-[#C47A52]/20 group-hover:bg-[#C47A52]/[0.07] group-hover:text-[#A95F39]",
                      ].join(" ")}
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.7}
                      />
                    </span>

                    <span className="text-[12px] font-medium">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div
              className={[
                "mt-7 border p-4",
                darkMode
                  ? "border-[#C47A52]/20 bg-[#C47A52]/[0.055]"
                  : "border-[#C47A52]/20 bg-[#C47A52]/[0.045]",
              ].join(" ")}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={[
                    "text-[9px] font-semibold uppercase tracking-[0.18em]",
                    darkMode
                      ? "text-[#C47A52]"
                      : "text-[#A95F39]",
                  ].join(" ")}
                >
                  {isArabic
                    ? "مساحة صانع المحتوى"
                    : "Creator space"}
                </span>

                <Sparkles
                  size={15}
                  className={
                    darkMode
                      ? "text-[#C47A52]"
                      : "text-[#A95F39]"
                  }
                  strokeWidth={1.7}
                />
              </div>

              <p
                className={[
                  "text-[11px] leading-5",
                  darkMode
                    ? "text-[#A6A29B]"
                    : "text-[#716861]",
                ].join(" ")}
              >
                {isArabic
                  ? "انشر أعمالك وابنِ حضورك الإبداعي داخل RAVINE."
                  : "Publish your work and build your creative presence on RAVINE."}
              </p>

              <Link
                href={`/${locale}/studio`}
                onClick={closeSidebar}
                className={[
                  "mt-4 flex items-center justify-between border px-3 py-2.5 text-[11px] font-semibold transition",
                  darkMode
                    ? "border-[#C47A52]/25 bg-[#C47A52]/10 text-[#F1E9DC] hover:bg-[#C47A52]/15"
                    : "border-[#C47A52]/25 bg-[#C47A52]/10 text-[#332720] hover:bg-[#C47A52]/15",
                ].join(" ")}
              >
                <span>
                  {isArabic
                    ? "افتح الاستوديو"
                    : "Open Studio"}
                </span>

                <ArrowUpRight
                  size={15}
                  strokeWidth={1.8}
                />
              </Link>
            </div>
          </div>

          <div
            className={`border-t p-3 ${borderColor}`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDarkMode((value) => !value)
                }
                className={[
                  "flex min-h-[42px] flex-1 items-center gap-2 border px-3 text-[11px] font-medium transition",
                  darkMode
                    ? "border-white/[0.07] bg-white/[0.02] text-[#A8AAA8] hover:border-[#C47A52]/20 hover:text-[#F1E9DC]"
                    : "border-[#241F1B]/[0.08] bg-black/[0.02] text-[#706962] hover:border-[#C47A52]/20 hover:text-[#201A16]",
                ].join(" ")}
              >
                {darkMode ? (
                  <Moon
                    size={15}
                    strokeWidth={1.8}
                  />
                ) : (
                  <Sun
                    size={15}
                    strokeWidth={1.8}
                  />
                )}

                <span>
                  {darkMode ? "Dark" : "Light"}
                </span>
              </button>

              <Link
                href={`/${locale}/settings`}
                onClick={closeSidebar}
                className={[
                  "grid size-[42px] place-items-center border transition",
                  darkMode
                    ? "border-white/[0.07] bg-white/[0.02] text-[#A8AAA8] hover:border-[#C47A52]/20 hover:text-[#F1E9DC]"
                    : "border-[#241F1B]/[0.08] bg-black/[0.02] text-[#706962] hover:border-[#C47A52]/20 hover:text-[#201A16]",
                ].join(" ")}
              >
                <Settings2
                  size={16}
                  strokeWidth={1.8}
                />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label={
            isArabic
              ? "إغلاق القائمة الجانبية"
              : "Close sidebar"
          }
          onClick={closeSidebar}
          className="fixed inset-0 z-[80] cursor-default bg-black/55 backdrop-blur-[2px]"
        />
      )}

      <div className="relative z-10 min-h-screen">
        <header
          className={[
            "sticky top-0 z-[60] border-b backdrop-blur-xl",
            darkMode
              ? "border-white/[0.06] bg-[#090909]/85"
              : "border-[#241F1B]/[0.07] bg-[#F4EEE5]/85",
          ].join(" ")}
        >
          <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:px-6 xl:px-8">
            <button
              type="button"
              onClick={() =>
                setSidebarOpen((value) => !value)
              }
              aria-expanded={sidebarOpen}
              aria-controls="ravine-home-sidebar"
              aria-label={
                isArabic
                  ? "فتح القائمة"
                  : "Open menu"
              }
              className={[
                "grid size-11 shrink-0 place-items-center border transition",
                darkMode
                  ? "border-white/[0.08] bg-white/[0.025] text-[#C7C5C1] hover:border-[#C47A52]/35 hover:bg-[#C47A52]/10 hover:text-[#F1E9DC]"
                  : "border-[#241F1B]/[0.08] bg-black/[0.02] text-[#514A44] hover:border-[#C47A52]/35 hover:bg-[#C47A52]/10 hover:text-[#241F1B]",
              ].join(" ")}
            >
              {sidebarOpen ? (
                <X
                  size={19}
                  strokeWidth={1.8}
                />
              ) : (
                <Menu
                  size={19}
                  strokeWidth={1.8}
                />
              )}
            </button>

            <Link
              href={`/${locale}`}
              className="flex shrink-0 items-center gap-2.5"
            >
              <img
                src="/logo.png"
                alt="RAVINE"
                className="size-7 object-contain"
              />

              <span className="hidden text-[14px] font-semibold tracking-[0.18em] sm:block">
                RAVINE
              </span>
            </Link>

            <div
              className={[
                "mx-1 hidden h-6 w-px sm:block",
                darkMode
                  ? "bg-white/[0.08]"
                  : "bg-[#241F1B]/[0.08]",
              ].join(" ")}
            />

            <div className="min-w-0 flex-1">
              <div
                className={[
                  "mx-auto flex max-w-[620px] items-center gap-3 border px-4",
                  darkMode
                    ? "border-white/[0.07] bg-white/[0.025]"
                    : "border-[#241F1B]/[0.08] bg-black/[0.018]",
                ].join(" ")}
              >
                <Search
                  size={17}
                  className={
                    darkMode
                      ? "text-[#7F8584]"
                      : "text-[#948B83]"
                  }
                  strokeWidth={1.7}
                />

                <input
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  placeholder={
                    isArabic
                      ? "ابحث عن أعمال، صناع، أفلام..."
                      : "Search work, creators, films..."
                  }
                  className={[
                    "h-11 min-w-0 flex-1 bg-transparent text-[12px] outline-none",
                    darkMode
                      ? "text-[#F1E9DC] placeholder:text-[#696E6E]"
                      : "text-[#201B18] placeholder:text-[#9B9188]",
                  ].join(" ")}
                />
              </div>
            </div>

            <button
              type="button"
              aria-label={
                isArabic
                  ? "الإشعارات"
                  : "Notifications"
              }
              className={[
                "grid size-11 shrink-0 place-items-center border transition",
                darkMode
                  ? "border-white/[0.08] bg-white/[0.025] text-[#9FA3A1] hover:border-[#C47A52]/25 hover:text-[#F1E9DC]"
                  : "border-[#241F1B]/[0.08] bg-black/[0.02] text-[#766D65] hover:border-[#C47A52]/25 hover:text-[#241F1B]",
              ].join(" ")}
            >
              <Bell
                size={18}
                strokeWidth={1.75}
              />
            </button>

            {profile ? (
              <Link
                href={`/${locale}/profile`}
                aria-label={
                  isArabic
                    ? "الملف الشخصي"
                    : "Profile"
                }
                className={[
                  "grid size-11 shrink-0 place-items-center overflow-hidden border",
                  darkMode
                    ? "border-white/[0.08] bg-[#151719]"
                    : "border-[#241F1B]/[0.08] bg-[#E8E0D6]",
                ].join(" ")}
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={
                      profile.display_name ??
                      "Profile"
                    }
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-[12px] font-semibold">
                    {(
                      profile.display_name ??
                      profile.username ??
                      "R"
                    )[0].toUpperCase()}
                  </span>
                )}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="hidden h-11 border border-[#C47A52]/40 bg-[#C47A52] px-4 text-[11px] font-semibold tracking-[0.08em] text-[#160F0B] transition hover:bg-[#D38A60] sm:block"
              >
                {isArabic
                  ? "دخول"
                  : "Sign in"}
              </button>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 xl:px-8">
          <section className="pt-7 lg:pt-10">
            <div
              className={[
                "relative overflow-hidden border",
                darkMode
                  ? "border-white/[0.07] bg-[#111416]"
                  : "border-[#241F1B]/[0.08] bg-[#FBF8F2]",
              ].join(" ")}
            >
              <div className="grid min-h-[420px] lg:grid-cols-[1.18fr_0.82fr]">
                <div className="relative z-10 flex flex-col justify-end p-7 sm:p-10 lg:p-14">
                  <div className="mb-5 flex items-center gap-2">
                    <span className="h-px w-8 bg-[#C47A52]" />

                    <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#C47A52]">
                      {isArabic
                        ? "منصة إبداعية"
                        : "Creative Platform"}
                    </span>
                  </div>

                  <h1
                    className={[
                      "max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-7xl",
                      darkMode
                        ? "text-[#F1E9DC]"
                        : "text-[#201B18]",
                    ].join(" ")}
                  >
                    {isArabic
                      ? "شاهد. اصنع. اترك أثرًا."
                      : "Watch. Create. Leave a mark."}
                  </h1>

                  <p
                    className={[
                      "mt-6 max-w-2xl text-sm leading-7 sm:text-[15px]",
                      darkMode
                        ? "text-[#A9A49D]"
                        : "text-[#756C64]",
                    ].join(" ")}
                  >
                    {isArabic
                      ? "RAVINE تجمع السينما، الموسيقى، الرياضة، الألعاب وصناعة المحتوى في مساحة واحدة مصممة حول العمل الإبداعي."
                      : "RAVINE brings cinema, music, sport, gaming and creator culture into one work-first media space."}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href={`/${locale}/explore`}
                      className="inline-flex min-h-12 items-center gap-2 bg-[#C47A52] px-5 text-[12px] font-semibold text-[#160F0B] transition hover:bg-[#D18A61]"
                    >
                      <Compass
                        size={16}
                        strokeWidth={1.8}
                      />

                      {isArabic
                        ? "استكشف الآن"
                        : "Explore now"}
                    </Link>

                    <Link
                      href={`/${locale}/studio`}
                      className={[
                        "inline-flex min-h-12 items-center gap-2 border px-5 text-[12px] font-semibold transition",
                        darkMode
                          ? "border-white/[0.09] bg-white/[0.025] text-[#EDE7DD] hover:border-[#C47A52]/30 hover:bg-[#C47A52]/10"
                          : "border-[#241F1B]/[0.09] bg-black/[0.018] text-[#302923] hover:border-[#C47A52]/30 hover:bg-[#C47A52]/10",
                      ].join(" ")}
                    >
                      <Sparkles
                        size={16}
                        strokeWidth={1.7}
                      />

                      {isArabic
                        ? "ابدأ بصناعة شيء"
                        : "Start creating"}
                    </Link>
                  </div>
                </div>

                <div
                  className={[
                    "relative min-h-[280px] overflow-hidden border-t lg:min-h-0 lg:border-l lg:border-t-0",
                    darkMode
                      ? "border-white/[0.06]"
                      : "border-[#241F1B]/[0.08]",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "absolute inset-0",
                      darkMode
                        ? "bg-[radial-gradient(circle_at_25%_20%,rgba(196,122,82,0.22),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(24,63,70,0.48),transparent_38%)]"
                        : "bg-[radial-gradient(circle_at_25%_20%,rgba(196,122,82,0.22),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(24,63,70,0.16),transparent_38%)]",
                    ].join(" ")}
                  />

                  <div className="absolute inset-0 grid grid-cols-6 opacity-[0.14]">
                    {Array.from({
                      length: 36,
                    }).map((_, index) => (
                      <span
                        key={index}
                        className={[
                          "border-e border-b",
                          darkMode
                            ? "border-white/[0.09]"
                            : "border-[#1C1814]/[0.12]",
                        ].join(" ")}
                      />
                    ))}
                  </div>

                  <div className="absolute inset-x-8 bottom-8 top-8 border border-[#C47A52]/20" />

                  <div className="absolute bottom-10 start-10 max-w-[260px]">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="size-2 bg-[#C47A52]" />

                      <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#C47A52]">
                        RAVINE
                      </span>
                    </div>

                    <p
                      className={[
                        "text-xl font-medium leading-tight",
                        darkMode
                          ? "text-[#F1E9DC]"
                          : "text-[#261F1A]",
                      ].join(" ")}
                    >
                      {isArabic
                        ? "المحتوى قبل كل شيء."
                        : "Work comes first."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="pt-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.23em] text-[#C47A52]">
                  {isArabic
                    ? "الأكثر مشاهدة"
                    : "Trending"}
                </span>

                <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                  {isArabic
                    ? "ما يحدث الآن"
                    : "What’s happening now"}
                </h2>
              </div>

              <Link
                href={`/${locale}/explore`}
                className={[
                  "hidden items-center gap-2 text-[11px] font-medium sm:flex",
                  darkMode
                    ? "text-[#AAA7A1] hover:text-[#F1E9DC]"
                    : "text-[#776E67] hover:text-[#201B18]",
                ].join(" ")}
              >
                {isArabic
                  ? "عرض الكل"
                  : "View all"}

                <ArrowUpRight
                  size={15}
                  strokeWidth={1.8}
                />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading
                ? Array.from({
                    length: 6,
                  }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className={[
                        "overflow-hidden border animate-pulse",
                        darkMode
                          ? "border-white/[0.06] bg-white/[0.02]"
                          : "border-[#241F1B]/[0.08] bg-black/[0.018]",
                      ].join(" ")}
                    >
                      <div className="aspect-video bg-black/10" />

                      <div className="space-y-3 p-4">
                        <div className="h-4 w-4/5 bg-current opacity-[0.06]" />
                        <div className="h-3 w-2/5 bg-current opacity-[0.05]" />
                      </div>
                    </div>
                  ))
                : trendingVideos.map(
                    (video: VideoRecord) => (
                      <Link
                        key={video.id}
                        href={`/${locale}/watch/${video.id}`}
                        className={[
                          "group overflow-hidden border transition",
                          darkMode
                            ? "border-white/[0.06] bg-[#111416] hover:border-[#C47A52]/25"
                            : "border-[#241F1B]/[0.08] bg-[#FBF8F2] hover:border-[#C47A52]/25",
                        ].join(" ")}
                      >
                        <div className="relative aspect-video overflow-hidden">
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
                              alt={video.title}
                              className="size-full object-cover transition duration-500 group-hover:scale-[1.035]"
                            />
                          ) : (
                            <div
                              className={[
                                "size-full",
                                darkMode
                                  ? "bg-[#183F46]"
                                  : "bg-[#DDE5E0]",
                              ].join(" ")}
                            />
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                          <span className="absolute bottom-3 end-3 bg-black/70 px-2 py-1 text-[9px] font-medium text-white">
                            {formatDuration(
                              video.duration_seconds
                            )}
                          </span>

                          <span className="absolute start-3 top-3 flex size-8 items-center justify-center border border-white/15 bg-black/35 text-white backdrop-blur-sm">
                            <Play
                              size={13}
                              fill="currentColor"
                            />
                          </span>
                        </div>

                        <div className="p-4">
                          <h3
                            className={[
                              "line-clamp-2 text-[14px] font-semibold leading-5",
                              darkMode
                                ? "text-[#F1E9DC]"
                                : "text-[#261F1A]",
                            ].join(" ")}
                          >
                            {video.title}
                          </h3>

                          <div
                            className={[
                              "mt-3 flex items-center justify-between text-[10px]",
                              darkMode
                                ? "text-[#7F8584]"
                                : "text-[#948A82]",
                            ].join(" ")}
                          >
                            <span>
                              {formatViews(video.views)} views
                            </span>

                            <span>
                              {formatDate(
                                video.created_at
                              )}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  )}
            </div>
          </section>

          <section className="pt-14">
            <div className="mb-6">
              <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.23em] text-[#C47A52]">
                {isArabic
                  ? "المشهد"
                  : "The scene"}
              </span>

              <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                {isArabic
                  ? "اكتشف حسب المجال"
                  : "Explore by discipline"}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {(categories.length > 0
                ? categories.slice(0, 6)
                : fallbackCategories
              ).map(
                (
                  category: Category,
                  index: number
                ) => {
                  const Icon =
                    categoryIcons[
                      index % categoryIcons.length
                    ];

                  const slug =
                    category.slug ??
                    category.name
                      ?.toLowerCase()
                      .replace(/\s+/g, "-") ??
                    category.id;

                  return (
                    <Link
                      key={category.id}
                      href={`/${locale}/category/${slug}`}
                      className={[
                        "group min-h-[138px] border p-4 transition",
                        darkMode
                          ? "border-white/[0.06] bg-[#111416] hover:border-[#C47A52]/25 hover:bg-[#C47A52]/[0.05]"
                          : "border-[#241F1B]/[0.08] bg-[#FBF8F2] hover:border-[#C47A52]/25 hover:bg-[#C47A52]/[0.05]",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "mb-8 grid size-10 place-items-center border transition",
                          darkMode
                            ? "border-white/[0.08] bg-white/[0.02] text-[#C47A52] group-hover:border-[#C47A52]/25"
                            : "border-[#241F1B]/[0.08] bg-black/[0.018] text-[#A95F39] group-hover:border-[#C47A52]/25",
                        ].join(" ")}
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.7}
                        />
                      </div>

                      <div className="flex items-end justify-between gap-2">
                        <span className="text-[12px] font-semibold">
                          {category.name ??
                            category.id}
                        </span>

                        <ArrowUpRight
                          size={14}
                          className="text-[#C47A52] opacity-50 transition group-hover:opacity-100"
                          strokeWidth={1.8}
                        />
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          </section>

          <section className="pt-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.23em] text-[#C47A52]">
                  {isArabic
                    ? "صناع"
                    : "Creators"}
                </span>

                <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                  {isArabic
                    ? "أشخاص يصنعون المشهد"
                    : "People shaping the scene"}
                </h2>
              </div>

              <Link
                href={`/${locale}/creators`}
                className={[
                  "hidden items-center gap-2 text-[11px] font-medium sm:flex",
                  darkMode
                    ? "text-[#AAA7A1] hover:text-[#F1E9DC]"
                    : "text-[#776E67] hover:text-[#201B18]",
                ].join(" ")}
              >
                {isArabic
                  ? "كل الصنّاع"
                  : "All creators"}

                <ArrowUpRight
                  size={15}
                  strokeWidth={1.8}
                />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {displayCreators.length > 0
                ? displayCreators.map(
                    (creator: Creator) => (
                      <Link
                        key={creator.id}
                        href={`/${locale}/creator/${
                          creator.username ??
                          creator.id
                        }`}
                        className={[
                          "group flex items-center gap-4 border p-4 transition",
                          darkMode
                            ? "border-white/[0.06] bg-[#111416] hover:border-[#C47A52]/25"
                            : "border-[#241F1B]/[0.08] bg-[#FBF8F2] hover:border-[#C47A52]/25",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "grid size-12 shrink-0 place-items-center overflow-hidden border",
                            darkMode
                              ? "border-white/[0.08] bg-[#183F46]"
                              : "border-[#241F1B]/[0.08] bg-[#DDE5E0]",
                          ].join(" ")}
                        >
                          {creator.avatar_url ? (
                            <img
                              src={creator.avatar_url}
                              alt={
                                creator.display_name ??
                                "Creator"
                              }
                              className="size-full object-cover"
                            />
                          ) : (
                            <span className="text-[13px] font-semibold">
                              {(
                                creator.display_name ??
                                creator.username ??
                                "C"
                              )[0].toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12px] font-semibold">
                            {creator.display_name ??
                              creator.username ??
                              "Creator"}
                          </div>

                          <div
                            className={[
                              "mt-1 truncate text-[10px]",
                              darkMode
                                ? "text-[#777D7C]"
                                : "text-[#948A82]",
                            ].join(" ")}
                          >
                            @{creator.username ??
                              "creator"}
                          </div>
                        </div>

                        <ArrowUpRight
                          size={15}
                          className="shrink-0 text-[#C47A52] opacity-50 transition group-hover:opacity-100"
                          strokeWidth={1.8}
                        />
                      </Link>
                    )
                  )
                : Array.from({
                    length: 4,
                  }).map((_, index) => (
                    <div
                      key={`creator-placeholder-${index}`}
                      className={[
                        "flex items-center gap-4 border p-4",
                        darkMode
                          ? "border-white/[0.06] bg-[#111416]"
                          : "border-[#241F1B]/[0.08] bg-[#FBF8F2]",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "size-12 shrink-0",
                          darkMode
                            ? "bg-white/[0.04]"
                            : "bg-black/[0.04]",
                        ].join(" ")}
                      />

                      <div className="min-w-0 flex-1 space-y-2">
                        <div
                          className={[
                            "h-3 w-3/5",
                            darkMode
                              ? "bg-white/[0.05]"
                              : "bg-black/[0.05]",
                          ].join(" ")}
                        />

                        <div
                          className={[
                            "h-2 w-2/5",
                            darkMode
                              ? "bg-white/[0.035]"
                              : "bg-black/[0.035]",
                          ].join(" ")}
                        />
                      </div>
                    </div>
                  ))}
            </div>
          </section>

          <section className="pt-14">
            <div className="mb-6">
              <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.23em] text-[#C47A52]">
                {isArabic
                  ? "جديد"
                  : "Fresh work"}
              </span>

              <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                {isArabic
                  ? "أحدث ما نُشر"
                  : "The latest releases"}
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {freshVideos.length > 0 ? (
                freshVideos.map(
                  (video: VideoRecord) => (
                    <Link
                      key={video.id}
                      href={`/${locale}/watch/${video.id}`}
                      className={[
                        "group overflow-hidden border transition",
                        darkMode
                          ? "border-white/[0.06] bg-[#111416] hover:border-[#C47A52]/25"
                          : "border-[#241F1B]/[0.08] bg-[#FBF8F2] hover:border-[#C47A52]/25",
                      ].join(" ")}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div
                            className={[
                              "size-full",
                              darkMode
                                ? "bg-[#183F46]"
                                : "bg-[#DDE5E0]",
                            ].join(" ")}
                          />
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                        <span className="absolute bottom-3 end-3 bg-black/70 px-2 py-1 text-[9px] text-white">
                          {formatDuration(
                            video.duration_seconds
                          )}
                        </span>
                      </div>

                      <div className="p-4">
                        <h3
                          className={[
                            "line-clamp-2 text-[13px] font-semibold leading-5",
                            darkMode
                              ? "text-[#F1E9DC]"
                              : "text-[#261F1A]",
                          ].join(" ")}
                        >
                          {video.title}
                        </h3>

                        <div
                          className={[
                            "mt-3 text-[10px]",
                            darkMode
                              ? "text-[#7F8584]"
                              : "text-[#948A82]",
                          ].join(" ")}
                        >
                          {formatViews(
                            video.views
                          )}{" "}
                          views
                        </div>
                      </div>
                    </Link>
                  )
                )
              ) : (
                <div
                  className={[
                    "col-span-full border px-6 py-16 text-center",
                    darkMode
                      ? "border-white/[0.06] bg-[#111416]"
                      : "border-[#241F1B]/[0.08] bg-[#FBF8F2]",
                  ].join(" ")}
                >
                  <BookOpen
                    size={24}
                    className="mx-auto mb-3 text-[#C47A52]"
                    strokeWidth={1.7}
                  />

                  <p
                    className={[
                      "text-sm",
                      darkMode
                        ? "text-[#A6A29B]"
                        : "text-[#766D65]",
                    ].join(" ")}
                  >
                    {isArabic
                      ? "لا يوجد محتوى جديد حاليًا."
                      : "There is no fresh work here yet."}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="pt-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.23em] text-[#C47A52]">
                  {isArabic
                    ? "مباشر"
                    : "Live"}
                </span>

                <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                  {isArabic
                    ? "ما يحدث الآن"
                    : "Live right now"}
                </h2>
              </div>

              <Link
                href={`/${locale}/live`}
                className={[
                  "hidden items-center gap-2 text-[11px] font-medium sm:flex",
                  darkMode
                    ? "text-[#AAA7A1] hover:text-[#F1E9DC]"
                    : "text-[#776E67] hover:text-[#201B18]",
                ].join(" ")}
              >
                {isArabic
                  ? "كل البثوث"
                  : "All live"}

                <ArrowUpRight
                  size={15}
                  strokeWidth={1.8}
                />
              </Link>
            </div>

            {liveVideos.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {liveVideos.map(
                  (video: VideoRecord) => (
                    <Link
                      key={video.id}
                      href={`/${locale}/watch/${video.id}`}
                      className={[
                        "group relative overflow-hidden border",
                        darkMode
                          ? "border-[#C47A52]/20 bg-[#111416]"
                          : "border-[#C47A52]/20 bg-[#FBF8F2]",
                      ].join(" ")}
                    >
                      <div className="relative aspect-video">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div
                            className={[
                              "size-full",
                              darkMode
                                ? "bg-[#183F46]"
                                : "bg-[#DDE5E0]",
                            ].join(" ")}
                          />
                        )}

                        <div className="absolute inset-0 bg-black/25" />

                        <span className="absolute start-3 top-3 flex items-center gap-2 bg-[#C47A52] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#160F0B]">
                          <span className="size-1.5 bg-[#160F0B]" />
                          Live
                        </span>
                      </div>

                      <div className="p-4">
                        <h3 className="line-clamp-2 text-[13px] font-semibold">
                          {video.title}
                        </h3>

                        <div
                          className={[
                            "mt-2 text-[10px]",
                            darkMode
                              ? "text-[#7F8584]"
                              : "text-[#948A82]",
                          ].join(" ")}
                        >
                          {formatViews(
                            video.views
                          )}{" "}
                          viewers
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            ) : (
              <div
                className={[
                  "relative overflow-hidden border p-8 sm:p-10",
                  darkMode
                    ? "border-white/[0.06] bg-[#111416]"
                    : "border-[#241F1B]/[0.08] bg-[#FBF8F2]",
                ].join(" ")}
              >
                <div className="absolute inset-y-0 end-0 w-1/3 bg-gradient-to-l from-[#C47A52]/[0.08] to-transparent" />

                <div className="relative max-w-2xl">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="size-2 bg-[#C47A52]" />

                    <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#C47A52]">
                      {isArabic
                        ? "البث المباشر"
                        : "Live channel"}
                    </span>
                  </div>

                  <h3 className="text-2xl font-semibold tracking-[-0.035em]">
                    {isArabic
                      ? "لا يوجد بث مباشر الآن."
                      : "Nothing is live right now."}
                  </h3>

                  <p
                    className={[
                      "mt-3 max-w-xl text-sm leading-6",
                      darkMode
                        ? "text-[#A6A29B]"
                        : "text-[#766D65]",
                    ].join(" ")}
                  >
                    {isArabic
                      ? "ارجع لاحقًا لمتابعة جلسات، عروض ومحتوى حي من مجتمع RAVINE."
                      : "Come back later for sessions, showcases and live work from the RAVINE community."}
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="pt-14">
            <div
              className={[
                "grid overflow-hidden border lg:grid-cols-[1.2fr_0.8fr]",
                darkMode
                  ? "border-white/[0.06] bg-[#111416]"
                  : "border-[#241F1B]/[0.08] bg-[#FBF8F2]",
              ].join(" ")}
            >
              <div className="p-7 sm:p-10">
                <div className="mb-3 flex items-center gap-2">
                  <Users
                    size={16}
                    className="text-[#C47A52]"
                    strokeWidth={1.7}
                  />

                  <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#C47A52]">
                    {isArabic
                      ? "المجتمع"
                      : "Community"}
                  </span>
                </div>

                <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
                  {isArabic
                    ? "مساحة للناس خلف الأعمال."
                    : "A space for the people behind the work."}
                </h2>

                <p
                  className={[
                    "mt-5 max-w-2xl text-sm leading-7",
                    darkMode
                      ? "text-[#A6A29B]"
                      : "text-[#766D65]",
                  ].join(" ")}
                >
                  {isArabic
                    ? "اتصل بصناع آخرين، تابع الأعمال التي تهمك، واكتشف مشاريع جديدة قبل أن تصبح ضوضاء."
                    : "Connect with creators, follow the work that matters to you, and discover projects before they become noise."}
                </p>

                <div className="mt-7">
                  <Link
                    href={`/${locale}/community`}
                    className="inline-flex min-h-11 items-center gap-2 border border-[#C47A52]/30 bg-[#C47A52]/10 px-4 text-[11px] font-semibold transition hover:bg-[#C47A52]/15"
                  >
                    {isArabic
                      ? "ادخل المجتمع"
                      : "Enter community"}

                    <ArrowUpRight
                      size={15}
                      strokeWidth={1.8}
                    />
                  </Link>
                </div>
              </div>

              <div
                className={[
                  "relative min-h-[250px] border-t lg:border-l lg:border-t-0",
                  darkMode
                    ? "border-white/[0.06] bg-[#183F46]/30"
                    : "border-[#241F1B]/[0.08] bg-[#183F46]/[0.07]",
                ].join(" ")}
              >
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(196,122,82,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(196,122,82,0.35)_1px,transparent_1px)] [background-size:34px_34px]" />

                <div className="absolute inset-7 border border-[#C47A52]/20" />

                <div className="absolute bottom-8 start-8">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#C47A52]">
                    RAVINE COMMUNITY
                  </div>

                  <div className="mt-2 text-2xl font-semibold">
                    {isArabic
                      ? "ناس. أفكار. أعمال."
                      : "People. Ideas. Work."}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="pt-14">
            <div
              className={[
                "flex flex-col gap-4 border-y py-4 sm:flex-row sm:items-center sm:justify-between",
                borderColor,
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <Palette
                  size={16}
                  className="text-[#C47A52]"
                  strokeWidth={1.7}
                />

                <span
                  className={[
                    "text-[11px]",
                    darkMode
                      ? "text-[#9A9D9B]"
                      : "text-[#81776F]",
                  ].join(" ")}
                >
                  {isArabic
                    ? "ترتيب المحتوى"
                    : "Content range"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {rangeLabels.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      setActiveRange(label)
                    }
                    className={[
                      "border px-3 py-2 text-[10px] font-medium transition",
                      activeRange === label
                        ? "border-[#C47A52]/30 bg-[#C47A52]/10 text-[#C47A52]"
                        : darkMode
                          ? "border-white/[0.06] text-[#818685] hover:border-white/[0.12] hover:text-[#E7E2DA]"
                          : "border-[#241F1B]/[0.08] text-[#877D75] hover:border-[#241F1B]/[0.14] hover:text-[#201B18]",
                    ].join(" ")}
                  >
                    {label === "All"
                      ? isArabic
                        ? "الكل"
                        : "All"
                      : label === "Today"
                        ? isArabic
                          ? "اليوم"
                          : "Today"
                        : label === "This week"
                          ? isArabic
                            ? "هذا الأسبوع"
                            : "This week"
                          : isArabic
                            ? "هذا الشهر"
                            : "This month"}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <footer className="pt-16">
            <div
              className={[
                "flex flex-col gap-7 border-t pt-8 md:flex-row md:items-end md:justify-between",
                borderColor,
              ].join(" ")}
            >
              <div>
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="RAVINE"
                    className="size-7 object-contain"
                  />

                  <span className="text-[13px] font-semibold tracking-[0.18em]">
                    RAVINE
                  </span>
                </div>

                <p
                  className={[
                    "mt-3 max-w-sm text-[11px] leading-6",
                    darkMode
                      ? "text-[#737A79]"
                      : "text-[#91877F]",
                  ].join(" ")}
                >
                  {isArabic
                    ? "منصة إبداعية للمشاهدة، الاكتشاف وصناعة المحتوى."
                    : "A creative platform for watching, discovering and making."}
                </p>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <Link
                  href={`/${locale}/about`}
                  className={[
                    "text-[10px] transition",
                    darkMode
                      ? "text-[#737A79] hover:text-[#F1E9DC]"
                      : "text-[#91877F] hover:text-[#201B18]",
                  ].join(" ")}
                >
                  {isArabic
                    ? "عن RAVINE"
                    : "About RAVINE"}
                </Link>

                <Link
                  href={`/${locale}/privacy`}
                  className={[
                    "text-[10px] transition",
                    darkMode
                      ? "text-[#737A79] hover:text-[#F1E9DC]"
                      : "text-[#91877F] hover:text-[#201B18]",
                  ].join(" ")}
                >
                  {isArabic
                    ? "الخصوصية"
                    : "Privacy"}
                </Link>

                <Link
                  href={`/${locale}/terms`}
                  className={[
                    "text-[10px] transition",
                    darkMode
                      ? "text-[#737A79] hover:text-[#F1E9DC]"
                      : "text-[#91877F] hover:text-[#201B18]",
                  ].join(" ")}
                >
                  {isArabic
                    ? "الشروط"
                    : "Terms"}
                </Link>
              </div>

              <div
                className={[
                  "text-[9px] uppercase tracking-[0.14em]",
                  darkMode
                    ? "text-[#575D5C]"
                    : "text-[#9A9189]",
                ].join(" ")}
              >
                © {new Date().getFullYear()} RAVINE
              </div>
            </div>
          </footer>
        </div>
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </main>
  );
}
