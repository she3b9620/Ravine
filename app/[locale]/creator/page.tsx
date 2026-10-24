import { redirect } from "next/navigation";

type Locale = "ar" | "en";

export default async function CreatorSpaceAlias({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  redirect(`/${locale}/studio`);
}
