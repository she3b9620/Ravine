import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const filters = await searchParams;
  const locale = rawLocale === "en" ? "en" : "ar";
  const paramsOut = new URLSearchParams();
  const query = typeof filters.q === "string" ? filters.q.trim().slice(0, 120) : "";

  if (query) paramsOut.set("q", query);
  const suffix = paramsOut.size ? "?" + paramsOut.toString() : "";

  redirect("/" + locale + "/discover" + suffix);
}
