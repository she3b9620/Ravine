import RAVINEUniverseHub from "@/components/RAVINEUniverseHub";

export default async function UniversePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  return <RAVINEUniverseHub locale={locale} />;
}
