"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, ExternalLink, FileText, Film, LoaderCircle, ShieldCheck, Sparkles, UserRound, Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CREATOR_SPECIALTY_GROUPS as SPECIALTY_GROUPS, CREATOR_SPECIALTIES as SPECIALTIES } from "@/lib/creator-taxonomy";
import styles from "../creator-flow.module.css";

type Locale = "ar" | "en";
type ApplicationStatus = "pending" | "reviewing" | "approved" | "rejected" | "withdrawn" | null;
type WorkSample = { title: string; url: string };
type CreatorDraft = {
  specialties: string[];
  additionalSpecialty: string;
  bio: string;
  experience: string;
  tools: string;
  portfolio: string;
  samples: string;
  originality: boolean;
  copyright: boolean;
  standards: boolean;
  noSpam: boolean;
  credits: boolean;
};
type Copy = {
  title: string;
  description: string;
  continue: string;
  back: string;
  submit: string;
  specialties: string;
  bio: string;
  experience: string;
  tools: string;
  portfolio: string;
  samples: string;
  agreements: string;
  required: string;
};



const STEP_DEFINITIONS = [
  { key: "identity", number: "01", label: { ar: "هويتك الإبداعية", en: "Creative identity" }, hint: { ar: "مجالك وما الذي يميّز نظرتك.", en: "Your discipline and point of view." } },
  { key: "practice", number: "02", label: { ar: "خبرتك وطريقتك", en: "Practice & experience" }, hint: { ar: "خبرة حقيقية والأدوات التي تتقنها.", en: "Your experience and working tools." } },
  { key: "portfolio", number: "03", label: { ar: "الأعمال والأدلة", en: "Portfolio & evidence" }, hint: { ar: "روابط مباشرة تثبت ما تستطيع صنعه.", en: "Direct links that show what you can make." } },
  { key: "review", number: "04", label: { ar: "المراجعة والتعهّد", en: "Review & standards" }, hint: { ar: "راجع بياناتك وأرسل طلبًا مكتملًا.", en: "Review your details and submit." } },
] as const;

const EMPTY_DRAFT: CreatorDraft = {
  specialties: [],
  additionalSpecialty: "",
  bio: "",
  experience: "",
  tools: "",
  portfolio: "",
  samples: "",
  originality: false,
  copyright: false,
  standards: false,
  noSpam: false,
  credits: false,
};

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function cleanLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function parseWorkSamples(value: string): WorkSample[] {
  return cleanLines(value).map((line) => {
    const divider = line.indexOf("|");
    return divider < 0
      ? { title: "", url: line }
      : { title: line.slice(0, divider).trim(), url: line.slice(divider + 1).trim() };
  });
}

function applyDraft(setters: {
  setSpecialties: (value: string[]) => void;
  setAdditionalSpecialty: (value: string) => void;
  setBio: (value: string) => void;
  setExperience: (value: string) => void;
  setTools: (value: string) => void;
  setPortfolio: (value: string) => void;
  setSamples: (value: string) => void;
  setOriginality: (value: boolean) => void;
  setCopyright: (value: boolean) => void;
  setStandards: (value: boolean) => void;
  setNoSpam: (value: boolean) => void;
  setCredits: (value: boolean) => void;
}, draft: Partial<CreatorDraft>) {
  if (Array.isArray(draft.specialties)) setters.setSpecialties(draft.specialties);
  if (typeof draft.additionalSpecialty === "string") setters.setAdditionalSpecialty(draft.additionalSpecialty);
  if (typeof draft.bio === "string") setters.setBio(draft.bio);
  if (typeof draft.experience === "string") setters.setExperience(draft.experience);
  if (typeof draft.tools === "string") setters.setTools(draft.tools);
  if (typeof draft.portfolio === "string") setters.setPortfolio(draft.portfolio);
  if (typeof draft.samples === "string") setters.setSamples(draft.samples);
  if (typeof draft.originality === "boolean") setters.setOriginality(draft.originality);
  if (typeof draft.copyright === "boolean") setters.setCopyright(draft.copyright);
  if (typeof draft.standards === "boolean") setters.setStandards(draft.standards);
  if (typeof draft.noSpam === "boolean") setters.setNoSpam(draft.noSpam);
  if (typeof draft.credits === "boolean") setters.setCredits(draft.credits);
}

export default function CreatorApplyPage() {
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const locale: Locale = params.locale === "en" ? "en" : "ar";
  const ar = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [alreadyCreator, setAlreadyCreator] = useState(false);
  const [step, setStep] = useState(0);

  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyQuery, setSpecialtyQuery] = useState("");
  const [additionalSpecialty, setAdditionalSpecialty] = useState("");
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

  const copy: Copy = useMemo(() => ar ? {
    title: "قدّم عملك، لا عدد متابعيك.",
    description: "مسار المبدع في رَافِين يهدف إلى بناء هوية إبداعية موثوقة. نراجع جودة العمل وسياقه ومساهمتك فيه، لا حجم جمهورك.",
    continue: "متابعة",
    back: "رجوع",
    submit: "إرسال للمراجعة",
    specialties: "مجالاتك الإبداعية",
    bio: "عرّفنا بنفسك وبنظرتك الإبداعية",
    experience: "خبرتك ومسارك",
    tools: "الأدوات التي تعمل بها",
    portfolio: "روابط البورتفوليو",
    samples: "نماذج مختارة من أعمالك",
    agreements: "معايير ومسؤوليات المبدع",
    required: "أكمل متطلبات هذه المرحلة قبل المتابعة.",
  } : {
    title: "Show your work, not your follower count.",
    description: "RAVINE’s creator pathway is designed to build trusted creative identities. We review the work, its context, and your contribution—not audience size.",
    continue: "Continue",
    back: "Back",
    submit: "Submit for review",
    specialties: "Your creative disciplines",
    bio: "Introduce yourself and your creative point of view",
    experience: "Your experience and path",
    tools: "Tools you work with",
    portfolio: "Portfolio links",
    samples: "Selected work samples",
    agreements: "Creator standards & responsibilities",
    required: "Complete this step before continuing.",
  }, [ar]);

  const stepDetails = useMemo(() => STEP_DEFINITIONS.map((item) => ({
    number: item.number,
    key: item.key,
    label: item.label[locale],
    hint: item.hint[locale],
  })), [locale]);

  const filteredSpecialtyGroups = useMemo(() => {
    const query = specialtyQuery.trim().toLocaleLowerCase();
    return SPECIALTY_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => !query || (item.value + " " + item.en + " " + item.ar).toLocaleLowerCase().includes(query)),
    })).filter((group) => group.items.length > 0);
  }, [specialtyQuery]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!mounted) return;
        if (authError || !authData.user) {
          router.replace("/" + locale + "/auth?next=/" + locale + "/creator/apply");
          return;
        }

        const uid = authData.user.id;
        setUserId(uid);
        const [{ data: profile }, { data: application, error: applicationError }] = await Promise.all([
          supabase.from("profiles").select("is_creator").eq("id", uid).maybeSingle(),
          supabase.from("creator_applications")
            .select("specialties,work_samples,bio,experience,tools,portfolio_links,agreed_originality,agreed_copyright,agreed_standards,agreed_no_spam,agreed_credits,status,reviewer_notes")
            .eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (!mounted) return;
        if (profile?.is_creator) setAlreadyCreator(true);
        if (applicationError) throw applicationError;

        if (application) {
          const savedSpecialties = Array.isArray(application.specialties) ? application.specialties as string[] : [];
          const savedCustomSpecialty = savedSpecialties.find((item) => item.startsWith("Other: "));
          const hasOther = savedSpecialties.some((item) => item === "Other" || item.startsWith("Other: "));
          const knownSpecialties = savedSpecialties.filter((item) => item !== "Other" && !item.startsWith("Other: "));
          setSpecialties(hasOther ? [...knownSpecialties, "Other"] : knownSpecialties);
          setAdditionalSpecialty(savedCustomSpecialty ? savedCustomSpecialty.slice("Other: ".length) : "");
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
          setApplicationStatus((application.status || null) as ApplicationStatus);
          setReviewerNotes(application.reviewer_notes || "");
        }

        const status = (application?.status || null) as ApplicationStatus;
        if (status !== "pending" && status !== "reviewing" && status !== "approved" && !profile?.is_creator) {
          try {
            const rawDraft = window.localStorage.getItem("ravine_creator_draft_" + uid);
            if (rawDraft) {
              const draft = JSON.parse(rawDraft) as Partial<CreatorDraft>;
              applyDraft({
                setSpecialties, setAdditionalSpecialty, setBio, setExperience, setTools, setPortfolio, setSamples,
                setOriginality, setCopyright, setStandards, setNoSpam, setCredits,
              }, draft);
            }
          } catch {
            // A corrupted local draft should never block the application form.
          }
        }
        setDraftReady(true);
        setLoading(false);
      } catch (error) {
        if (mounted) {
          setMessage(error instanceof Error ? error.message : (ar ? "تعذر تحميل طلبك." : "Could not load your application."));
          setLoading(false);
        }
      }
    }
    void load();
    return () => { mounted = false; };
  }, [ar, locale, router]);

  useEffect(() => {
    if (!draftReady || !userId || alreadyCreator || applicationStatus === "pending" || applicationStatus === "reviewing" || applicationStatus === "approved") return;
    const draft: CreatorDraft = { specialties, additionalSpecialty, bio, experience, tools, portfolio, samples, originality, copyright, standards, noSpam, credits };
    try {
      window.localStorage.setItem("ravine_creator_draft_" + userId, JSON.stringify(draft));
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
    }
  }, [draftReady, userId, alreadyCreator, applicationStatus, specialties, additionalSpecialty, bio, experience, tools, portfolio, samples, originality, copyright, standards, noSpam, credits]);

  function toggleSpecialty(value: string) {
    setMessage("");
    setSpecialties((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function validationFor(index: number): string | null {
    if (index === 0) {
      if (!specialties.length) return ar ? "اختر مجالًا إبداعيًا واحدًا على الأقل." : "Choose at least one creative discipline.";
      if (bio.trim().length < 20) return ar ? "اكتب نبذة من 20 حرفًا على الأقل." : "Write a bio of at least 20 characters.";
      if (specialties.includes("Other") && additionalSpecialty.trim().length < 2) return ar ? "اكتب اسم مجالك في خانة «مجال آخر»." : "Describe your field in the custom specialty field.";
    }
    if (index === 1) {
      if (experience.trim().length < 10) return ar ? "اكتب نبذة أوضح عن خبرتك ومسارك." : "Add more detail about your experience and path.";
      if (!tools.split(",").map((item) => item.trim()).filter(Boolean).length) return ar ? "اذكر أداة أو مهارة تقنية واحدة على الأقل." : "List at least one tool or technical skill.";
    }
    if (index === 2) {
      const links = cleanLines(portfolio);
      const works = parseWorkSamples(samples);
      if (!links.length) return ar ? "أضف رابطًا واحدًا على الأقل إلى البورتفوليو." : "Add at least one portfolio link.";
      if (!links.every(isHttpUrl)) return ar ? "كل رابط بورتفوليو يجب أن يبدأ بـ https:// أو http://." : "Every portfolio link must start with https:// or http://.";
      if (!works.length) return ar ? "أضف نموذجًا واحدًا على الأقل من أعمالك." : "Add at least one work sample.";
      if (!works.every((item) => item.title.length > 1 && isHttpUrl(item.url))) return ar ? "اكتب عنوانًا ورابطًا صحيحًا لكل نموذج بهذا الشكل: العنوان | https://..." : "Each sample needs a title and an HTTP(S) URL: Title | https://...";
      if (links.length > 8 || works.length > 8) return ar ? "أضف 8 روابط كحد أقصى في كل قائمة." : "Add no more than 8 links to each list.";
    }
    if (index === 3 && !(originality && copyright && standards && noSpam && credits)) {
      return ar ? "اقرأ الإقرارات وحددها كلها قبل إرسال الطلب." : "Review and accept every declaration before submitting.";
    }
    return null;
  }

  function continueStep() {
    const problem = validationFor(step);
    if (problem) {
      setMessage(problem);
      return;
    }
    setMessage("");
    setStep((current) => Math.min(current + 1, stepDetails.length - 1));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    for (let index = 0; index < stepDetails.length; index += 1) {
      const problem = validationFor(index);
      if (problem) {
        setStep(index);
        setMessage(problem);
        return;
      }
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error(ar ? "انتهت الجلسة. سجّل الدخول مرة أخرى." : "Your session expired. Please sign in again.");

      const work_samples = parseWorkSamples(samples).map((item) => ({ title: item.title, url: item.url }));
      const portfolio_links = cleanLines(portfolio);
      const tools_array = tools.split(",").map((item) => item.trim()).filter(Boolean);
      const { error } = await supabase.from("creator_applications").insert({
        user_id: authData.user.id,
        specialties: [...specialties.filter((value) => value !== "Other"), ...(specialties.includes("Other") ? ["Other: " + additionalSpecialty.trim()] : [])],
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
      try {
        window.localStorage.removeItem("ravine_creator_draft_" + authData.user.id);
      } catch {}
      setApplicationStatus("pending");
      setReviewerNotes("");
      setDraftReady(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className={styles.statusPage} dir={ar ? "rtl" : "ltr"}><div className={styles.statusCard}><div className={styles.eyebrow}>RAVINE / CREATOR PATHWAY</div><LoaderCircle className={styles.spinner} size={25} /><h1>{ar ? "نجهز مسار المبدع..." : "Preparing your creator pathway..."}</h1></div></section>;
  }

  if (alreadyCreator || applicationStatus === "approved") {
    return (
      <section className={styles.statusPage} dir={ar ? "rtl" : "ltr"}>
        <div className={styles.statusCard}>
          <div className={styles.statusIcon}><CheckCircle2 size={27} /></div>
          <div className={styles.eyebrow}>RAVINE / CREATOR ACCESS</div>
          <h1>{ar ? "مسارك كمبدع بدأ." : "Your creator journey is underway."}</h1>
          <p>{ar ? "حالة حسابك تسمح بالانتقال إلى مساحة المبدع. ستجد هناك إدارة هويتك وأعمالك." : "Your account is approved for creator access. Continue to your creator workspace to manage your identity and work."}</p>
          <Link className={styles.primaryAction} href={"/" + locale + "/studio"}>{ar ? "فتح استوديو المبدع" : "Open Creator Studio"} <ArrowUpRight size={16} /></Link>
          <Link className={styles.secondaryAction} href={"/" + locale + "/creator"}>{ar ? "مسار المبدع" : "Creator pathway"}</Link>
        </div>
      </section>
    );
  }

  if (applicationStatus === "pending" || applicationStatus === "reviewing") {
    const reviewing = applicationStatus === "reviewing";
    return (
      <section className={styles.statusPage} dir={ar ? "rtl" : "ltr"}>
        <div className={styles.statusCard}>
          <div className={styles.statusIcon}><Clock3 size={27} /></div>
          <div className={styles.eyebrow}>RAVINE / APPLICATION STATUS</div>
          <div className={styles.statusBadge}><span className={styles.statusDot} />{reviewing ? (ar ? "قيد المراجعة التفصيلية" : "In review") : (ar ? "تم الاستلام" : "Received")}</div>
          <h1>{reviewing ? (ar ? "طلبك دخل مرحلة المراجعة." : "Your application is being reviewed.") : (ar ? "طلبك وصل. دورنا نراجعه." : "Your application is in the review queue.")}</h1>
          <p>{ar ? "لا تحتاج إلى إرسال طلب آخر. سنراجع نماذج العمل والخبرة والسياق، وليس عدد المتابعين." : "You do not need to submit another application. We review your samples, experience, and context—not follower counts."}</p>
          <div className={styles.statusSteps}>
            <div className={styles.statusStepDone}><Check size={14} /><span>{ar ? "تم إرسال الطلب" : "Submitted"}</span></div>
            <div className={reviewing ? styles.statusStepCurrent : styles.statusStep}><Clock3 size={14} /><span>{ar ? "مراجعة العمل والسياق" : "Work & context review"}</span></div>
            <div className={styles.statusStep}><ShieldCheck size={14} /><span>{ar ? "قرار القبول" : "Decision"}</span></div>
          </div>
          <Link className={styles.primaryAction} href={"/" + locale + "/creator"}>{ar ? "العودة إلى مسار المبدع" : "Return to creator pathway"} <ArrowUpRight size={16} /></Link>
        </div>
      </section>
    );
  }

  const activeStep = stepDetails[step];
  const completedPercent = ((step + 1) / stepDetails.length) * 100;
  const isRejected = applicationStatus === "rejected";
  const selectedLabels = specialties.map((value) => value === "Other"
    ? (ar ? "مجال آخر: " + additionalSpecialty.trim() : "Other: " + additionalSpecialty.trim())
    : (SPECIALTIES.find((item) => item.value === value)?.[locale] || value));
  const samplesParsed = parseWorkSamples(samples);
  const leftArrow = ar ? <ArrowRight size={15} /> : <ArrowLeft size={15} />;
  const rightArrow = ar ? <ArrowLeft size={15} /> : <ArrowRight size={15} />;

  return (
    <section className={styles.applyPage} dir={ar ? "rtl" : "ltr"}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.applyHero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>RAVINE / CREATOR PATHWAY</div>
          <div className={styles.heroStamp}><Sparkles size={14} />{ar ? "هويتك تستحق أكثر من رقم" : "Your identity is more than a number"}</div>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
          <div className={styles.heroPrinciples}>
            <span><CheckCircle2 size={14} />{ar ? "مراجعة بشرية" : "Human review"}</span>
            <span><Film size={14} />{ar ? "العمل أولًا" : "Work first"}</span>
            <span><ShieldCheck size={14} />{ar ? "حقوق وسياق واضحان" : "Clear rights & context"}</span>
          </div>
        </div>
        <aside className={styles.heroCard}>
          <div className={styles.heroCardTop}><span>CREATOR / 01</span><Video size={18} /></div>
          <div className={styles.heroCardMark}>R</div>
          <div className={styles.heroCardTitle}>{ar ? "مساحة تُبنى على ما تصنعه." : "A space built around what you make."}</div>
          <div className={styles.heroCardText}>{ar ? "هوية إبداعية، أعمال موثقة، ومسار مفهوم للمراجعة والنمو." : "A creative identity, credited work, and a clear path to review and growth."}</div>
          <div className={styles.heroCardFooter}><span>{ar ? "01 — 04" : "01 — 04"}</span><span>{ar ? "مسار التقديم" : "APPLICATION PATH"}</span></div>
        </aside>
      </header>

      {isRejected ? (
        <div className={styles.rejectedNotice} role="status">
          <div><strong>{ar ? "طلبك السابق لم يُقبل هذه المرة." : "Your previous application was not approved this time."}</strong><p>{reviewerNotes || (ar ? "يمكنك مراجعة المعلومات وتحسين نماذج العمل ثم إرسال طلب جديد." : "You can review your information, improve your work samples, and submit a new application.")}</p></div>
          <span>{ar ? "إعادة التقديم متاحة" : "Resubmission available"}</span>
        </div>
      ) : applicationStatus === "withdrawn" ? (
        <div className={styles.notice} role="status">{ar ? "تم سحب الطلب السابق. يمكنك تحديث التفاصيل والتقديم من جديد." : "Your previous application was withdrawn. Update your details and apply again."}</div>
      ) : null}

      <div className={styles.workflow}>
        <aside className={styles.rail}>
          <div className={styles.railHeading}><span>{ar ? "رحلتك" : "YOUR JOURNEY"}</span><strong>{String(step + 1).padStart(2, "0")} / 04</strong></div>
          <div className={styles.railSteps}>
            {stepDetails.map((item, index) => (
              <button type="button" key={item.key} onClick={() => { if (index <= step) { setMessage(""); setStep(index); } }} className={styles.railStep + (step === index ? " " + styles.railStepActive : "") + (index < step ? " " + styles.railStepDone : "")} aria-current={step === index ? "step" : undefined}>
                <span className={styles.stepNumber}>{index < step ? <Check size={14} /> : item.number}</span>
                <span className={styles.railStepCopy}><strong>{item.label}</strong><small>{item.hint}</small></span>
                {step === index ? <span className={styles.stepCurrent} /> : null}
              </button>
            ))}
          </div>
          <div className={styles.railNote}>
            <div className={styles.railNoteIcon}><ShieldCheck size={17} /></div>
            <strong>{ar ? "لا توجد معادلة للقبول" : "No popularity formula"}</strong>
            <p>{ar ? "عدد المشاهدات والمتابعين لا يقرر القبول. وضوح مساهمتك وجودة العمل أهم." : "Views and followers do not decide admission. The quality of work and clarity of your contribution matter more."}</p>
          </div>
          <div className={styles.draftStatus}><span className={styles.draftDot} /><span>{draftSaved ? (ar ? "المسودة محفوظة على هذا الجهاز" : "Draft saved on this device") : (ar ? "الحفظ المحلي جاهز" : "Local draft ready")}</span></div>
        </aside>

        <main className={styles.formCard}>
          <div className={styles.formTop}>
            <div><div className={styles.formEyebrow}>{ar ? "المرحلة" : "STEP"} {step + 1} <span>/ 4</span></div><h2>{activeStep.label}</h2><p>{activeStep.hint}</p></div>
            <div className={styles.stepGlyph}>{step === 0 ? <UserRound size={22} /> : step === 1 ? <Sparkles size={22} /> : step === 2 ? <FileText size={22} /> : <ShieldCheck size={22} />}</div>
          </div>
          <div className={styles.progressTrack} aria-label={ar ? "تقدم النموذج" : "Form progress"}><span style={{ width: completedPercent + "%" }} /></div>

          {message ? <div className={styles.formMessage} role="alert">{message}</div> : null}

          <form onSubmit={submit} noValidate>
            {step === 0 ? (
              <div className={styles.stepBody}>
                <div className={styles.fieldGroup}>
                  <div className={styles.fieldHeading}><label>{copy.specialties}</label><small>{ar ? "اختر كل المجالات التي تصف عملك. القائمة منظّمة في مجموعات ويمكنك البحث بالاسم." : "Choose every discipline that describes your work. Browse grouped categories or search by name."}</small></div>
                  <div className={styles.specialtyCatalog}>
                    <div className={styles.specialtyCatalogToolbar}>
                      <input className={styles.specialtySearch} type="search" value={specialtyQuery} onChange={(event) => setSpecialtyQuery(event.target.value)} placeholder={ar ? "ابحث عن مجال: ألعاب، تعليم، سفر، تقنية..." : "Search fields: gaming, education, travel, tech..."} aria-label={ar ? "البحث في المجالات الإبداعية" : "Search creative disciplines"} />
                      <span className={styles.selectedCount}>{ar ? "اختير " + specialties.length + " مجال" : specialties.length + " selected"}</span>
                    </div>
                    <div className={styles.specialtyGroups}>
                      {filteredSpecialtyGroups.map((group) => (
                        <section className={styles.specialtyGroup} key={group.id}>
                          <div className={styles.specialtyGroupHeading}><strong>{group.title[locale]}</strong><span>{group.items.length}</span></div>
                          <div className={styles.specialtyGrid}>
                            {group.items.map((item) => {
                              const selected = specialties.includes(item.value);
                              return <button type="button" key={item.value} className={styles.specialtyChip + (selected ? " " + styles.specialtySelected : "")} aria-pressed={selected} onClick={() => toggleSpecialty(item.value)}><span className={styles.chipCheck}>{selected ? <Check size={12} /> : null}</span><span>{item[locale]}</span></button>;
                            })}
                          </div>
                        </section>
                      ))}
                      {filteredSpecialtyGroups.length === 0 ? <div className={styles.specialtyEmpty}>{ar ? "لا توجد نتيجة مطابقة. جرّب كلمة أخرى أو اختر «مجالي غير موجود»." : "No matching fields. Try another search or choose “My field is not listed”."}</div> : null}
                    </div>
                    {specialties.includes("Other") ? <label className={styles.field}><span>{ar ? "اكتب مجالك الإبداعي" : "Describe your creative field"}<b>*</b></span><small>{ar ? "اكتب تخصصًا محددًا حتى لو كان خارج القوائم المعتادة." : "Name your specific niche, even if it does not fit standard categories."}</small><input value={additionalSpecialty} onChange={(event) => setAdditionalSpecialty(event.target.value)} maxLength={100} required placeholder={ar ? "مثال: ترميم الأفلام القديمة أو تصميم العرائس..." : "e.g. film restoration, puppetry design..."} /></label> : null}
                  </div>
                </div>
                <label className={styles.field}>
                  <span>{copy.bio}<b>*</b></span>
                  <small>{ar ? "ركّز على تخصصك ونظرتك وما تقدمه بنفسك، لا على الأوصاف العامة." : "Focus on your discipline, point of view, and personal contribution—not generic labels."}</small>
                  <textarea value={bio} onChange={(event) => setBio(event.target.value)} minLength={20} maxLength={2000} rows={5} placeholder={ar ? "أنا أعمل في... أهتم بـ... وأكثر ما يميز عملي..." : "I work in... I care about... My work is shaped by..."} required />
                  <em>{bio.trim().length} / 2000</em>
                </label>
              </div>
            ) : null}

            {step === 1 ? (
              <div className={styles.stepBody}>
                <label className={styles.field}>
                  <span>{copy.experience}<b>*</b></span>
                  <small>{ar ? "اشرح تجاربك أو مشاريعك أو كيف تطورت مهارتك. الخبرة ليست مرتبطة بسنوات محددة." : "Describe projects, practice, or how your skills developed. Experience is not limited to a fixed number of years."}</small>
                  <textarea value={experience} onChange={(event) => setExperience(event.target.value)} minLength={10} maxLength={2000} rows={6} placeholder={ar ? "مشاريع عملت عليها، دورك فيها، وما تعلمته..." : "Projects you worked on, your role, and what you learned..."} required />
                  <em>{experience.trim().length} / 2000</em>
                </label>
                <label className={styles.field}>
                  <span>{copy.tools}<b>*</b></span>
                  <small>{ar ? "افصل بين الأدوات بفاصلة. أضف البرامج أو المعدات أو التخصصات التقنية." : "Separate tools with commas. Include software, equipment, or technical methods."}</small>
                  <input value={tools} onChange={(event) => setTools(event.target.value)} maxLength={500} placeholder="DaVinci Resolve, Premiere Pro, After Effects..." required dir="auto" />
                </label>
                <div className={styles.tipStrip}><Sparkles size={16} /><span>{ar ? "لا تحتاج إلى امتلاك معدات غالية أو العمل مع جهة كبيرة؛ المهم توضيح دورك الفعلي في العمل." : "Expensive equipment or a major production company is not required. Make your real contribution clear."}</span></div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.stepBody}>
                <label className={styles.field}>
                  <span>{copy.portfolio}<b>*</b></span>
                  <small>{ar ? "رابط واحد في كل سطر. يمكن أن يكون موقعك أو قناة أعمالك أو ملفًا مهنيًا." : "One URL per line. Use a portfolio site, work channel, or professional profile."}</small>
                  <textarea value={portfolio} onChange={(event) => setPortfolio(event.target.value)} rows={4} maxLength={4000} placeholder={"https://yourportfolio.com\nhttps://vimeo.com/yourwork"} dir="ltr" required />
                  <em>{cleanLines(portfolio).length} / 8 {ar ? "روابط" : "links"}</em>
                </label>
                <label className={styles.field}>
                  <span>{copy.samples}<b>*</b></span>
                  <small>{ar ? "كل سطر بهذا الشكل: عنوان العمل | رابط مباشر. اختر أعمالًا توضّح دورك." : "Each line: Work title | direct URL. Choose samples that show your contribution."}</small>
                  <textarea value={samples} onChange={(event) => setSamples(event.target.value)} rows={5} maxLength={6000} placeholder={"Short Film Edit | https://vimeo.com/...\nColor Grading Reel | https://youtube.com/..."} dir="auto" required />
                  <em>{samplesParsed.length} / 8 {ar ? "نماذج" : "samples"}</em>
                </label>
                <div className={styles.tipStrip}><ExternalLink size={16} /><span>{ar ? "استخدم روابط يمكن لفريق المراجعة فتحها. لا تضع كلمات مرور أو روابط منتهية." : "Use links the review team can open. Avoid expired links or password-only access."}</span></div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className={styles.stepBody}>
                <div className={styles.reviewSummary}>
                  <div className={styles.summaryHead}><div><span>{ar ? "ملخص طلبك" : "APPLICATION SUMMARY"}</span><strong>{ar ? "راجع المعلومات قبل الإرسال" : "Review before submitting"}</strong></div><button type="button" onClick={() => { setMessage(""); setStep(0); }}>{ar ? "تعديل" : "Edit"} <ArrowUpRight size={13} /></button></div>
                  <div className={styles.summaryRow}><span>{ar ? "مجالاتك" : "Disciplines"}</span><div className={styles.summaryTags}>{selectedLabels.map((label) => <span key={label}>{label}</span>)}</div></div>
                  <div className={styles.summaryRow}><span>{ar ? "نبذتك" : "Your bio"}</span><p>{bio.trim()}</p></div>
                  <div className={styles.summaryRow}><span>{ar ? "الخبرة والأدوات" : "Practice & tools"}</span><p>{experience.trim()}<br /><small>{tools.trim()}</small></p></div>
                  <div className={styles.summaryRow}><span>{ar ? "الأعمال" : "Work evidence"}</span><p>{cleanLines(portfolio).length} {ar ? "روابط بورتفوليو" : "portfolio links"} · {samplesParsed.length} {ar ? "نماذج" : "samples"}</p></div>
                </div>

                <fieldset className={styles.agreements}>
                  <legend>{copy.agreements}<b>*</b></legend>
                  <p>{ar ? "إرسال الطلب يعني أن المعلومات التي قدمتها دقيقة وأنك تقبل مسؤولياتك تجاه الأعمال والمشاركين." : "Submitting confirms your information is accurate and that you accept your responsibilities to the work and its contributors."}</p>
                  <label><input type="checkbox" checked={originality} onChange={(event) => setOriginality(event.target.checked)} /><span>{ar ? "أقر بأن الأعمال أو المساهمات التي أقدمها حقيقية، وسأوضح دوري فيها." : "I confirm that the work or contributions I submit are genuine and that I will describe my role accurately."}</span></label>
                  <label><input type="checkbox" checked={copyright} onChange={(event) => setCopyright(event.target.checked)} /><span>{ar ? "أحترم حقوق الملكية الفكرية ولا أقدم مواد لا أملك حق مشاركتها." : "I respect intellectual property and will not submit material I have no right to share."}</span></label>
                  <label><input type="checkbox" checked={standards} onChange={(event) => setStandards(event.target.checked)} /><span>{ar ? "ألتزم بمعايير المجتمع والإرشادات التحريرية الخاصة بـRAVINE." : "I agree to RAVINE’s community standards and editorial guidelines."}</span></label>
                  <label><input type="checkbox" checked={noSpam} onChange={(event) => setNoSpam(event.target.checked)} /><span>{ar ? "لن أستخدم المنصة للتضليل أو الإزعاج أو الترويج المضلل." : "I will not use the platform for deception, spam, or misleading promotion."}</span></label>
                  <label><input type="checkbox" checked={credits} onChange={(event) => setCredits(event.target.checked)} /><span>{ar ? "سأحفظ حقوق المشاركين وأذكر المساهمين بوضوح حيث يلزم." : "I will preserve contributors’ rights and provide clear credits where appropriate."}</span></label>
                </fieldset>

                <div className={styles.finalNote}><Clock3 size={16} /><span>{ar ? "بعد الإرسال ستتمكن من متابعة حالة الطلب. لا حاجة لإرساله مرة أخرى أثناء المراجعة." : "After submitting, you can track the application status. Do not resubmit while it is under review."}</span></div>
              </div>
            ) : null}

            <div className={styles.formFooter}>
              <button type="button" className={styles.backButton} onClick={() => { setMessage(""); setStep((current) => Math.max(0, current - 1)); }} disabled={step === 0}>{leftArrow}{copy.back}</button>
              {step < stepDetails.length - 1 ? (
                <button type="button" className={styles.primaryAction} onClick={continueStep}>{copy.continue}{rightArrow}</button>
              ) : (
                <button type="submit" className={styles.primaryAction} disabled={saving}>{saving ? <LoaderCircle className={styles.inlineSpinner} size={16} /> : <CheckCircle2 size={16} />}{saving ? (ar ? "جارٍ الإرسال..." : "Submitting...") : copy.submit}</button>
              )}
            </div>
          </form>
        </main>
      </div>
    </section>
  );
}
