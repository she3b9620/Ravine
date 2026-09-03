"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowUpRight, FileVideo2, Filter, Plus, Search, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Video = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  views: number | null;
  likes: number | null;
  published: boolean | null;
  content_type: "short" | "video" | "podcast" | "live" | null;
  created_at: string | null;
};

function compact(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function StudioContentPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "drafts">("all");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!userData.user) {
        window.location.href = `/${locale}/auth?next=/${locale}/studio/content`;
        return;
      }

      const { data, error: loadError } = await supabase
        .from("videos")
        .select("id,title,description,thumbnail_url,views,likes,published,content_type,created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (loadError) setError(loadError.message);
      setVideos(data ?? []);
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [locale, supabase]);

  const filtered = videos.filter((video) => {
    const matchesQuery = !query.trim() || video.title.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === "all" || (filter === "published" ? video.published : !video.published);
    return matchesQuery && matchesFilter;
  });

  return (
    <PlatformShell active="creators" eyebrow="RAVINE Studio" title={isArabic ? "إدارة المحتوى" : "Content workspace"} description={isArabic ? "كل أعمالك في مساحة واحدة: منشور، مسودة، وقريبًا دورة النشر الكاملة." : "Your works in one place: published, drafts, and the full publishing workflow ahead."}>
      <div className="mx-auto max-w-[1440px] space-y-6 px-5 pb-16 pt-8 md:px-8 lg:px-10">
        <section className="rounded-[32px] border p-6 md:p-8" style={{ borderColor: "rgba(241,233,220,.10)", background: "linear-gradient(145deg,rgba(24,63,70,.23),rgba(21,23,25,.82))" }}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{ color: "#C47A52" }}>{isArabic ? "مساحة العمل" : "Workspace"}</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">{isArabic ? "الأعمال هي الأصل." : "Your work is the source of everything."}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: "rgba(241,233,220,.55)" }}>{isArabic ? `${videos.length} عملًا محفوظًا في حسابك.` : `${videos.length} works currently attached to your account.`}</p>
            </div>
            <a href={`/${locale}/creator/upload`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold" style={{ background: "#C47A52", color: "#090909" }}><Plus size={16}/>{isArabic ? "رفع عمل" : "Upload work"}</a>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-[28px] border p-4 md:flex-row md:items-center" style={{ borderColor: "rgba(241,233,220,.08)", background: "rgba(21,23,25,.74)" }}>
          <label className="flex flex-1 items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(241,233,220,.07)", background: "rgba(9,9,9,.45)" }}>
            <Search size={17} style={{ color: "rgba(241,233,220,.40)" }}/>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isArabic ? "ابحث في أعمالك" : "Search your work"} className="w-full bg-transparent text-sm outline-none placeholder:text-[rgba(241,233,220,.32)]" />
          </label>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter size={16} className="shrink-0" style={{ color: "rgba(241,233,220,.4)" }}/>
            {(["all", "published", "drafts"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setFilter(item)} className="rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap" style={{ background: filter === item ? "#C47A52" : "rgba(241,233,220,.05)", color: filter === item ? "#090909" : "rgba(241,233,220,.65)" }}>
                {item === "all" ? (isArabic ? "الكل" : "All") : item === "published" ? (isArabic ? "منشور" : "Published") : (isArabic ? "مسودات" : "Drafts")}
              </button>
            ))}
          </div>
        </section>

        {error && <div className="rounded-3xl border px-5 py-4 text-sm" style={{ borderColor: "rgba(196,122,82,.35)", background: "rgba(196,122,82,.08)" }}>{isArabic ? "تعذر تحميل المحتوى." : "Content could not be loaded."}</div>}

        <section className="rounded-[32px] border p-6 md:p-8" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.74)" }}>
          <div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{ color: "#C47A52" }}>{isArabic ? "الأعمال" : "Works"}</p><h2 className="mt-2 text-2xl font-black">{isArabic ? "مكتبة النشر" : "Publishing library"}</h2></div><div className="text-xs" style={{ color: "rgba(241,233,220,.4)" }}>{filtered.length} / {videos.length}</div></div>
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{Array.from({length:6}).map((_, i)=><div key={i} className="h-32 animate-pulse rounded-2xl" style={{background:"rgba(241,233,220,.035)"}}/>)}</div>
          ) : filtered.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {filtered.map((video) => (
                <article key={video.id} className="overflow-hidden rounded-[26px] border" style={{ borderColor: "rgba(241,233,220,.07)", background: "rgba(9,9,9,.32)" }}>
                  <div className="flex gap-4 p-4">
                    <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl" style={{ background: "rgba(24,63,70,.22)" }}>
                      {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <FileVideo2 size={24} style={{ color: "rgba(241,233,220,.32)" }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3"><h3 className="line-clamp-2 font-bold leading-6">{video.title}</h3><span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: video.published ? "rgba(196,122,82,.12)" : "rgba(241,233,220,.05)", color: video.published ? "#C47A52" : "rgba(241,233,220,.48)" }}>{video.published ? (isArabic ? "منشور" : "Published") : (isArabic ? "مسودة" : "Draft")}</span></div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5" style={{ color: "rgba(241,233,220,.42)" }}>{video.description || (isArabic ? "بدون وصف." : "No description.")}</p>
                      <div className="mt-3 flex items-center gap-3 text-[10px]" style={{ color: "rgba(241,233,220,.38)" }}><span>{compact(video.views)} {isArabic ? "مشاهدة" : "views"}</span><span>{compact(video.likes)} {isArabic ? "إعجاب" : "likes"}</span><span>{video.content_type || "video"}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end border-t px-4 py-3" style={{borderColor:"rgba(241,233,220,.06)"}}><a href={`/${locale}/watch/${video.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold" style={{color:"#C47A52"}}>{isArabic ? "فتح العمل" : "Open work"}<ArrowUpRight size={14}/></a></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-14 text-center"><Sparkles size={22} className="mx-auto" style={{color:"#C47A52"}}/><h3 className="mt-4 text-xl font-black">{isArabic ? "لا توجد أعمال هنا بعد." : "No works here yet."}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6" style={{color:"rgba(241,233,220,.45)"}}>{query ? (isArabic ? "غيّر البحث أو الفلتر." : "Try a different search or filter.") : (isArabic ? "ابدأ برفع أول عمل إلى RAVINE." : "Start by uploading your first work to RAVINE.")}</p></div>
          )}
        </section>
      </div>
    </PlatformShell>
  );
}
