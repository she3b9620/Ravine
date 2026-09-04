import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function safeNext(value: string | null, locale: "ar" | "en") {
  const fallback = `/${locale}`;
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /:\/\//.test(value)) return fallback;
  return value;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const locale = request.nextUrl.pathname.split("/")[1] === "en" ? "en" : "ar";
  const next = safeNext(request.nextUrl.searchParams.get("next"), locale);
  const origin = request.nextUrl.origin;

  if (!code) return NextResponse.redirect(new URL(`/${locale}/auth`, origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/${locale}/auth?error=${encodeURIComponent(error.message)}`, origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
