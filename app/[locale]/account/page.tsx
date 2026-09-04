import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/account`);

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("display_name,username,bio,avatar_url,country,is_verified,is_creator,language,website_url").eq("id", auth.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
  ]);

  const roles = (roleRows ?? []).map((row) => row.role).filter(Boolean);

  return (
    <section className="section account-page">
      <div className="eyebrow">RAVINE / ACCOUNT</div>
      <div className="section-head">
        <div>
          <h1>{profile?.display_name || auth.user.email || (ar ? "حسابك" : "Your account")}</h1>
          <p className="section-note">{profile?.username ? `@${profile.username}` : (ar ? "أكمل هويتك داخل RAVINE." : "Complete your identity inside RAVINE.")}</p>
        </div>
        <Link className="button secondary" href={`/${locale}/onboarding`}>{ar ? "تعديل الهوية" : "Edit identity"}</Link>
      </div>

      <div className="work-grid">
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">STATUS</div><h3>{profile?.is_creator ? (ar ? "مبدع" : "Creator") : (ar ? "مشاهد" : "Viewer")}</h3><p>{profile?.is_verified ? (ar ? "حساب موثق" : "Verified") : (ar ? "الحساب غير موثق" : "Not verified")}</p></div></article>
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">LANGUAGE</div><h3>{profile?.language === "en" ? "English" : "العربية"}</h3><p>{profile?.country || (ar ? "البلد غير محدد" : "Country not set")}</p></div></article>
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">ROLES</div><h3>{roles.length ? roles.join(" · ") : "user"}</h3><p>{ar ? "صلاحيات الحساب الحالية." : "Current account roles."}</p></div></article>
      </div>

      <div className="empty-state"><strong>{ar ? "المرحلة التالية: إعدادات الحساب الكاملة." : "Next: full account settings."}</strong><span>{ar ? "الصورة، الغلاف، الموقع، الخصوصية وإدارة الجلسة ستدخل في طبقة الحساب التالية." : "Avatar, cover, website, privacy, and session controls will land in the next account layer."}</span></div>
    </section>
  );
}
