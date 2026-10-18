import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeroMediaManager from "@/components/HeroMediaManager";
import styles from "./hero-media.module.css";

export const dynamic = "force-dynamic";

export default async function HeroMediaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/" + locale + "/auth?next=/" + locale + "/hero-media");
  }

  const { data: admin, error } = await supabase.rpc("is_ravine_admin");
  if (error || admin !== true) notFound();

  return (
    <section className={styles.page} dir={ar ? "rtl" : "ltr"}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>RAVINE / HOME EXPERIENCE</div>
          <h1>{ar ? "إدارة وسائط الهيرو" : "Hero media management"}</h1>
          <p>{ar ? "اختَر بالضبط الفيديوهات والصور التي تظهر للضيف، ورتّبها وتحكّم في ظهورها دون تغيير نشر الأعمال الأصلية." : "Choose the exact videos and still images shown to guests. Reorder or hide them without changing the publication status of the original works."}</p>
        </div>
        <div className={styles.headerMark}>R<span>/</span>V</div>
      </header>
      <HeroMediaManager locale={locale} />
    </section>
  );
}
