import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountSettings from "@/components/AccountSettings";
import styles from "../account.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type Profile = {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  website_url: string | null;
  country: string | null;
  language: string | null;
  is_creator: boolean | null;
  trailer_url: string | null;
};

export default async function EditAccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/account/edit`);

  const { data } = await supabase
    .from("profiles")
    .select("display_name,username,bio,avatar_url,cover_url,country,language,website_url,is_creator,trailer_url")
    .eq("id", auth.user.id)
    .maybeSingle();

  return (
    <section className={`section ${styles.page}`} dir={ar ? "rtl" : "ltr"}>
      <div className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>RAVINE / {ar ? "تعديل الملف" : "EDIT PROFILE"}</div>
          <h1 className={styles.heroTitle}>{ar ? "عدّل حضورك." : "Edit your presence."}</h1>
          <p className={styles.heroNote}>{ar ? "الهوية والنبذة والصور التي تظهر في ملفك العام." : "Your identity, bio, and media shown across your public profile."}</p>
        </div>
      </div>
      <AccountSettings profile={data as Profile | null} locale={locale} />
    </section>
  );
}
