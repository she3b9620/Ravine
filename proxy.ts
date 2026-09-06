import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { supabasePublishableKey, supabaseUrl } from "./lib/supabase/config";

const intlMiddleware = createMiddleware(routing);

// Authenticated routes: these contain personal data, account state, or gated
// platform areas and must never be reachable by guests.
const protectedRoutes = [
  "/account",
  "/dashboard",
  "/history",
  "/library",
  "/notifications",
  "/settings",
  "/creator",
  "/studio",
  "/onboarding",
  "/security",
];

function isProtectedPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0];
  if (!routing.locales.includes(locale as "ar" | "en")) return false;
  const appPath = `/${segments.slice(1).join("/")}` || "/";
  return protectedRoutes.some((route) => appPath === route || appPath.startsWith(`${route}/`));
}

export default async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  if (!isProtectedPath(request.nextUrl.pathname)) return response;

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  if (!error && data?.claims) return response;

  const candidate = request.nextUrl.pathname.split("/")[1];
  const locale = routing.locales.includes(candidate as "ar" | "en") ? candidate : routing.defaultLocale;
  const loginUrl = new URL(`/${locale}/auth`, request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
