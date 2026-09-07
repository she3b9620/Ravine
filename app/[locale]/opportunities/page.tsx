import { RAVINEUniverseSurface } from "@/components/RAVINEUniverseSurface";
export default async function OpportunitiesPage({ params }: { params: Promise<{ locale: string }> }) { const { locale: raw } = await params; const locale = raw === "en" ? "en" : "ar"; return <RAVINEUniverseSurface locale={locale} surface="opportunities" />; }
