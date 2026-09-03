import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/i18n/routing";

function getSafeDestination(locale: string, next: string | null) {
  const fallback = `/${locale}`;

  if (!next || next.startsWith("//")) return fallback;
  if (!next.startsWith(`/${locale}`)) return fallback;

  return next;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const localeCandidate = url.pathname.split("/")[1];
  const locale = routing.locales.includes(
    localeCandidate as (typeof routing.locales)[number]
  )
    ? localeCandidate
    : routing.defaultLocale;
  const next = url.searchParams.get("next");
  const destination = new URL(getSafeDestination(locale, next), request.url);

  if (!code) {
    destination.pathname = `/${locale}/auth`;
    destination.search = "";
    destination.searchParams.set("oauth", "missing_code");
    return NextResponse.redirect(destination);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    destination.pathname = `/${locale}/auth`;
    destination.search = "";
    destination.searchParams.set("oauth", "configuration_error");
    return NextResponse.redirect(destination);
  }

  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store, max-age=0");

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorDestination = new URL(`/${locale}/auth`, request.url);
    errorDestination.searchParams.set("oauth", "exchange_failed");
    errorDestination.searchParams.set("next", getSafeDestination(locale, next));
    const errorResponse = NextResponse.redirect(errorDestination);
    errorResponse.headers.set("Cache-Control", "no-store, max-age=0");
    return errorResponse;
  }

  return response;
}
