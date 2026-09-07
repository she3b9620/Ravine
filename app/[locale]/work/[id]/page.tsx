import Link from "next/link";
import { notFound } from "next/navigation";
import RAVINEWorkContext from "@/components/RAVINEWorkContext";
import RAVINEWorkPlayer from "@/components/RAVINEWorkPlayer";
import { createClient } from "@/lib/supabase/server";
import { isPlayableRAVINEWork, toRAVINEWork, type RAVINEWorkSource } from "@/lib/ravine-work-universe";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type WorkRow = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  published: boolean | null;
  visibility: string | null;
  discovery_enabled: boolean | null;
  content_type: string | null;
};

export default async function WorkPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const workId = Number(id);
  if (!Number.isInteger(workId) || workId <= 0) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,video_url,duration,published,visibility,discovery_enabled,content_type")
    .eq("id", workId)
    .maybeSingle();

  if (error) {
    return (
      <section className="section">
        <div className="empty-state">
          <strong>{ar ? "تعذر تحميل العمل." : "We could not load this work."}</strong>
          <span>{error.message}</span>
          <Link className="button" href={`/${locale}/discover`}>{ar ? "العودة إلى اكتشف" : "Back to Discover"}</Link>
        </div>
      </section>
    );
  }

  if (!data) notFound();

  const work = toRAVINEWork(data as WorkRow & RAVINEWorkSource);
  const playable = isPlayableRAVINEWork(work);

  return (
    <section className="section ravine-work-page">
      <div className="section-head">
        <div>
          <div className="eyebrow">RAVINE / WORK UNIVERSE</div>
          <p className="section-note">
            {ar ? "العمل هو نقطة الدخول، ثم السياق والناس والمجتمع من حوله." : "The work is the entry point; its context, people, and community grow around it."}
          </p>
        </div>
      </div>

      <RAVINEWorkPlayer work={work} locale={locale} />
      <RAVINEWorkContext work={work} locale={locale} playable={playable} />

      {!playable && work.mediaUrl && work.mediaUrl.includes("youtube.com") ? (
        <div className="empty-state">
          <strong>{ar ? "هذا المصدر مرجعي فقط." : "This source is reference-only."}</strong>
          <span>{ar ? "يحتاج العمل إلى ملف تشغيل متوافق مع مشغل RAVINE." : "This work needs a browser-compatible media source for the RAVINE player."}</span>
        </div>
      ) : null}
    </section>
  );
}
