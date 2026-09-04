import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DirectMessages from "@/components/DirectMessages";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

export default async function MessagesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ to?: string; creator?: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const query = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/messages`);
  const creatorId = query.creator && /^\d+$/.test(query.creator) ? Number(query.creator) : undefined;
  return <DirectMessages locale={locale} initialRecipient={query.to} initialCreatorId={creatorId} />;
}
