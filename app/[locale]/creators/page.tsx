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
  const supabase = useMemo(() => createClient(), []);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    void supabase
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
      description={ar ? "هنا الهوية المهنية للمبدع: الاسم، التخصص، الحضور، وأفضل الأعمال في مكان واحد." : "Professional creator identity: craft, presence and the work that makes each voice distinct."}
    >
      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-8 lg:px-10">
        <section className="ravine-creator-culture mb-9 min-h-[300px] border border-transparent p-7 md:p-10">
          <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 75% 15%, rgba(196,122,82,.18), transparent 32%), radial-gradient(circle at 18% 100%, rgba(24,63,70,.30), transparent 42%)" }} />
          <div className="relative max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.20em]" style={{ color: "#C47A52" }}><Sparkles size={15} /> RAVINE SELECT</div>
            <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-tight md:text-5xl">{ar ? "المبدع هنا شخصية، مش مجرد حساب." : "A creator here is a character, not a database record."}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 opacity-60">{ar ? "اكتشف أساليب مختلفة، وجوهًا لها بصمتها، وأعمالًا تعرفك بصاحبها قبل أن تقرأ اسمه." : "Discover distinct craft, visual signatures and work that introduces the person before the metadata."}</p>
            <div className="mt-7 flex flex-wrap gap-6 text-xs opacity-55">
              <span>{creators.length.toLocaleString()} {ar ? "مبدع" : "creators"}</span>
              <span>{ar ? "صناعة أفلام" : "Film"}</span>
              <span>{ar ? "تصوير" : "Photography"}</span>
              <span>{ar ? "مونتاج" : "Editing"}</span>
              <span>{ar ? "تصميم" : "Design"}</span>
            </div>
          </div>
        </section>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.22em] opacity-45">DISCOVER PEOPLE</p>
            <h2 className="mt-2 text-2xl font-black">{ar ? "وجوه RAVINE" : "The people of RAVINE"}</h2>
          </div>
          <div className="relative w-full md:max-w-xl">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 opacity-35" size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ar ? "ابحث عن اسم أو تخصص..." : "Search by name or craft..."} className="w-full rounded-full border bg-transparent py-4 ps-12 pe-5 text-sm outline-none transition" style={{ borderColor: "rgba(241,233,220,.11)" }} />
          </div>
        </div>

        {error && <div className="mb-6 border-s-2 border-[#C47A52] bg-[#C47A52]/5 p-4 text-sm opacity-75">{error}</div>}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-72 animate-pulse rounded-[24px] bg-white/5" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-y py-20 text-center">
            <Users className="mx-auto opacity-35" size={34} />
            <h2 className="mt-5 text-xl font-bold">{ar ? "لم نجد مبدعين بهذا البحث" : "No creators found"}</h2>
            <p className="mt-2 text-sm opacity-50">{ar ? "جرّب اسمًا آخر أو تخصصًا مختلفًا." : "Try another name or craft."}</p>
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((creator) => (
              <a key={creator.id} href={`/${locale}/creator/${creator.username || creator.id}`} className="ravine-creator-culture group block min-h-[280px] transition duration-500">
                <div className="relative h-44 overflow-hidden bg-[#151719]">
                  {creator.avatar_url ? <img src={creator.avatar_url} alt={creator.name} className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-[1.035] group-hover:opacity-95" /> : <div className="flex h-full items-center justify-center text-4xl font-black opacity-20">{creator.name.charAt(0)}</div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent" />
                  <span className="absolute bottom-4 start-4 text-[10px] font-black uppercase tracking-[.18em]" style={{ color: "#C47A52" }}>CREATOR</span>
                  <span className="absolute bottom-3 end-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm"><ArrowUpRight size={16} /></span>
                </div>
                <div className="px-1 pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-black">{creator.name}</h3>
                      {creator.username && <p className="mt-1 text-xs opacity-40">@{creator.username}</p>}
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-[.16em] opacity-35">{ar ? "ملف" : "Profile"}</span>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm leading-6 opacity-55">{creator.bio || (ar ? "مبدع على RAVINE." : "A creator on RAVINE.")}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
