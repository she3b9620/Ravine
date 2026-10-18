import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { supabasePublishableKey, supabaseUrl } from "./lib/supabase/config";

const intlMiddleware = createMiddleware(routing);

const protectedRoutes = ["/account", "/dashboard", "/history", "/library", "/notifications", "/settings", "/creator", "/studio", "/onboarding", "/security"];

function isProtectedPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0];
  if (!routing.locales.includes(locale as "ar" | "en")) return false;
  const appPath = `/${segments.slice(1).join("/")}` || "/";
  return protectedRoutes.some((route) => appPath === route || appPath.startsWith(`${route}/`));
}

function isRetryableAuthError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; status?: number; code?: string; message?: string };
  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  const description = `${candidate.name || ""} ${candidate.code || ""} ${candidate.message || ""}`;
  return /Retryable|Network|Fetch|Timeout/i.test(description) || status === 0 || status === 408 || status === 425 || status === 429 || (typeof status === "number" && status >= 500);
}

function copyResponseCookiesAndCache(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma", "vary"]) {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  }
}

export default async function proxy(request: NextRequest) {
  // Refresh sessions on all matched requests, not only protected pages.
  // Otherwise a session can age while the user browses public pages and look
  // like a logout when they later open their account or creator workspace.
  const response = intlMiddleware(request);
  const protectedPath = isProtectedPath(request.nextUrl.pathname);
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Preserve next-intl rewrite/redirect headers while refreshing auth cookies.
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        headers?.forEach((value, name) => response.headers.set(name, value));
      },
    },
  });

  const authResult = await supabase.auth.getClaims().catch(() => null);
  // A temporary Auth API/network failure must not be converted into sign-out.
  if (!authResult) return response;
  if (!protectedPath) return response;
  if (!authResult.error && authResult.data?.claims) return response;
  if (authResult.error && isRetryableAuthError(authResult.error)) return response;

  const candidate = request.nextUrl.pathname.split("/")[1];
  const locale = routing.locales.includes(candidate as "ar" | "en") ? candidate : routing.defaultLocale;
  const loginUrl = new URL(`/${locale}/auth`, request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const redirectResponse = NextResponse.redirect(loginUrl);
  copyResponseCookiesAndCache(response, redirectResponse);
  return redirectResponse;
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
