import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

function getSafeDestination(locale: string, next: string | null) {
  const fallback = `/${locale}`;

  if (!next || next.startsWith("//")) return fallback;
  if (!next.startsWith(`/${locale}`)) return fallback;

  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const localeCandidate = url.pathname.split("/")[1];
  const locale = routing.locales.includes(
    localeCandidate as (typeof routing.locales)[number]
  )
    ? localeCandidate
    : routing.defaultLocale;
  const next = url.searchParams.get("next");

  const destination = new URL(getSafeDestination(locale, next), request.url);

  if (code) {
    destination.searchParams.set("code", code);
  }

  destination.searchParams.set("ravine_auth", "oauth_return");
  destination.searchParams.set("t", Date.now().toString());

  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
