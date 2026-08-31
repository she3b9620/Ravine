import { supabase } from "@/lib/supabase";

type Video = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  views: number | null;
};

const fallbackVideos: Video[] = [
  {
    id: 1,
    title: "Welcome to RAVINE",
    description:
      "A new home for creators, stories, videos and communities.",
    thumbnail_url: null,
    views: 0,
  },
];

const categories = [
  "Cinema",
  "Gaming",
  "Technology",
  "Music",
  "Education",
  "Podcast",
  "Documentary",
  "Lifestyle",
];

export default async function Home() {
  const { data, error } = await supabase
    .from("videos")
    .select("id, title, description, thumbnail_url, views")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
  }

  const videos: Video[] =
    data && data.length > 0 ? (data as Video[]) : fallbackVideos;

  return (
    <main className="min-h-screen bg-[#090909] text-[#F1E9DC]">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#090909]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a
            href="#"
            className="text-2xl font-black tracking-[0.18em] text-[#C47A52]"
          >
            RAVINE
          </a>

          <div className="hidden gap-8 text-sm text-white/50 md:flex">
            <a href="#" className="text-[#F1E9DC]">
              Home
            </a>

            <a href="#videos" className="transition hover:text-white">
              Videos
            </a>

            <a href="#categories" className="transition hover:text-white">
              Categories
            </a>

            <a href="#creators" className="transition hover:text-white">
              Creators
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden rounded-full border border-white/10 px-5 py-2 text-sm text-white/60 transition hover:text-white sm:block">
              Search
            </button>

            <button className="rounded-full bg-[#C47A52] px-5 py-2 text-sm font-semibold text-[#090909]">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(24,63,70,0.45),transparent_35%)]" />

        <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-16 px-6 py-24 lg:grid-cols-2">
          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#C47A52]">
              A platform for creators
            </p>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
              Create.
              <span className="block text-[#C47A52]">Share.</span>
              Discover.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-white/45">
              RAVINE is a new home for video, ideas, stories and creators,
              built around discovery rather than noise.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#videos"
                className="rounded-full bg-[#C47A52] px-7 py-3.5 font-semibold text-[#090909]"
              >
                Explore Videos
              </a>

              <a
                href="#categories"
                className="rounded-full border border-white/10 px-7 py-3.5 font-semibold transition hover:bg-white/5"
              >
                Browse Categories
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 rounded-full bg-[#183F46]/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#151719]">
              <div className="relative aspect-video overflow-hidden bg-[radial-gradient(circle_at_70%_20%,rgba(196,122,82,0.45),transparent_25%),linear-gradient(145deg,#183F46,#090909_75%)]">
                {videos[0]?.thumbnail_url && (
                  <img
                    src={videos[0].thumbnail_url}
                    alt={videos[0].title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#090909] to-transparent" />
              </div>

              <div className="p-7">
                <p className="text-xs uppercase tracking-[0.25em] text-[#C47A52]">
                  Featured
                </p>

                <h2 className="mt-3 text-3xl font-semibold">
                  {videos[0]?.title}
                </h2>

                <p className="mt-3 text-sm leading-7 text-white/40">
                  {videos[0]?.description ||
                    "Discover something new on RAVINE."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="videos" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#C47A52]">
            Discover
          </p>

          <h2 className="text-4xl font-semibold">
            Latest videos
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <article
              key={video.id}
              className="group overflow-hidden rounded-2xl border border-white/8 bg-[#151719] transition duration-300 hover:-translate-y-1 hover:border-white/15"
            >
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-[#183F46] via-[#151719] to-[#090909]">
                {video.thumbnail_url && (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                )}
              </div>

              <div className="p-5">
                <h3 className="text-lg font-semibold">
                  {video.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  {video.description ||
                    "No description available yet."}
                </p>

                <p className="mt-4 text-xs text-white/30">
                  {video.views ?? 0} views
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="categories"
        className="border-y border-white/5 bg-[#0d0f10] py-20"
      >
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#C47A52]">
            Explore
          </p>

          <h2 className="text-4xl font-semibold">
            Find your world
          </h2>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <button
                key={category}
                className="rounded-2xl border border-white/8 bg-[#151719] p-6 text-left transition hover:border-[#C47A52]/40 hover:bg-[#183F46]/30"
              >
                <div className="text-lg font-medium">
                  {category}
                </div>

                <div className="mt-2 text-sm text-white/30">
                  Explore →
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="creators" className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-3xl border border-white/8 bg-[#151719] p-8 sm:p-12">
          <p className="text-xs uppercase tracking-[0.25em] text-[#C47A52]">
            Creators
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-semibold">
            A platform built around the people who make the content.
          </h2>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/40">
            Publish your work, build an audience, and connect with people who
            care about what you create.
          </p>

          <button className="mt-8 rounded-full bg-[#C47A52] px-7 py-3.5 font-semibold text-[#090909]">
            Become a Creator
          </button>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-10">
          <span className="font-semibold tracking-[0.2em] text-[#C47A52]">
            RAVINE
          </span>

          <span className="text-sm text-white/30">
            © 2026 RAVINE
          </span>
        </div>
      </footer>
    </main>
  );
}