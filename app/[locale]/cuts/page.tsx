import { redirect } from "next/navigation";

export default async function LegacyCutsRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  redirect(`/${locale}/shorts`);
}
