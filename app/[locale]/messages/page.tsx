import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DirectMessages from "@/components/DirectMessages";
import "./messages.css";
import "./messages-final-theme-fix.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type SearchParams = { to?: string; creator?: string };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const recipient = typeof query.to === "string" && UUID_PATTERN.test(query.to) ? query.to : "";
  const creatorCandidate = Number(query.creator);
  const creatorId = recipient && Number.isSafeInteger(creatorCandidate) && creatorCandidate > 0
    ? creatorCandidate
    : undefined;

  const destinationParams = new URLSearchParams();
  if (recipient) destinationParams.set("to", recipient);
  if (creatorId) destinationParams.set("creator", String(creatorId));
  const destination = "/" + locale + "/messages" +
    (destinationParams.size ? "?" + destinationParams.toString() : "");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect("/" + locale + "/auth?next=" + encodeURIComponent(destination));
  }

  return (
    <DirectMessages
      locale={locale}
      initialRecipient={recipient || undefined}
      initialCreatorId={creatorId}
    />
  );
}
