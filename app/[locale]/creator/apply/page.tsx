"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SPECIALTIES = ["Direction", "Cinematography", "Editing", "Photography", "Writing", "Motion", "Sound", "Design", "Animation", "Journalism"] as const;

export default function CreatorApplyPage() {
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const locale = params.locale === "en" ? "en" : "ar";
  const ar = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [tools, setTools] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [samples, setSamples] = useState("");
  const [originality, setOriginality] = useState(false);
  const [copyright, setCopyright] = useState(false);
  const [standards, setStandards] = useState(false);
  const [noSpam, setNoSpam] = useState(false);
  const [credits, setCredits] = useState(false);

  const copy = useMemo(() => ar ? {
    title: "قدّم نفسك كمبدع في RAVINE.",
    intro: "RAVINE لا يحوّل التقديم إلى مسابقة شعبية. نراجع العمل، الخبرة، والسياق قبل القبول.",
    specialties: "التخصصات",
    bio: "نبذة",
    experience: "الخبرة",
    tools: "الأدوات المستخدمة",
    portfolio: "روابط البورتفوليو",
    samples: "نماذج الأعمال",
    agreements: "الإقرارات",
    submit: "إرسال الطلب",
    pending: "طلبك قيد المراجعة.",
    saved: "تم حفظ طلبك.",
    required: "أكمل الحقول المطلوبة وأوافق على الإقرارات كلها.",
  } : {
    title: "Apply as a creator on RAVINE.",
    intro: "RAVINE does not turn admission into a popularity contest. We review the work, experience, and context.",
    specialties: "Specialties",
    bio: "Bio",
    experience: "Experience",
    tools: "Tools used",
    portfolio: "Portfolio links",
    samples: "Work samples",
    agreements: "Declarations",
    submit: "Submit application",
    pending: "Your application is under review.",
    saved: "Your application was saved.",
    required: "Complete the required fields and accept every declaration.",
  }, [ar]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error || !data.user) {
        router.replace(`/${locale}/auth?next=/${locale}/creator/apply`);
        return;
      }
      const { data: application } = await supabase
        .from("creator_applications")
        .select("specialties,work_samples,bio,experience,tools,portfolio_links,agreed_originality,agreed_copyright,agreed_standards,agreed_no_spam,agreed_credits,status")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      if (application) {
        setSpecialties(Array.isArray(application.specialties) ? application.specialties : []);
        setBio(application.bio || "");
        setExperience(application.experience || "");
        setTools(Array.isArray(application.tools) ? application.tools.join(", ") : "");
        setPortfolio(Array.isArray(application.portfolio_links) ? application.portfolio_links.join("\n") : "");
        setSamples(Array.isArray(application.work_samples) ? application.work_samples.map((item: { title?: string; url?: string }) => [item.title || "", item.url || ""].filter(Boolean).join(" | ")).join("\n") : "");
        setOriginality(Boolean(application.agreed_originality));
        setCopyright(Boolean(application.agreed_copyright));
        setStandards(Boolean(application.agreed_standards));
        setNoSpam(Boolean(application.agreed_no_spam));
        setCredits(Boolean(application.agreed_credits));
        setStatus(application.status || null);
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) {
        setMessage(ar ? "تعذر تحميل طلبك." : "Could not load your application.");
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [ar, locale, router]);

  function toggleSpecialty(value: string) {
    setSpecialties((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!specialties.length || bio.trim().length < 20 || experience.trim().length < 10 || !tools.trim() || !portfolio.trim() || !samples.trim() || !originality || !copyright || !standards || !noSpam || !credits) {
      setMessage(copy.required);
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error(ar ? "انتهت الجلسة. سجّل الدخول مرة أخرى." : "Your session expired. Please sign in again.");

      const work_samples = samples
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          const [title, url] = line.split("|").map((item) => item.trim());
          return { title: title || `Work ${index + 1}`, url: url || title || "" };
        });

      const portfolio_links = portfolio.split("\n").map((line) => line.trim()).filter(Boolean);
      const tools_array = tools.split(",").map((item) => item.trim()).filter(Boolean);

      const { error } = await supabase.from("creator_applications").insert({
        user_id: userData.user.id,
        specialties,
        work_samples,
        bio: bio.trim(),
        experience: experience.trim(),
        tools: tools_array,
        portfolio_links,
        agreed_originality: originality,
        agreed_copyright: copyright,
        agreed_standards: standards,
        agreed_no_spam: noSpam,
        agreed_credits: credits,
        status: "pending",
      });
      if (error) throw error;

      setStatus("pending");
      setMessage(copy.saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="auth-page"><div className="auth-card"><div className="eyebrow">RAVINE / CREATOR</div><p className="auth-intro">{ar ? "نجهز طلبك..." : "Preparing your application..."}</p></div></section>;
  }

  if (status === "pending") {
    return <section className="auth-page"><div className="auth-card"><div className="eyebrow">RAVINE / CREATOR</div><h1>{copy.pending}</h1><p className="auth-intro">{ar ? "تم استلام طلبك. المراجعة يدوية وليست مرتبطة بعدد المتابعين أو المشاهدات." : "Your application has been received. Review is manual and is not tied to follower or view counts."}</p><button className="button primary" type="button" onClick={() => router.push(`/${locale}`)}>{ar ? "العودة إلى RAVINE" : "Return to RAVINE"}</button></div></section>;
  }

  return (
    <section className="auth-page">
      <div className="auth-card creator-application-card">
        <div className="eyebrow">RAVINE / CREATOR APPLICATION</div>
        <h1>{copy.title}</h1>
        <p className="auth-intro">{copy.intro}</p>
        <form onSubmit={submit} className="auth-form">
          <div>
            <div className="eyebrow">{copy.specialties}</div>
            <div className="creator-specialties">
              {SPECIALTIES.map((item) => <button key={item} className={`watch-action ${specialties.includes(item) ? "active" : ""}`} type="button" onClick={() => toggleSpecialty(item)}>{item}</button>)}
            </div>
          </div>

          <label>{copy.bio}<textarea value={bio} onChange={(e) => setBio(e.target.value)} minLength={20} maxLength={2000} rows={6} required /></label>
          <label>{copy.experience}<textarea value={experience} onChange={(e) => setExperience(e.target.value)} minLength={10} maxLength={2000} rows={5} required /></label>
          <label>{copy.tools}<input value={tools} onChange={(e) => setTools(e.target.value)} placeholder="DaVinci Resolve, Premiere Pro, Camera..." required /></label>
          <label>{copy.portfolio}<textarea value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="One URL per line" rows={4} required /></label>
          <label>{copy.samples}<textarea value={samples} onChange={(e) => setSamples(e.target.value)} placeholder="Title | https://example.com/work" rows={5} required /></label>

          <fieldset className="creator-agreements">
            <legend>{copy.agreements}</legend>
            <label><input type="checkbox" checked={originality} onChange={(e) => setOriginality(e.target.checked)} />{ar ? "أقر بأصالة الأعمال التي أقدمها." : "I confirm that the work I submit is original."}</label>
            <label><input type="checkbox" checked={copyright} onChange={(e) => setCopyright(e.target.checked)} />{ar ? "ألتزم بحقوق الملكية الفكرية." : "I will respect copyright and intellectual property rights."}</label>
            <label><input type="checkbox" checked={standards} onChange={(e) => setStandards(e.target.checked)} />{ar ? "ألتزم بمعايير RAVINE." : "I agree to RAVINE standards."}</label>
            <label><input type="checkbox" checked={noSpam} onChange={(e) => setNoSpam(e.target.checked)} />{ar ? "لن أستخدم المنصة للإزعاج أو المحتوى المزعج." : "I will not use the platform for spam or abusive promotion."}</label>
            <label><input type="checkbox" checked={credits} onChange={(e) => setCredits(e.target.checked)} />{ar ? "سأحافظ على الحقوق والـcredits لجميع المشاركين." : "I will preserve credits for all collaborators."}</label>
          </fieldset>

          <button className="button primary auth-submit" type="submit" disabled={saving}>{saving ? "…" : copy.submit}</button>
        </form>
        {message && <p className="auth-message">{message}</p>}
      </div>
    </section>
  );
}
