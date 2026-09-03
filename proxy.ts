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

  if (!routing.locales.includes(locale as "ar" | "en")) {
    return false;
  }

  const appPath = `/${segments.slice(1).join("/")}` || "/";

  return protectedRoutes.some(
    (route) => appPath === route || appPath.startsWith(`${route}/`)
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export default async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  // Public routes do not need a Supabase server client. Keeping auth work out of
  // the public request path prevents a missing/invalid runtime Supabase variable
  // from taking down the entire site before the page can render.
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return response;
  }

  const locale = routing.locales.includes(
    request.nextUrl.pathname.split("/")[1] as "ar" | "en"
  )
    ? request.nextUrl.pathname.split("/")[1]
    : routing.defaultLocale;

  const loginUrl = new URL(`/${locale}/auth`, request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  const redirectResponse = NextResponse.redirect(loginUrl);
  copyCookies(response, redirectResponse);
  return redirectResponse;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
