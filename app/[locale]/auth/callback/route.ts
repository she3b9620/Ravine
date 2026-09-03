import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const destination = new URL(getSafeDestination(locale, next), request.url);
      destination.searchParams.set("ravine_auth", "fresh");
      destination.searchParams.set("t", Date.now().toString());
      const response = NextResponse.redirect(destination);
      response.headers.set("Cache-Control", "no-store, max-age=0");
      return response;
    }
  }

  const errorUrl = new URL(`/${locale}/auth`, request.url);
  errorUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(errorUrl, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
