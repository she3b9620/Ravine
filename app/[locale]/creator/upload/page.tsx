"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowLeft, CheckCircle2, FileImage, Film, Headphones, Loader2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Category = { id: number; name: string; slug: string };
type ContentType = "video" | "short" | "podcast";
type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";

const typeOptions: Array<{ value: ContentType; icon: typeof Film; ar: string; en: string; hintAr: string; hintEn: string }> = [
  { value: "video", icon: Film, ar: "فيديو / عمل", en: "Video / Work", hintAr: "أعمال سينمائية ومرئية أطول من 3 دقائق.", hintEn: "Cinematic and visual works longer than 3 minutes." },
  { value: "short", icon: UploadCloud, ar: "Short / Cut", en: "Short / Cut", hintAr: "محتوى قصير حتى 3 دقائق، مع أولوية للعمودي.", hintEn: "Short-form content up to 3 minutes, with vertical-first framing." },
  { value: "podcast", icon: Headphones, ar: "Podcast", en: "Podcast", hintAr: "حلقة طويلة للمبدعين. يمكن ضبطها كصوت أو فيديو.", hintEn: "Long-form creator episodes. Audio or video can be used." },
];

export default function UploadVideoPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contentType, setContentType] = useState<ContentType>("video");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadCategories() {
      const { data, error: categoryError } = await supabase.from("categories").select("id,name,slug").order("name", { ascending: true });
      if (!mounted) return;
      if (categoryError) setError(categoryError.message); else setCategories(data ?? []);
      setLoading(false);
    }
    void loadCategories();
    return () => { mounted = false; };
  }, [supabase]);

  useEffect(() => {
    if (contentType === "short") setAspectRatio("9:16");
    if (contentType === "video") setAspectRatio("16:9");
  }, [contentType]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!title.trim()) return setError(isArabic ? "اكتب عنوان العمل." : "Enter a title.");
    if (!videoFile) return setError(isArabic ? "اختر ملف الفيديو." : "Choose the media file.");
    if (!thumbnailFile) return setError(isArabic ? "اختر صورة مصغرة." : "Choose a thumbnail image.");

    if (contentType === "short" && videoFile.size > 1_500 * 1024 * 1024) {
      return setError(isArabic ? "ملف الـShort كبير جدًا." : "The Short file is too large.");
    }

    setUploading(true);
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) {
        window.location.href = `/${locale}/auth?next=/${locale}/creator/upload`;
        return;
      }

      const { data: creator, error: creatorError } = await supabase.from("creators").select("id").eq("user_id", userData.user.id).single();
      if (creatorError || !creator) throw new Error(creatorError?.message || (isArabic ? "ملف المبدع غير موجود." : "Creator profile not found."));

      const videoName = videoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
      const thumbnailExtension = thumbnailFile.name.split(".").pop() || "jpg";
      const videoPath = `${creator.id}/${crypto.randomUUID()}-${videoName}`;
      const thumbnailPath = `${creator.id}/${crypto.randomUUID()}.${thumbnailExtension}`;

      const { error: videoUploadError } = await supabase.storage.from("videos").upload(videoPath, videoFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: videoFile.type || "video/mp4",
      });
      if (videoUploadError) throw videoUploadError;

      const { error: thumbnailUploadError } = await supabase.storage.from("thumbnails").upload(thumbnailPath, thumbnailFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: thumbnailFile.type || "image/jpeg",
      });
      if (thumbnailUploadError) {
        await supabase.storage.from("videos").remove([videoPath]);
        throw thumbnailUploadError;
      }

      const { data: thumbnailData } = supabase.storage.from("thumbnails").getPublicUrl(thumbnailPath);
      const { error: insertError } = await supabase.from("videos").insert({
        creator_id: creator.id,
        category_id: categoryId ? Number(categoryId) : null,
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoPath,
        thumbnail_url: thumbnailData.publicUrl,
        duration: null,
        views: 0,
        likes: 0,
        published: false,
        content_type: contentType,
        aspect_ratio: aspectRatio,
        is_creator_content: true,
      });

      if (insertError) {
        await Promise.all([
          supabase.storage.from("videos").remove([videoPath]),
          supabase.storage.from("thumbnails").remove([thumbnailPath]),
        ]);
        throw insertError;
      }

      setTitle("");
      setDescription("");
      setCategoryId("");
      setVideoFile(null);
      setThumbnailFile(null);
      const videoInput = document.getElementById("video-file") as HTMLInputElement | null;
      const thumbnailInput = document.getElementById("thumbnail-file") as HTMLInputElement | null;
      if (videoInput) videoInput.value = "";
      if (thumbnailInput) thumbnailInput.value = "";
      setMessage(isArabic ? "تم رفع العمل وحفظه كمسودة. يمكنك نشره من Studio > Content." : "Work uploaded and saved as a draft. Publish it from Studio > Content.");
    } catch (err) {
      setError(err instanceof Error ? err.message : (isArabic ? "فشل الرفع." : "Upload failed."));
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]"><div className="mx-auto max-w-3xl text-center">{isArabic ? "جارٍ التحميل..." : "Loading..."}</div></main>;
  }

  return (
    <PlatformShell active="creators" eyebrow="RAVINE Creator" title={isArabic ? "انشر عملك" : "Publish your work"} description={isArabic ? "Composer واحد للـVideos والـShorts والـPodcasts، جاهز لدورة النشر داخل Studio." : "One composer for Videos, Shorts and Podcasts, ready for the Studio publishing workflow."}>
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-8 md:px-8">
        <a href={`/${locale}/studio`} className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: "rgba(241,233,220,.55)" }}><ArrowLeft size={15}/>{isArabic ? "العودة إلى Studio" : "Back to Studio"}</a>

        <form onSubmit={handleSubmit} className="mt-6 rounded-[34px] border p-6 md:p-8" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.78)" }}>
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{ color: "#C47A52" }}>{isArabic ? "نوع العمل" : "Work type"}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {typeOptions.map(({ value, icon: Icon, ar, en, hintAr, hintEn }) => {
                const selected = contentType === value;
                return <button key={value} type="button" onClick={() => setContentType(value)} className="rounded-[24px] border p-5 text-start transition" style={{ borderColor: selected ? "rgba(196,122,82,.62)" : "rgba(241,233,220,.08)", background: selected ? "rgba(196,122,82,.10)" : "rgba(9,9,9,.28)" }}><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "rgba(241,233,220,.05)", color: selected ? "#C47A52" : "rgba(241,233,220,.45)" }}><Icon size={18}/></span>{selected && <CheckCircle2 size={17} style={{color:"#C47A52"}}/>}</div><div className="mt-4 text-sm font-black">{isArabic ? ar : en}</div><p className="mt-2 text-xs leading-5" style={{color:"rgba(241,233,220,.42)"}}>{isArabic ? hintAr : hintEn}</p></button>;
              })}
            </div>
          </section>

          <label className="mt-7 block text-sm font-bold">{isArabic ? "العنوان" : "Title"}<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className="mt-2 w-full rounded-2xl border bg-[#090909] px-4 py-3 outline-none" style={{borderColor:"rgba(241,233,220,.08)"}} placeholder={isArabic ? "عنوان العمل" : "Work title"}/></label>
          <label className="mt-5 block text-sm font-bold">{isArabic ? "الوصف" : "Description"}<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} maxLength={3000} className="mt-2 w-full resize-y rounded-2xl border bg-[#090909] px-4 py-3 text-sm leading-7 outline-none" style={{borderColor:"rgba(241,233,220,.08)"}} placeholder={isArabic ? "احكِ للناس عن العمل..." : "Tell people about the work..."}/></label>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold">{isArabic ? "التصنيف" : "Category"}<select value={categoryId} onChange={(e)=>setCategoryId(e.target.value)} className="mt-2 w-full rounded-2xl border bg-[#090909] px-4 py-3 text-sm outline-none" style={{borderColor:"rgba(241,233,220,.08)"}}><option value="">{isArabic ? "بدون تصنيف" : "No category"}</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="block text-sm font-bold">{isArabic ? "نسبة العرض" : "Aspect ratio"}<select value={aspectRatio} onChange={(e)=>setAspectRatio(e.target.value as AspectRatio)} className="mt-2 w-full rounded-2xl border bg-[#090909] px-4 py-3 text-sm outline-none" style={{borderColor:"rgba(241,233,220,.08)"}}><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option><option value="4:5">4:5</option></select></label>
          </div>

          <label className="mt-5 block text-sm font-bold"><span className="flex items-center gap-2"><FileImage size={15} style={{color:"#C47A52"}}/>{isArabic ? "ملف العمل" : "Work file"}</span><input id="video-file" type="file" accept={contentType === "podcast" ? "video/*,audio/*" : "video/*"} required onChange={(e)=>setVideoFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-2xl border bg-[#090909] px-4 py-4 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#C47A52] file:px-4 file:py-2 file:font-semibold file:text-[#090909]" style={{borderColor:"rgba(241,233,220,.08)",color:"rgba(241,233,220,.68)"}}/>{videoFile && <span className="mt-2 block text-xs" style={{color:"rgba(241,233,220,.40)"}}>{videoFile.name} · {(videoFile.size/1024/1024).toFixed(1)} MB</span>}</label>
          <label className="mt-5 block text-sm font-bold"><span className="flex items-center gap-2"><FileImage size={15} style={{color:"#C47A52"}}/>{isArabic ? "الصورة المصغرة" : "Thumbnail"}</span><input id="thumbnail-file" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(e)=>setThumbnailFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-2xl border bg-[#090909] px-4 py-4 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#C47A52] file:px-4 file:py-2 file:font-semibold file:text-[#090909]" style={{borderColor:"rgba(241,233,220,.08)",color:"rgba(241,233,220,.68)"}}/>{thumbnailFile && <span className="mt-2 block text-xs" style={{color:"rgba(241,233,220,.40)"}}>{thumbnailFile.name} · {(thumbnailFile.size/1024/1024).toFixed(1)} MB</span>}</label>

          <div className="mt-6 rounded-2xl border p-4 text-xs leading-6" style={{borderColor:"rgba(24,63,70,.65)",background:"rgba(24,63,70,.10)",color:"rgba(241,233,220,.52)"}}>{contentType === "short" ? (isArabic ? "Shorts مصممة كطبقة قصيرة حتى 3 دقائق؛ تأكد من أن الملف مناسب قبل الرفع." : "Shorts are designed as the short-form layer up to 3 minutes; make sure the file fits before uploading.") : contentType === "podcast" ? (isArabic ? "Podcast مخصص للمبدعين ويُحفظ كمسودة حتى تنشره من Studio." : "Podcast is creator-only and is saved as a draft until you publish it from Studio.") : (isArabic ? "كل الأعمال تُحفظ كمسودة أولًا، ويمكن نشرها أو إعادتها لمسودة من Studio > Content." : "Every work is saved as a draft first. Publish or return it to draft from Studio > Content.")}</div>

          <button type="submit" disabled={uploading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50" style={{background:"#C47A52",color:"#090909"}}>{uploading ? <Loader2 size={17} className="animate-spin"/> : <UploadCloud size={17}/>} {uploading ? (isArabic ? "جارٍ الرفع..." : "Uploading...") : (isArabic ? "رفع وحفظ كمسودة" : "Upload & save draft")}</button>

          {message && <div className="mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm" style={{borderColor:"rgba(24,63,70,.70)",background:"rgba(24,63,70,.14)"}}><CheckCircle2 size={17} style={{color:"#C47A52"}}/><span>{message}</span></div>}
          {error && <div className="mt-5 rounded-2xl border p-4 text-sm leading-6" style={{borderColor:"rgba(196,122,82,.35)",background:"rgba(196,122,82,.08)"}}>{error}</div>}
        </form>
      </div>
    </PlatformShell>
  );
}
