"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type WorkSample = { title: string; url: string };

const SPECIALTIES = [
  ["film", "Film"],
  ["photography", "Photography"],
  ["editing", "Editing"],
  ["motion", "Motion"],
  ["vfx", "VFX"],
  ["documentary", "Documentary"],
  ["music", "Music"],
  ["podcast", "Podcast"],
  ["animation", "Animation"],
  ["other", "Other"],
] as const;

export default function CreatorApplyPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [specialties, setSpecialties] = useState<string[]>([]);
  const [workSamples, setWorkSamples] = useState<WorkSample[]>([{ title: "", url: "" }]);
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [tools, setTools] = useState("");
  const [portfolioLinks, setPortfolioLinks] = useState("");

  const [agreedOriginality, setAgreedOriginality] = useState(false);
  const [agreedCopyright, setAgreedCopyright] = useState(false);
  const [agreedStandards, setAgreedStandards] = useState(false);
  const [agreedNoSpam, setAgreedNoSpam] = useState(false);
  const [agreedCredits, setAgreedCredits] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        router.replace(`/${locale}`);
        return;
      }

      const [{ data: profile }, { data: activeApplication }] = await Promise.all([
        supabase.from("profiles").select("is_creator").eq("id", user.id).maybeSingle(),
        supabase
          .from("creator_applications")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["pending", "reviewing"])
          .maybeSingle(),
      ]);

      if (!mounted) return;

      if (profile?.is_creator) {
        setExistingStatus("creator");
      } else if (activeApplication) {
        setExistingStatus(activeApplication.status);
        setSpecialties(activeApplication.specialties ?? []);
        setWorkSamples(Array.isArray(activeApplication.work_samples) && activeApplication.work_samples.length
          ? activeApplication.work_samples
          : [{ title: "", url: "" }]);
        setBio(activeApplication.bio ?? "");
        setExperience(activeApplication.experience ?? "");
        setTools((activeApplication.tools ?? []).join(", "));
        setPortfolioLinks((activeApplication.portfolio_links ?? []).join("\n"));
        setAgreedOriginality(Boolean(activeApplication.agreed_originality));
        setAgreedCopyright(Boolean(activeApplication.agreed_copyright));
        setAgreedStandards(Boolean(activeApplication.agreed_standards));
        setAgreedNoSpam(Boolean(activeApplication.agreed_no_spam));
        setAgreedCredits(Boolean(activeApplication.agreed_credits));
      }

      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [locale, router, supabase]);

  function toggleSpecialty(value: string) {
    setSpecialties((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  function updateWork(index: number, key: keyof WorkSample, value: string) {
    setWorkSamples((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  function addWork() {
    setWorkSamples((current) => current.length >= 3 ? current : [...current, { title: "", url: "" }]);
  }

  function removeWork(index: number) {
    setWorkSamples((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!specialties.length) {
      setError(isArabic ? "اختر مجالًا إبداعيًا واحدًا على الأقل." : "Choose at least one creative specialty.");
      return;
    }

    const cleanWorks = workSamples
      .map((item) => ({ title: item.title.trim(), url: item.url.trim() }))
      .filter((item) => item.title && item.url)
      .slice(0, 3);

    if (!cleanWorks.length && !portfolioLinks.trim()) {
      setError(isArabic ? "أضف عملًا واحدًا على الأقل أو رابط بورتفوليو موثوق." : "Add at least one work sample or a credible portfolio link.");
      return;
    }

    if (![agreedOriginality, agreedCopyright, agreedStandards, agreedNoSpam, agreedCredits].every(Boolean)) {
      setError(isArabic ? "يجب الموافقة على جميع بنود اتفاق المبدع." : "All creator agreement items are required.");
      return;
    }

    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        router.replace(`/${locale}`);
        return;
      }

      const payload = {
        user_id: user.id,
        specialties,
        work_samples: cleanWorks,
        bio: bio.trim(),
        experience: experience.trim(),
        tools: tools.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30),
        portfolio_links: portfolioLinks.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 10),
        agreed_originality: agreedOriginality,
        agreed_copyright: agreedCopyright,
        agreed_standards: agreedStandards,
        agreed_no_spam: agreedNoSpam,
        agreed_credits: agreedCredits,
        status: "pending",
      };

      const { error: insertError } = existingStatus
        ? await supabase.from("creator_applications").update(payload).eq("user_id", user.id).eq("status", "pending")
        : await supabase.from("creator_applications").insert(payload);

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error(isArabic ? "لديك طلب مبدع قيد المراجعة بالفعل." : "You already have a creator application under review.");
        }
        throw insertError;
      }

      setExistingStatus("pending");
      setSuccess(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : (isArabic ? "تعذر إرسال الطلب." : "Unable to submit the application."));
    } finally {
      setSaving(false);
    }
  }

  const copy = {
    eyebrow: isArabic ? "هوية المبدع" : "CREATOR IDENTITY",
    title: isArabic ? "قدّم عملك. لا تطلب لقبًا." : "Show the work. Earn the creator status.",
    description: isArabic
      ? "طلب RAVINE للمبدعين يركز على الدليل الإبداعي والملف المهني، وليس عدد المتابعين."
      : "RAVINE evaluates creative evidence and professional readiness, not follower count.",
  };

  if (loading) {
    return <PlatformShell active="creators" eyebrow={copy.eyebrow} title={copy.title} description={copy.description}><div className="mx-auto max-w-4xl px-5 py-16"><Loader2 className="animate-spin opacity-60" /></div></PlatformShell>;
  }

  if (existingStatus === "creator") {
    return <PlatformShell active="creators" eyebrow={copy.eyebrow} title={copy.title} description={copy.description}><div className="mx-auto max-w-4xl px-5 py-16"><div className="rounded-3xl border p-8" style={{ borderColor: "rgba(196,122,82,.3)", background: "rgba(21,23,25,.72)" }}><h2 className="text-2xl font-bold">{isArabic ? "أنت مبدع بالفعل." : "You are already a creator."}</h2><p className="mt-3 opacity-60">{isArabic ? "يمكنك الانتقال إلى مساحة المبدع لمتابعة أعمالك." : "Continue to your creator workspace to manage your work."}</p><button type="button" onClick={() => router.push(`/${locale}/creators-hub`)} className="mt-6 rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: "rgba(196,122,82,.4)", color: "#C47A52" }}>{isArabic ? "فتح مساحة المبدع" : "Open creator workspace"}</button></div></div></PlatformShell>;
  }

  if (existingStatus === "reviewing") {
    return <PlatformShell active="creators" eyebrow={copy.eyebrow} title={copy.title} description={copy.description}><div className="mx-auto max-w-4xl px-5 py-16"><div className="rounded-3xl border p-8" style={{ borderColor: "rgba(24,63,70,.65)", background: "rgba(21,23,25,.72)" }}><h2 className="text-2xl font-bold">{isArabic ? "طلبك قيد المراجعة." : "Your application is under review."}</h2><p className="mt-3 opacity-60">{isArabic ? "لن يتم تحويل حسابك تلقائيًا إلى مبدع قبل اكتمال المراجعة." : "Creator status is not granted automatically before review."}</p></div></div></PlatformShell>;
  }

  return (
    <PlatformShell active="creators" eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
      <form onSubmit={submit} className="mx-auto max-w-5xl px-5 pb-24 pt-8 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border p-6" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.72)" }}>
              <h2 className="text-xl font-bold">{isArabic ? "ماذا تصنع؟" : "What do you create?"}</h2>
              <p className="mt-2 text-sm opacity-55">{isArabic ? "اختر كل المجالات التي تمثل عملك." : "Select every discipline that represents your work."}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {SPECIALTIES.map(([value, label]) => {
                  const selected = specialties.includes(value);
                  return <button type="button" key={value} onClick={() => toggleSpecialty(value)} className="rounded-full border px-4 py-2.5 text-xs font-semibold transition" style={{ borderColor: selected ? "rgba(196,122,82,.5)" : "rgba(241,233,220,.09)", background: selected ? "rgba(196,122,82,.13)" : "transparent", color: selected ? "#D49A78" : "inherit" }}>{selected ? "✓ " : ""}{isArabic ? ({ film: "سينما", photography: "تصوير", editing: "مونتاج", motion: "موشن", vfx: "VFX", documentary: "وثائقي", music: "موسيقى", podcast: "بودكاست", animation: "أنيميشن", other: "أخرى" } as Record<string, string>)[value] : label}</button>;
                })}
              </div>
            </section>

            <section className="rounded-[28px] border p-6" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.72)" }}>
              <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold">{isArabic ? "اعرض أعمالك" : "Show your work"}</h2><p className="mt-2 text-sm opacity-55">{isArabic ? "حتى 3 أعمال أو أدلة موثوقة على بورتفوليوك." : "Up to 3 works or credible portfolio evidence."}</p></div><button type="button" onClick={addWork} disabled={workSamples.length >= 3} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-30" style={{ borderColor: "rgba(196,122,82,.35)", color: "#C47A52" }}><Plus size={15} />{isArabic ? "إضافة" : "Add"}</button></div>
              <div className="mt-5 space-y-3">
                {workSamples.map((work, index) => <div key={index} className="rounded-2xl border p-4" style={{ borderColor: "rgba(241,233,220,.07)" }}><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold opacity-50">{isArabic ? `عمل ${index + 1}` : `Work ${index + 1}`}</span>{workSamples.length > 1 && <button type="button" onClick={() => removeWork(index)} aria-label="Remove"><X size={15} className="opacity-45" /></button>}</div><input value={work.title} onChange={(event) => updateWork(index, "title", event.target.value)} placeholder={isArabic ? "اسم العمل" : "Work title"} className="mt-3 w-full rounded-xl border bg-transparent px-3 py-3 text-sm outline-none" style={{ borderColor: "rgba(241,233,220,.08)" }} /><div className="mt-2 flex items-center gap-2"><ExternalLink size={15} className="shrink-0 opacity-40" /><input value={work.url} onChange={(event) => updateWork(index, "url", event.target.value)} placeholder={isArabic ? "رابط العمل أو البورتفوليو" : "Work or portfolio URL"} className="w-full bg-transparent py-2 text-sm outline-none" /></div></div>)}
              </div>
              <textarea value={portfolioLinks} onChange={(event) => setPortfolioLinks(event.target.value)} rows={4} placeholder={isArabic ? "روابط إضافية للبورتفوليو — رابط في كل سطر" : "Additional portfolio links — one URL per line"} className="mt-3 w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none" style={{ borderColor: "rgba(241,233,220,.08)" }} />
            </section>

            <section className="rounded-[28px] border p-6" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.72)" }}>
              <h2 className="text-xl font-bold">{isArabic ? "ملفك الإبداعي" : "Creative profile"}</h2>
              <div className="mt-5 space-y-4"><textarea required value={bio} onChange={(event) => setBio(event.target.value)} rows={5} placeholder={isArabic ? "نبذة مهنية قصيرة عنك وعن نوع الأعمال التي تصنعها..." : "A concise professional bio and the kind of work you create..."} className="w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none" style={{ borderColor: "rgba(241,233,220,.08)" }} /><textarea value={experience} onChange={(event) => setExperience(event.target.value)} rows={4} placeholder={isArabic ? "الخبرة والمسار الإبداعي..." : "Experience and creative background..."} className="w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none" style={{ borderColor: "rgba(241,233,220,.08)" }} /><input value={tools} onChange={(event) => setTools(event.target.value)} placeholder={isArabic ? "الأدوات والمهارات — افصل بينها بفواصل" : "Tools and skills — separate with commas"} className="w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none" style={{ borderColor: "rgba(241,233,220,.08)" }} /></div>
            </section>
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-24">
            <section className="rounded-[28px] border p-6" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.72)" }}>
              <h2 className="text-lg font-bold">{isArabic ? "اتفاق المبدع" : "Creator agreement"}</h2>
              <p className="mt-2 text-xs leading-5 opacity-50">{isArabic ? "أنت مسؤول عن أصالة العمل وحقوقه ودقة الـcredits واحترام المجتمع." : "You are responsible for originality, rights, accurate credits, and community conduct."}</p>
              <div className="mt-5 space-y-3 text-sm">
                {[[agreedOriginality, setAgreedOriginality, isArabic ? "أعمالي أصلية أو لدي حق نشرها." : "My work is original or I have the right to publish it."],[agreedCopyright, setAgreedCopyright, isArabic ? "أتحمل مسؤولية حقوق النشر والترخيص." : "I take responsibility for copyright and licensing."],[agreedStandards, setAgreedStandards, isArabic ? "سألتزم بمعايير المجتمع." : "I will follow community standards."],[agreedNoSpam, setAgreedNoSpam, isArabic ? "لن أستخدم السبام أو التفاعل الزائف." : "I will not use spam or fraudulent engagement."],[agreedCredits, setAgreedCredits, isArabic ? "سأضع credits دقيقة للمساهمين." : "I will provide accurate credits to collaborators."]].map(([checked, setter, label], index) => <label key={index} className="flex cursor-pointer gap-3"><input type="checkbox" checked={Boolean(checked)} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="mt-1 size-4 accent-[#C47A52]" /><span className="text-xs leading-5 opacity-75">{label as string}</span></label>)}
              </div>
            </section>

            {existingStatus === "pending" && <div className="rounded-3xl border p-5 text-sm" style={{ borderColor: "rgba(196,122,82,.3)", background: "rgba(196,122,82,.08)" }}>{isArabic ? "يمكنك تحديث طلبك ما دام لم يدخل المراجعة." : "You can update your application while it remains pending."}</div>}

            {error && <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-5 text-sm text-red-100">{error}</div>}
            {success && <div className="rounded-3xl border p-5 text-sm" style={{ borderColor: "rgba(24,63,70,.7)", background: "rgba(24,63,70,.14)" }}><div className="flex items-start gap-3"><Check size={17} className="mt-0.5 shrink-0" /><span>{isArabic ? "تم حفظ طلبك. ستنتقل حالته إلى المراجعة عند بدء فريق RAVINE في تقييمه." : "Your application is saved. It will move to review when the RAVINE team begins evaluating it."}</span></div></div>}

            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3.5 text-sm font-bold transition disabled:opacity-50" style={{ borderColor: "rgba(196,122,82,.5)", background: "rgba(196,122,82,.12)", color: "#D49A78" }}>{saving ? <Loader2 size={17} className="animate-spin" /> : null}{saving ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : existingStatus === "pending" ? (isArabic ? "تحديث الطلب" : "Update application") : (isArabic ? "إرسال الطلب" : "Submit application")}</button>
          </aside>
        </div>
      </form>
    </PlatformShell>
  );
}
