import { notFound } from "next/navigation";
import Link from "next/link";
import RAVINEUniverseHub from "@/components/RAVINEUniverseHub";
import { RAVINE_PLATFORM_MODULES } from "@/lib/ravine-platform";

export default async function UniversePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  return <RAVINEUniverseHub locale={locale} />;
}
