import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["ar", "en"] as const;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || /\.[^/]+$/.test(pathname)) return NextResponse.next();
  if (pathname === "/") return NextResponse.redirect(new URL("/ar", request.url));
  const hasLocale = locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  if (!hasLocale) return NextResponse.redirect(new URL(`/ar${pathname}`, request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|api|.*\\..*).*)"] };
