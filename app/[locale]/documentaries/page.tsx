import RAVINEMediaCatalog from "@/components/RAVINEMediaCatalog";

export const dynamic = "force-dynamic";

export default async function DocumentariesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  return <RAVINEMediaCatalog locale={rawLocale === "en" ? "en" : "ar"} contentType="documentary" />;
}
