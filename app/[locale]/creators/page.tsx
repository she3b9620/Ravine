"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowUpRight, Search, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Creator = {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function CreatorsPage() {
  const locale = useLocale();
  const ar = locale === "ar";
  const supabase = createClient();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from("creators")
      .select("id,name,username,avatar_url,bio")
      .order("id", { ascending: false })
      .limit(60)
      .then(({ data, error: requestError }) => {
        if (!mounted) return;
        if (requestError) setError(requestError.message);
        setCreators((data ?? []) as Creator[]);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return creators;
    return creators.filter((creator) =>
      [creator.name, creator.username, creator.bio]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [creators, query]);

  return (
    <PlatformShell
      active="creators"
      eyebrow={ar ? "مبدعو RAVINE" : "RAVINE CREATORS"}
      title={ar ? "أشخاص يستحقون أن تكتشف أعمالهم." : "People worth discovering."}
      description={ar ? "هنا الهوية المهنية للمبدع: الاسم، التخصص، الحضور، وأفضل الأعمال في مكان واحد." : "Professional creator identity: name, craft, presence and best work in one cinematic place."}
    >
      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-8 lg:px-10">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1.4fr_.8fr_.8fr]">
          <div className="rounded-[30px] border p-6" style={{ borderColor: "rgba(196,122,82,.30)", background: "linear-gradient(135deg, rgba(196,122,82,.10), rgba(24,63,70,.16))" }}>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em]" style={{ color: "#C47A52" }}>
              <Sparkles size={15} /> RAVINE SELECT
            </div>
            <h2 className="mt-4 text-2xl font-black">{ar ? "بروفايل المبدع هو الهوية." : "A creator profile is identity."}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 opacity-55">{ar ? "مش مجرد قناة. مساحة تعرض الأسلوب، التخصص، الاعتمادات، والأعمال التي تريد أن يتذكرك الناس بها." : "Not just a channel. A space for craft, specialties, credits and the work you want to be remembered for."}</p>
          </div>
          <div className="rounded-[30px] border p-6" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.70)" }}>
            <Users size={20} className="opacity-55" />
            <p className="mt-5 text-2xl font-black">{creators.length.toLocaleString()}</p>
            <p className="mt-1 text-sm opacity-50">{ar ? "مبدع ظاهر في الدليل" : "Creators in the directory"}</p>
          </div>
          <div className="rounded-[30px] border p-6" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.70)" }}>
            <p className="text-xs font-bold uppercase tracking-[.18em] opacity-45">DISCOVERY</p>
            <p className="mt-5 text-lg font-bold">{ar ? "ابحث عن اسم أو تخصص" : "Search a name or craft"}</p>
            <p className="mt-2 text-xs leading-5 opacity-45">{ar ? "الفنان، المخرج، المصور، المونتير، صانع الأفلام أو الـVFX." : "Filmmakers, photographers, editors, animators, VFX artists and more."}</p>
          </div>
        </div>

        <div className="relative mb-7 max-w-2xl">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 opacity-35" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ar ? "ابحث عن مبدع..." : "Search creators..."}
            className="w-full rounded-full border bg-transparent py-4 ps-12 pe-5 text-sm outline-none transition focus:border-[#C47A52]/60"
            style={{ borderColor: "rgba(241,233,220,.11)" }}
          />
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-56 animate-pulse rounded-[30px] bg-white/5" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[30px] border p-14 text-center" style={{ borderColor: "rgba(24,63,70,.65)", background: "rgba(21,23,25,.65)" }}>
            <Users className="mx-auto opacity-45" size={34} />
            <h2 className="mt-5 text-xl font-bold">{ar ? "لم نجد مبدعين بهذا البحث" : "No creators found"}</h2>
            <p className="mt-2 text-sm opacity-50">{ar ? "جرّب اسمًا آخر أو تخصصًا مختلفًا." : "Try another name or craft."}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((creator) => (
              <a
                key={creator.id}
                href={`/${locale}/creator/${creator.username || creator.id}`}
                className="group relative overflow-hidden rounded-[30px] border p-6 transition duration-500 hover:-translate-y-1"
                style={{ borderColor: "rgba(241,233,220,.09)", background: "linear-gradient(160deg, rgba(21,23,25,.86), rgba(9,9,9,.94))" }}
              >
                <div className="absolute -end-16 -top-16 h-40 w-40 rounded-full blur-3xl transition duration-700 group-hover:scale-125" style={{ background: "rgba(196,122,82,.10)" }} />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={creator.avatar_url || "/RAVINE.png"}
                      alt={creator.name}
                      className="h-16 w-16 rounded-2xl border object-cover"
                      style={{ borderColor: "rgba(196,122,82,.25)" }}
                    />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: "#C47A52" }}>CREATOR</p>
                      <h2 className="mt-1 text-xl font-black">{creator.name}</h2>
                      {creator.username && <p className="mt-1 text-xs opacity-40">@{creator.username}</p>}
                    </div>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: "rgba(241,233,220,.10)" }}><ArrowUpRight size={17} /></span>
                </div>
                <p className="relative mt-5 line-clamp-3 min-h-[4.5rem] text-sm leading-6 opacity-50">{creator.bio || (ar ? "مبدع على RAVINE." : "A creator on RAVINE.")}</p>
                <div className="relative mt-6 flex items-center justify-between border-t pt-4 text-xs" style={{ borderColor: "rgba(241,233,220,.08)" }}>
                  <span className="opacity-40">{ar ? "عرض الملف" : "View profile"}</span>
                  <span style={{ color: "#C47A52" }}>{ar ? "اكتشف" : "Explore"}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
