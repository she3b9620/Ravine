"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Category = { id: number; name: string };
type Video = {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  content_type: "short" | "video" | "podcast" | "live" | null;
  published: boolean | null;
};

export default function StudioWorkEditor() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const id = Number(params.id);
  const [video, setVideo] = useState<Video | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [contentType, setContentType] = useState<Video["content_type"]>("video");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!Number.isFinite(id)) {
        setError(isArabic ? "معرّف العمل غير صحيح." : "Invalid work id.");
        setLoading(false);
        return;
      }

      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (!mounted) return;
      if (authError || !userData.user) {
        window.location.href = `/${locale}/auth?next=/${locale}/studio/content/${id}`;
        return;
      }

      const [{ data: videoData, error: videoError }, { data: categoryData, error: categoryError }] = await Promise.all([
        supabase.from("videos").select("id,title,description,category_id,content_type,published").eq("id", id).eq("user_id", userData.user.id).maybeSingle(),
        supabase.from("categories").select("id,name").order("name", { ascending: true }),
      ]);

      if (!mounted) return;
      if (videoError || categoryError) setError((videoError || categoryError)?.message || "");
      if (videoData) {
        setVideo(videoData);
        setTitle(videoData.title);
        setDescription(videoData.description || "");
        setCategoryId(videoData.category_id ? String(videoData.category_id) : "");
        setContentType(videoData.content_type || "video");
        setPublished(Boolean(videoData.published));
      } else if (!videoError) {
        setError(isArabic ? "العمل غير موجود أو لا تملك صلاحية تعديله." : "Work not found or you do not have permission to edit it.");
      }
      setCategories(categoryData || []);
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [id, isArabic, locale, supabase]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!video || !title.trim()) return;
    setSaving(true);
    setSaved(false);
    setError("");

    const { error: updateError } = await supabase
      .from("videos")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId ? Number(categoryId) : null,
        content_type: contentType,
        published,
      })
      .eq("id", video.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setVideo((current) => current ? { ...current, title: title.trim(), description: description.trim() || null, category_id: categoryId ? Number(categoryId) : null, content_type: contentType, published } : current);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    }
    setSaving(false);
  }

  return (
    <PlatformShell active="creators" eyebrow="RAVINE Studio" title={isArabic ? "تحرير العمل" : "Edit work"} description={isArabic ? "عدّل بيانات العمل وحالة النشر من مكان واحد." : "Edit your work details and publishing status in one place."}>
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-8 md:px-8">
        <button type="button" onClick={() => router.push(`/${locale}/studio/content`)} className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: "rgba(241,233,220,.58)" }}><ArrowLeft size={16}/>{isArabic ? "العودة للمحتوى" : "Back to content"}</button>

        {loading ? (
          <div className="mt-6 rounded-[32px] border p-8" style={{ borderColor: "rgba(241,233,220,.08)", background: "rgba(21,23,25,.74)" }}>
            <div className="h-8 w-1/3 animate-pulse rounded-xl" style={{ background: "rgba(241,233,220,.05)" }}/>
            <div className="mt-6 h-14 animate-pulse rounded-2xl" style={{ background: "rgba(241,233,220,.04)" }}/>
            <div className="mt-3 h-32 animate-pulse rounded-2xl" style={{ background: "rgba(241,233,220,.04)" }}/>
          </div>
        ) : (
          <form onSubmit={save} className="mt-6 rounded-[32px] border p-6 md:p-8" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.78)" }}>
            {error && <div className="mb-5 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(196,122,82,.35)", background: "rgba(196,122,82,.08)" }}>{error}</div>}

            <label className="block text-sm font-bold">{isArabic ? "العنوان" : "Title"}
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className="mt-2 w-full rounded-2xl border bg-[#090909] px-4 py-3 outline-none" style={{ borderColor: "rgba(241,233,220,.10)" }} />
            </label>

            <label className="mt-5 block text-sm font-bold">{isArabic ? "الوصف" : "Description"}
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={7} className="mt-2 w-full resize-y rounded-2xl border bg-[#090909] px-4 py-3 text-sm leading-7 outline-none" style={{ borderColor: "rgba(241,233,220,.10)" }} />
            </label>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-bold">{isArabic ? "نوع المحتوى" : "Content type"}
                <select value={contentType || "video"} onChange={(e) => setContentType(e.target.value as Video["content_type"])} className="mt-2 w-full rounded-2xl border bg-[#090909] px-4 py-3 text-sm outline-none" style={{ borderColor: "rgba(241,233,220,.10)" }}>
                  <option value="video">Video</option><option value="short">Short</option><option value="podcast">Podcast</option><option value="live">Live</option>
                </select>
              </label>
              <label className="block text-sm font-bold">{isArabic ? "التصنيف" : "Category"}
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-2 w-full rounded-2xl border bg-[#090909] px-4 py-3 text-sm outline-none" style={{ borderColor: "rgba(241,233,220,.10)" }}>
                  <option value="">{isArabic ? "بدون تصنيف" : "No category"}</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            </div>

            <button type="button" onClick={() => setPublished((current) => !current)} className="mt-5 flex w-full items-center justify-between rounded-2xl border p-4 text-sm" style={{ borderColor: "rgba(241,233,220,.08)", background: published ? "rgba(196,122,82,.08)" : "rgba(9,9,9,.35)" }}>
              <span><span className="block font-bold">{isArabic ? "حالة النشر" : "Publishing status"}</span><span className="mt-1 block text-xs" style={{ color: "rgba(241,233,220,.42)" }}>{published ? (isArabic ? "العمل منشور" : "Work is published") : (isArabic ? "العمل محفوظ كمسودة" : "Work is a draft")}</span></span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: published ? "#C47A52" : "rgba(241,233,220,.06)", color: published ? "#090909" : "rgba(241,233,220,.55)" }}>{published && <Check size={17}/>}</span>
            </button>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs" style={{ color: saved ? "#C47A52" : "rgba(241,233,220,.35)" }}>{saved ? (isArabic ? "تم حفظ التعديلات" : "Changes saved") : ""}</div>
              <button type="submit" disabled={saving || !title.trim()} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "#C47A52", color: "#090909" }}>{saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} {isArabic ? "حفظ التعديلات" : "Save changes"}</button>
            </div>
          </form>
        )}
      </div>
    </PlatformShell>
  );
}
