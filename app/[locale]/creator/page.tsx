import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BadgeCheck, CheckCircle2, Clock3, FileText, Film, ShieldCheck, Sparkles, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import styles from "./creator-flow.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type Application = { status: string; reviewer_notes: string | null; created_at: string | null; reviewed_at: string | null };

export default async function CreatorPathwayPage({ params }: { params: Promise<{ locale: string }> }) {
  const rawLocale = (await params).locale;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/" + locale + "/auth?next=/" + locale + "/creator");

  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase.from("profiles").select("is_creator").eq("id", auth.user.id).maybeSingle(),
    supabase.from("creator_applications").select("status,reviewer_notes,created_at,reviewed_at")
      .eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]) as [{ data: { is_creator: boolean | null } | null }, { data: Application | null }];

  if (profile?.is_creator) redirect("/" + locale + "/studio");

  const status = application?.status || null;
  const activeReview = status === "pending" || status === "reviewing";
  const rejected = status === "rejected";
  const approved = status === "approved";
  const withdrawn = status === "withdrawn";
  const actionLabel = activeReview
    ? (ar ? "عرض حالة الطلب" : "View application status")
    : rejected
      ? (ar ? "تحسين الطلب وإعادة التقديم" : "Improve and resubmit")
      : approved
        ? (ar ? "فتح استوديو المبدع" : "Open Creator Studio")
        : (ar ? "ابدأ طلب المبدع" : "Start creator application");
  const actionHref = approved ? "/" + locale + "/studio" : "/" + locale + "/creator/apply";
  const statusLabel = activeReview
    ? (status === "reviewing" ? (ar ? "قيد المراجعة التفصيلية" : "In review") : (ar ? "بانتظار المراجعة" : "Awaiting review"))
    : rejected
      ? (ar ? "يتطلب تحسينًا" : "Changes encouraged")
      : approved
        ? (ar ? "تمت الموافقة" : "Approved")
        : withdrawn
          ? (ar ? "تم سحب الطلب" : "Withdrawn")
          : (ar ? "لم يُرسل طلب بعد" : "No application yet");

  const guides = [
    { number: "01", icon: Target, title: ar ? "قدّم هويتك" : "Define your identity", body: ar ? "اختر مجالاتك واشرح رؤيتك ومساهمتك في العمل." : "Choose your disciplines and explain your point of view and contribution." },
    { number: "02", icon: Film, title: ar ? "أثبت عملك" : "Show the work", body: ar ? "أرفق روابط مباشرة ونماذج توضّح مستواك الحقيقي." : "Add direct links and samples that demonstrate your actual work." },
    { number: "03", icon: ShieldCheck, title: ar ? "وضّح السياق والحقوق" : "Clarify context & rights", body: ar ? "نحتاج إلى فهم دورك واحترام حقوق جميع المشاركين." : "We need to understand your role and respect everyone’s rights." },
    { number: "04", icon: BadgeCheck, title: ar ? "ابدأ مسار المبدع" : "Enter the creator pathway", body: ar ? "بعد القبول، تُفعّل مساحة إدارة هويتك وأعمالك." : "After approval, your creator workspace becomes available." },
  ];

  return (
    <section className={styles.hubPage} dir={ar ? "rtl" : "ltr"}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.hubHero}>
        <div className={styles.hubCopy}>
          <div className={styles.eyebrow}>RAVINE / CREATOR PATHWAY</div>
          <div className={styles.heroStamp}><Sparkles size={14} />{ar ? "من المشاهدة إلى المساهمة" : "From watching to contributing"}</div>
          <h1>{ar ? "خلّي شغلك يتكلم عنك." : "Let your work speak for you."}</h1>
          <p>{ar ? "مسار واضح لتحويل حسابك إلى هوية مبدع داخل رَافِين: أعمال يمكن فهمها، مساهمات واضحة، وملف مبني على الجودة والسياق." : "A clear path to become a RAVINE creator: work people can understand, contributions that are clearly credited, and an identity built on quality and context."}</p>
          <div className={styles.hubMeta}>
            <span><CheckCircle2 size={14} />{ar ? "المتابعون ليسوا معيار القبول" : "Followers are not the admission criteria"}</span>
            <span><Clock3 size={14} />{ar ? "المراجعة يدوية" : "Human review"}</span>
          </div>
        </div>
        <aside className={styles.hubStatusCard}>
          <div className={styles.hubStatusHeader}><span>{ar ? "حالة مسارك" : "YOUR PATHWAY"}</span><span className={styles.hubStatusOrb} /></div>
          <div className={styles.hubStatusName}>{statusLabel}</div>
          <p>{activeReview
            ? (ar ? "استلمنا طلبك. لا تحتاج إلى تقديمه مرة أخرى أثناء المراجعة." : "Your application has been received. There is no need to submit another while it is being reviewed.")
            : rejected
              ? (ar ? "يمكنك تعديل المعلومات وتقوية نماذج العمل قبل إرسال طلب جديد." : "You can improve your details and work samples before sending a new application.")
              : approved
                ? (ar ? "طلبك معتمد. انتقل إلى مساحة المبدع لبدء إدارة أعمالك." : "Your application is approved. Continue to your creator workspace.")
                : withdrawn
                  ? (ar ? "يمكنك بدء طلب جديد متى أصبحت جاهزًا." : "You can begin a new application when you are ready.")
                  : (ar ? "ابدأ بتعريف تخصصك، ثم أضف نماذج أعمال وروابط يمكن مراجعتها." : "Start by defining your discipline, then add work samples and links that can be reviewed.")}</p>
          {rejected && application?.reviewer_notes ? <div className={styles.reviewerNote}><strong>{ar ? "ملاحظات المراجعة" : "Review notes"}</strong><span>{application.reviewer_notes}</span></div> : null}
          <Link className={styles.primaryAction} href={actionHref}>{actionLabel} <ArrowUpRight size={16} /></Link>
          <Link className={styles.secondaryAction} href={"/" + locale + "/account"}>{ar ? "العودة إلى حسابك" : "Back to your account"}</Link>
        </aside>
      </header>

      <section className={styles.hubIntro}>
        <div><div className={styles.eyebrow}>{ar ? "رَافِين / كيف يعمل المسار" : "RAVINE / HOW IT WORKS"}</div><h2>{ar ? "أربع خطوات. صورة واضحة عنك." : "Four steps. A clearer picture of you."}</h2><p>{ar ? "لن نطلب منك أن تكون مشهورًا. نطلب منك أن توضح ما تصنعه وكيف تصنعه." : "You do not need to be famous. You need to show what you make and how you make it."}</p></div>
        <div className={styles.hubIntroMark}>R<span>/</span>V</div>
      </section>

      <div className={styles.guideGrid}>
        {guides.map(({ number, icon: Icon, title, body }) => (
          <article className={styles.guideCard} key={number}>
            <div className={styles.guideCardTop}><span>{number}</span><Icon size={18} /></div>
            <h3>{title}</h3><p>{body}</p>
          </article>
        ))}
      </div>

      <section className={styles.reviewPrinciple}>
        <div className={styles.reviewPrincipleIcon}><ShieldCheck size={20} /></div>
        <div><strong>{ar ? "مراجعة تحترم العمل وسياقه" : "Review that respects the work and its context"}</strong><p>{ar ? "المراجعة تنظر إلى أصالة العمل، وضوح دورك، حقوق المشاركين، وجودة العرض. لا يوجد ضمان بالقبول، ولا يُشترط أن تكون لديك أرقام جماهيرية كبيرة." : "Review considers originality, the clarity of your role, contributor rights, and presentation quality. Approval is not guaranteed, and a large audience is not required."}</p></div>
        <Link className={styles.textAction} href={actionHref}>{ar ? "انتقل إلى خطوتك التالية" : "Continue to your next step"} <ArrowUpRight size={15} /></Link>
      </section>
    </section>
  );
}
