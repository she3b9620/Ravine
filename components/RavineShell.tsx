import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "./ThemeToggle";
import AuthModal from "./AuthModal";

const navigation = [
  ["discover", "Discover", "اكتشف"],
  ["cuts", "Cuts", "كِتس"],
  ["videos", "Videos", "الفيديو"],
  ["podcasts", "Podcasts", "البودكاست"],
  ["live", "Live", "مباشر"],
  ["creators", "Creators", "المبدعون"],
] as const;

type Locale = "ar" | "en";

export default async function RavineShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const isArabic = locale === "ar";
  const alternateLocale: Locale = isArabic ? "en" : "ar";

  let user = null;
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }
  }

  return (
    <div className="ravine-shell" dir={isArabic ? "rtl" : "ltr"}>
      <header className="ravine-header">
        <div className="ravine-header-inner">
          <Link href={`/${locale}`} className="ravine-brand" aria-label="RAVINE">
            RAVINE<span>.</span>
          </Link>

          <nav className="ravine-nav" aria-label={isArabic ? "التنقل الرئيسي" : "Primary navigation"}>
            {navigation.map(([slug, en, ar]) => (
              <Link key={slug} href={`/${locale}/${slug}`} className="ravine-nav-link">
                {isArabic ? ar : en}
              </Link>
            ))}
          </nav>

          <div className="ravine-header-actions">
            <Link href={`/${locale}/search`} className="ravine-minor-link">
              {isArabic ? "بحث" : "Search"}
            </Link>
            {user ? (
              <>
                <Link href={`/${locale}/library`} className="ravine-minor-link">
                  {isArabic ? "المكتبة" : "Library"}
                </Link>
                <Link href={`/${locale}/account`} className="ravine-minor-link">
                  {isArabic ? "الحساب" : "Account"}
                </Link>
              </>
            ) : (
              <button
                type="button"
                className="ravine-minor-link ravine-auth-trigger"
                onClick={() => window.dispatchEvent(new CustomEvent("ravine:open-auth", { detail: { next: `/${locale}` } }))}
              >
                {isArabic ? "دخول" : "Sign in"}
              </button>
            )}
            <ThemeToggle locale={locale} />
            <Link href={`/${alternateLocale}`} className="ravine-language">
              {isArabic ? "EN" : "عربي"}
            </Link>
          </div>
        </div>
      </header>

      <main className="ravine-main">{children}</main>

      <footer className="ravine-footer">
        <div>
          <div className="ravine-footer-brand">RAVINE<span>.</span></div>
          <p>{isArabic ? "منصة إبداعية سينمائية تُقدّر العمل وسياقه ومن يقف خلفه." : "A cinematic creative platform that values the work, its context, and the people behind it."}</p>
        </div>
        <div className="ravine-footer-meta">
          <span>{isArabic ? "لا شيء زخرفي بلا معنى" : "Nothing Decorative Without Meaning"}</span>
          <span>© {new Date().getFullYear()} RAVINE</span>
        </div>
      </footer>
      <AuthModal locale={locale} />
    </div>
  );
}
