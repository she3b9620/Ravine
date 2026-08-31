const featured = [
  {
    title: "DUNE: PART TWO",
    meta: "2024 • Sci-Fi • 2h 46m",
    description:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    accent: "#C47A52",
  },
  {
    title: "INTERSTELLAR",
    meta: "2014 • Sci-Fi • 2h 49m",
    description:
      "A team of explorers travels through a wormhole in space in an attempt to ensure humanity's survival.",
    accent: "#183F46",
  },
];

const movies = [
  ["THE BATMAN", "2022", "Crime / Drama", "#241d1c"],
  ["BLADE RUNNER 2049", "2017", "Sci-Fi / Drama", "#253236"],
  ["OPPENHEIMER", "2023", "Drama / History", "#322822"],
  ["THE DARK KNIGHT", "2008", "Action / Crime", "#202528"],
  ["ARRIVAL", "2016", "Sci-Fi / Mystery", "#30363a"],
  ["GLADIATOR", "2000", "Action / Drama", "#403127"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090909] text-[#F1E9DC]">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#090909]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-10">
            <a
              href="#"
              className="text-2xl font-black tracking-[0.18em] text-[#C47A52]"
            >
              RAVINE
            </a>

            <div className="hidden items-center gap-7 text-sm text-white/60 md:flex">
              <a className="text-[#F1E9DC]" href="#">
                Home
              </a>
              <a className="transition hover:text-[#F1E9DC]" href="#movies">
                Movies
              </a>
              <a className="transition hover:text-[#F1E9DC]" href="#series">
                Series
              </a>
              <a className="transition hover:text-[#F1E9DC]" href="#genres">
                Genres
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white sm:block">
              Search
            </button>

            <button className="rounded-full bg-[#C47A52] px-5 py-2 text-sm font-semibold text-[#090909] transition hover:brightness-110">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(24,63,70,0.45),transparent_35%),radial-gradient(circle_at_20%_20%,rgba(196,122,82,0.10),transparent_30%)]" />

        <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C47A52]" />
              Cinema, curated.
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
              Stories worth
              <span className="block text-[#C47A52]">remembering.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-white/55 sm:text-lg">
              Discover films and series through a cinematic library designed
              for people who care about what they watch.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <button className="rounded-full bg-[#C47A52] px-7 py-3.5 font-semibold text-[#090909] transition hover:brightness-110">
                Explore Library
              </button>

              <button className="rounded-full border border-white/10 bg-white/[0.03] px-7 py-3.5 font-semibold text-[#F1E9DC] transition hover:bg-white/[0.07]">
                View Collections
              </button>
            </div>
          </div>

          {/* FEATURE VISUAL */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-[3rem] bg-[#183F46]/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#151719] shadow-2xl">
              <div className="aspect-[4/5] bg-[radial-gradient(circle_at_50%_30%,rgba(196,122,82,0.45),transparent_25%),linear-gradient(145deg,#24363a,#090909_65%)]">
                <div className="flex h-full flex-col justify-end p-8 sm:p-10">
                  <div className="mb-3 text-xs uppercase tracking-[0.3em] text-[#C47A52]">
                    Featured
                  </div>

                  <h2 className="max-w-md text-4xl font-semibold tracking-tight sm:text-5xl">
                    DUNE:
                    <br />
                    PART TWO
                  </h2>

                  <p className="mt-4 max-w-md text-sm leading-7 text-white/55">
                    An epic journey across Arrakis, built for the big screen.
                  </p>

                  <div className="mt-7 flex gap-3">
                    <button className="rounded-full bg-[#F1E9DC] px-5 py-2.5 text-sm font-semibold text-[#090909]">
                      Details
                    </button>
                    <button className="rounded-full border border-white/15 bg-black/20 px-5 py-2.5 text-sm">
                      + Watchlist
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRENDING */}
      <section id="movies" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="mb-10 flex items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#C47A52]">
              Discover
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Trending now
            </h2>
          </div>

          <button className="text-sm text-white/45 transition hover:text-white">
            View all →
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item) => (
            <article
              key={item.title}
              className="group overflow-hidden rounded-2xl border border-white/8 bg-[#151719] transition duration-300 hover:-translate-y-1 hover:border-white/15"
            >
              <div
                className="aspect-[16/10]"
                style={{
                  background: `radial-gradient(circle at 70% 25%, ${item.accent}99, transparent 28%), linear-gradient(145deg, ${item.accent}55, #090909 75%)`,
                }}
              />

              <div className="p-6">
                <div className="text-xs text-white/40">{item.meta}</div>
                <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-white/45">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* LIBRARY */}
      <section
        id="series"
        className="border-y border-white/5 bg-[#0d0f10] py-20"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#C47A52]">
                Library
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Essential cinema
              </h2>
            </div>

            <button className="text-sm text-white/45 transition hover:text-white">
              Browse →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {movies.map(([title, year, genre, color]) => (
              <article key={title} className="group">
                <div
                  className="aspect-[2/3] overflow-hidden rounded-xl border border-white/8 transition duration-300 group-hover:-translate-y-1 group-hover:border-[#C47A52]/40"
                  style={{
                    background: `radial-gradient(circle at 50% 30%, ${color}, #090909 70%)`,
                  }}
                >
                  <div className="flex h-full items-end bg-gradient-to-t from-black via-transparent to-transparent p-4">
                    <div>
                      <div className="text-sm font-semibold">{title}</div>
                      <div className="mt-1 text-[11px] text-white/45">
                        {year} • {genre}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GENRES */}
      <section id="genres" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="mb-8">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#C47A52]">
            Explore
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Find your mood
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Science Fiction",
            "Crime",
            "Drama",
            "Thriller",
            "Action",
            "Mystery",
            "Fantasy",
            "Animation",
          ].map((genre) => (
            <button
              key={genre}
              className="group rounded-2xl border border-white/8 bg-[#151719] p-6 text-left transition hover:border-[#C47A52]/40 hover:bg-[#183F46]/30"
            >
              <span className="text-lg font-medium">{genre}</span>
              <span className="mt-2 block text-sm text-white/35 transition group-hover:text-[#C47A52]">
                Explore collection →
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="font-semibold tracking-[0.2em] text-[#C47A52]">
            RAVINE
          </div>

          <div>© 2026 RAVINE. A cinematic discovery platform.</div>
        </div>
      </footer>
    </main>
  );
}