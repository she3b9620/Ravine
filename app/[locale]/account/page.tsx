import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountSettings from "@/components/AccountSettings";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type Profile = {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  country: string | null;
  is_verified: boolean | null;
  is_creator: boolean | null;
  language: string | null;
  website_url: string | null;
};

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/account`);

  const [{ data: profileData }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("display_name,username,bio,avatar_url,country,is_verified,is_creator,language,website_url").eq("id", auth.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
  ]);

  const profile = profileData as Profile | null;
  const roles = (roleRows ?? []).map((row) => row.role).filter(Boolean);

  return (
    <section className="section account-page">
      <div className="eyebrow">RAVINE / ACCOUNT</div>
      <div className="section-head">
        <div>
          <h1>{profile?.display_name || auth.user.email || (ar ? "حسابك" : "Your account")}</h1>
          <p className="section-note">{profile?.username ? `@${profile.username}` : (ar ? "أكمل هويتك داخل RAVINE." : "Complete your identity inside RAVINE.")}</p>
        </div>
        <Link className="button secondary" href={`/${locale}/studio`}>{ar ? "Studio" : "Studio"}</Link>
      </div>

      <div className="work-grid">
        <article className="work"><div className="work-art"/>
          <div className="work-body"><div className="work-kicker">STATUS</div><h3>{profile?.is_creator ? (ar ? "مبدع" : "Creator") : (ar ? "مشاهد" : "Viewer")}</h3><p>{profile?.is_verified ? (ar ? "حساب موثق" : "Verified") : (ar ? "الحساب غير موثق" : "Not verified")}</p></div>
        </article>
        <article className="work"><div className="work-art"/>
          <div className="work-body"><div className="work-kicker">LANGUAGE</div><h3>{profile?.language === "en" ? "English" : "العربية"}</h3><p>{profile?.country || (ar ? "البلد غير محدد" : "Country not set")}</p></div>
        </article>
        <article className="work"><div className="work-art"/>
          <div className="work-body"><div className="work-kicker">ROLES</div><h3>{roles.length ? roles.join(" · ") : "user"}</h3><p>{ar ? "صلاحيات الحساب الحالية." : "Current account roles."}</p></div>
        </article>
      </div>

      <AccountSettings profile={profile} locale={locale} />
    </section>
  );
}
