import Link from "next/link";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "./ThemeToggle";
import AuthTrigger, { AuthModal } from "./AuthTrigger";
import MobileNav from "./MobileNav";
import LanguageSwitcher from "./LanguageSwitcher";
import SearchLauncher from "./SearchLauncher";
import AccountMenu from "./AccountMenu";
import NotificationBell from "./NotificationBell";
import ChatLauncher from "./ChatLauncher";
import PrimaryNav from "./PrimaryNav";

type Locale = "ar" | "en";
type HeaderCategory = { id: number; name: string; slug: string | null };
type HeaderProfile = { display_name: string | null; username: string | null; avatar_url: string | null; is_creator: boolean | null };

function RavineLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`ravine-lockup${compact ? " compact" : ""}`} aria-hidden="true">
      <img src="/اللوجو.png" alt="" className="ravine-lockup-mark" />
      <img src="/التايبو.png" alt="" className="ravine-lockup-wordmark" />
    </span>
  );
}

export default async function RavineShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const isArabic = locale === "ar";
  let user = null;
  let categories: HeaderCategory[] = [];
  let profile: HeaderProfile | null = null;

  try {
    const supabase = await createClient();
    const [{ data: userData }, { data: categoryData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("categories").select("id,name,slug").order("name", { ascending: true }).limit(40),
    ]);
    user = userData.user;
    categories = (categoryData ?? []) as HeaderCategory[];

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("display_name,username,avatar_url,is_creator")
        .eq("id", user.id)
        .maybeSingle();
      profile = data as HeaderProfile | null;
    }
  } catch {
    user = null;
    categories = [];
    profile = null;
  }

  const displayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || (isArabic ? "مستخدم RAVINE" : "RAVINE user");

  return (
    <div className={`ravine-shell${user ? "" : " guest-shell"}`} lang={locale} dir={isArabic ? "rtl" : "ltr"}>
      <header className="ravine-header">
        <div className="ravine-header-inner">
          <Link href={`/${locale}`} className="ravine-brand ravine-brand-lockup" aria-label="RAVINE">
            <RavineLockup />
          </Link>
          <div className="ravine-header-actions">
            <MobileNav locale={locale} authenticated={Boolean(user)} />
            <SearchLauncher locale={locale} categories={categories} />
            {user ? (
              <>
                <NotificationBell locale={locale} />
                <ChatLauncher locale={locale} />
                <AccountMenu
                  locale={locale}
                  displayName={displayName}
                  username={profile?.username || null}
                  avatarUrl={profile?.avatar_url || null}
                  isCreator={Boolean(profile?.is_creator)}
                />
              </>
            ) : (
              <>
                <AuthTrigger locale={locale} label={isArabic ? "دخول" : "Sign in"} mode="signin" />
                <AuthTrigger locale={locale} label={isArabic ? "أنشئ حسابك" : "Create account"} mode="signup" primary />
              </>
            )}
            <ThemeToggle locale={locale} />
            <Suspense fallback={<span className="ravine-language" aria-hidden="true">{locale === "ar" ? "EN" : "عربي"}</span>}>
              <LanguageSwitcher locale={locale} />
            </Suspense>
          </div>
        </div>
      </header>

      <aside className="ravine-sidebar" aria-label={isArabic ? "القائمة الجانبية الرئيسية" : "Primary sidebar"}>
        <PrimaryNav locale={locale} />
      </aside>

      <main className="ravine-main">{children}</main>
      <footer className="ravine-footer">
        <div>
          <div className="ravine-footer-brand ravine-brand-lockup"><RavineLockup compact /></div>
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
