import RAVINEMediaCatalog from "@/components/RAVINEMediaCatalog";
import styles from "./podcasts.module.css";

export const dynamic = "force-dynamic";

export default async function PodcastsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";

  return (
    <div className={styles.catalogHost}>
      <RAVINEMediaCatalog locale={locale} contentType="podcast" />
    </div>
  );
}
