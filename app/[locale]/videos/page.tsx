import RAVINEMediaCatalog from "@/components/RAVINEMediaCatalog";

export default async function VideosPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  return <RAVINEMediaCatalog locale={rawLocale === "en" ? "en" : "ar"} contentType="video" />;
}
