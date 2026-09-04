import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const protectedRoutes = [
  "/account",
  "/library",
  "/notifications",
  "/admin",
  "/creator/upload",
  "/creator/video",
  "/creators-hub",
  "/studio",
];

function isProtectedPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0];

  if (!routing.locales.includes(locale as "ar" | "en")) return false;

  const appPath = `/${segments.slice(1).join("/")}` || "/";
  return protectedRoutes.some(
    (route) => appPath === route || appPath.startsWith(`${route}/`)
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const localeCandidate = segments[0];
  const appPath = `/${segments.slice(1).join("/")}` || "/";
  const protectedPath = isProtectedPath(pathname);

  const response = intlMiddleware(request);

  if (
    routing.locales.includes(
      localeCandidate as (typeof routing.locales)[number]
    ) &&
    appPath === "/explore"
  ) {
    const discoverUrl = request.nextUrl.clone();
    discoverUrl.pathname = `/${localeCandidate}/discover`;
    return NextResponse.redirect(discoverUrl, 307);
  }

  if (!protectedPath) return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const locale = routing.locales.includes(
      localeCandidate as (typeof routing.locales)[number]
    )
      ? localeCandidate
      : routing.defaultLocale;

    const loginUrl = new URL(`/${locale}/auth`, request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );

    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set("Cache-Control", "private, no-store, max-age=0");
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value)
        );
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  if (!error && data?.claims) return response;

  const locale = routing.locales.includes(
    localeCandidate as (typeof routing.locales)[number]
  )
    ? localeCandidate
    : routing.defaultLocale;

  const loginUrl = new URL(`/${locale}/auth`, request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  const redirectResponse = NextResponse.redirect(loginUrl);
  redirectResponse.headers.set("Cache-Control", "private, no-store, max-age=0");
  copyCookies(response, redirectResponse);
  return redirectResponse;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
