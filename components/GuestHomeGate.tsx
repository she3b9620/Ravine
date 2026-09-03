"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { ArrowDown, ArrowUpRight, Camera, Clapperboard, Layers3, Menu, Moon, PenLine, Play, Search, Sparkles, Star, Sun, UserRound, UsersRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "@/components/AuthModal";
import HomeLowerSections from "@/components/HomeLowerSections";

type Props = { children: React.ReactNode };
type Stats = { works: number; creators: number; categories: number };

function isAuthPath(pathname: string, locale: string) {
  return pathname === `/${locale}/auth` || pathname.startsWith(`/${locale}/auth/`);
}

export default function GuestHomeGate({ children }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const authPath = isAuthPath(pathname, locale);
  const [resolved, setResolved] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMfaOpen, setAuthMfaOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [publicGateOpen, setPublicGateOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<Stats>({ works: 0, creators: 0, categories: 0 });

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ravine-theme");
    if (savedTheme === "light") setDark(false);

    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const isSignedIn = Boolean(data.user);
      setAuthenticated(isSignedIn);
      setResolved(true);
      if (isHome && !isSignedIn) {
        const [works, creators, categories] = await Promise.all([
          supabase.from("videos").select("id", { count: "exact", head: true }).eq("published", true),
          supabase.from("creators").select("id", { count: "exact", head: true }),
          supabase.from("categories").select("id", { count: "exact", head: true }),
        ]);
        if (!active) return;
        setStats({ works: works.count ?? 0, creators: creators.count ?? 0, categories: categories.count ?? 0 });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const signedIn = Boolean(session?.user);
      setAuthenticated(signedIn);
      if (signedIn) {
        setAuthOpen(false);
        setPublicGateOpen(false);
        if (isHome && event === "SIGNED_IN") {
          window.location.replace(`/${locale}`);
        }
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [isHome, locale, supabase]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (isHome && event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [isHome]);

  useEffect(() => {
    if (isHome && resolved && authenticated) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ravine_auth") === "fresh") {
        window.history.replaceState({}, document.title, `/${locale}`);
      }
    }
  }, [authenticated, isHome, locale, resolved]);

  useEffect(() => {
    if (!isHome || !resolved || authenticated) {
      document.body.style.overflow = "";
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [authenticated, isHome, resolved]);

  useEffect(() => {
    if (isHome || !resolved || authenticated || authPath) {
      setPublicGateOpen(false);
      return;
    }
    setPublicGateOpen(false);
    const timer = window.setTimeout(() => setPublicGateOpen(true), 1000);
    return () => window.clearTimeout(timer);
  }, [authPath, authenticated, isHome, pathname, resolved]);

  useEffect(() => {
    if (!isHome || !authenticated) return;
    const mfa = new URLSearchParams(window.location.search).get("mfa");
    if (mfa === "1") {
      setAuthMfaOpen(true);
      window.history.replaceState({}, document.title, `/${locale}`);
    }
  }, [authenticated, isHome, locale]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    window.location.href = `/${locale}/search?q=${encodeURIComponent(query)}`;
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("ravine-theme", next ? "dark" : "light");
  }

  function compact(value: number) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K+`;
    return `${value.toLocaleString()}+`;
  }

  if (!isHome) {
    if (!resolved || authenticated || authPath) return <>{children}</>;
    return <><div className={`transition-[filter,transform,opacity] duration-700 ${publicGateOpen ? "pointer-events-none scale-[.985] blur-[6px] opacity-60" : ""}`} aria-hidden={publicGateOpen}>{children}</div><AuthModal open={publicGateOpen} dismissible={false} onClose={() => setPublicGateOpen(false)} /></>;
  }

  if (!resolved) return <div className="fixed inset-0 z-[9990] bg-[#0B0B0B]" aria-hidden="true" />;
  if (authenticated) return <><div>{children}</div><HomeLowerSections /><AuthModal open={authMfaOpen} startInMfa onClose={() => setAuthMfaOpen(false)} /></>;

  const olive = "#5E6845";
  const indigo = "#34305E";
  const background = dark ? "#0B0B0B" : "#F3EEE6";
  const foreground = dark ? "#F7F2E8" : "#161513";
  const muted = dark ? "rgba(247,242,232,.60)" : "rgba(22,21,19,.58)";
  const gold = "#C89A52";
  const line = dark ? "rgba(247,242,232,.12)" : "rgba(22,21,19,.14)";
  const panel = dark ? "rgba(247,242,232,.045)" : "rgba(255,255,255,.64)";
  const navLinks = [
    { label: isArabic ? "الرئيسية" : "Home", href: `/${locale}` },
    { label: isArabic ? "اكتشف" : "Discover", href: `/${locale}/discover` },
    { label: isArabic ? "المبدعون" : "Creators", href: `/${locale}/creators` },
    { label: isArabic ? "الأعمال" : "Works", href: `/${locale}/videos` },
  ];

  const pillars = isArabic
    ? [
        { icon: Clapperboard, title: "سينما أولًا", text: "واجهة مصممة لتمنح العمل مساحة واحترامًا، من أول لقطة حتى آخر تفصيلة." },
        { icon: UserRound, title: "المبدع هو الهوية", text: "ملفك ليس مجرد حساب؛ إنه مساحتك المهنية، أسلوبك، اعتماداتك وما تريد أن يتذكرك الناس به." },
        { icon: Layers3, title: "أكثر من فيديو", text: "أعمال، Shorts، Podcasts، Live، سلاسل ومجتمع يجمع الرحلة الإبداعية كلها في مكان واحد." },
        { icon: UsersRound, title: "مجتمع يفهم الصورة", text: "RAVINE مبنية لصناع الصورة والصوت والحركة، وليس لجمع الأرقام من أجل الأرقام." },
      ]
    : [
        { icon: Clapperboard, title: "Cinema first", text: "An interface that gives the work room to breathe, from the opening frame to the final detail." },
        { icon: UserRound, title: "The creator is the identity", text: "Your profile is a professional home for your voice, credits, style and body of work." },
        { icon: Layers3, title: "More than video", text: "Works, Shorts, Podcasts, Live, series and community—one home for the complete creative journey." },
        { icon: UsersRound, title: "A community that gets the frame", text: "RAVINE is built for people who make images, sound and motion—not just numbers." },
      ];

  return <div dir={isArabic ? "rtl" : "ltr"} className="min-h-[100dvh] overflow-y-auto scroll-smooth" style={{ background, color: foreground }}>
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-[20%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full blur-[130px]" style={{ background: `radial-gradient(circle, ${gold}24 0%, transparent 68%)` }} />
      <div className="absolute -left-24 top-[62%] h-[28rem] w-[28rem] rounded-full blur-[120px]" style={{ background: `${olive}26` }} />
      <div className="absolute -right-24 top-[48%] h-[30rem] w-[30rem] rounded-full blur-[130px]" style={{ background: `${indigo}32` }} />
      <div className="absolute inset-0 opacity-[.035]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.9) .6px, transparent .6px)", backgroundSize: "5px 5px" }} />
    </div>

    <header className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: line, background: dark ? "rgba(11,11,11,.70)" : "rgba(243,238,230,.74)" }}>
      <div className="mx-auto flex h-[76px] max-w-[1500px] items-center gap-3 px-5 md:px-8">
        <button type="button" onClick={() => setMenuOpen((value) => !value)} className="ravine-interactive flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: line, background: panel }} aria-label={isArabic ? "فتح القائمة" : "Open menu"}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 sm:block"><div className="mx-auto flex max-w-md items-center rounded-full border px-4 py-2" style={{ borderColor: line, background: panel }}><Search size={16} style={{ color: muted }} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isArabic ? "ابحث في RAVINE..." : "Search RAVINE..."} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:opacity-60" style={{ color: foreground }} /></div></form>
        <div className="ms-auto flex items-center gap-2"><button type="button" onClick={() => setAuthOpen(true)} className="ravine-interactive rounded-full px-5 py-2.5 text-xs font-black shadow-lg shadow-[#C89A52]/10" style={{ background: gold, color: "#0B0B0B" }}>{isArabic ? "تسجيل الدخول" : "Sign in"}</button><a href={isArabic ? "/en" : "/ar"} className="ravine-interactive hidden rounded-full border px-3 py-2 text-[11px] font-bold sm:block" style={{ borderColor: line, background: panel }}>{isArabic ? "ENGLISH" : "العربية"}</a><button type="button" onClick={toggleTheme} className="ravine-interactive flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: line, background: panel }} aria-label={isArabic ? "تغيير المظهر" : "Toggle theme"}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button></div>
      </div>
      {menuOpen && <div className="mx-auto max-w-[1500px] px-5 pb-4 md:px-8"><nav className="grid max-w-xl gap-2 rounded-3xl border p-3 shadow-2xl" style={{ borderColor: line, background: dark ? "rgba(18,19,19,.96)" : "rgba(248,244,236,.97)" }}>{navLinks.map((item) => <a key={item.href} href={item.href} className="ravine-interactive rounded-2xl px-4 py-3 text-sm font-semibold" style={{ color: foreground }}>{item.label}</a>)}</nav></div>}
    </header>

    <main className="relative z-10">
      <section className="mx-auto flex min-h-[calc(100dvh-76px)] max-w-7xl items-center px-5 py-20 md:px-8 md:py-28">
        <div className="grid w-full items-center gap-14 lg:grid-cols-[1.12fr_.88fr]">
          <div className="text-center lg:text-start animate-[ravine-reveal_1000ms_cubic-bezier(.22,1,.36,1)_both]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[.22em]" style={{ borderColor: `${gold}40`, background: `${gold}0f`, color: gold }}><Sparkles size={14} /> RAVINE / VISUAL CULTURE</div>
            <img src="/RAVINE.png" alt="RAVINE" className={`mx-auto mb-7 h-auto w-[190px] object-contain sm:w-[230px] md:w-[260px] lg:mx-0 ${!dark ? "invert" : ""}`} />
            <h1 className="font-ar text-5xl font-black leading-[.98] tracking-[-.045em] sm:text-7xl md:text-8xl lg:text-[6.8rem]">{isArabic ? "حيث تصبح الرؤية سينما" : "Where vision becomes cinema"}</h1>
            <p className="mx-auto mt-7 max-w-2xl font-ar text-lg leading-8 sm:text-xl md:text-2xl lg:mx-0" style={{ color: muted }}>{isArabic ? "RAVINE مساحة صُممت لصنّاع الصورة الذين يريدون أن تُعامل أعمالهم كأعمال فنية؛ لا كمنشورات عابرة في موجة لا تنتهي." : "RAVINE is a space for visual creators who want their work experienced as work—not as another disposable post in an endless feed."}</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start"><a href={`/${locale}/discover`} className="ravine-interactive inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-black shadow-xl shadow-[#C89A52]/10" style={{ background: gold, color: "#0B0B0B" }}><Play size={15} fill="currentColor" />{isArabic ? "استكشف RAVINE" : "Explore RAVINE"}</a><button type="button" onClick={() => setAuthOpen(true)} className="ravine-interactive inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-bold" style={{ borderColor: line, background: panel, color: foreground }}><PenLine size={15} />{isArabic ? "ابدأ رحلتك" : "Start your journey"}</button></div>
            <div className="mt-12 flex items-center justify-center gap-3 text-xs lg:justify-start" style={{ color: muted }}><ArrowDown size={16} style={{ color: gold }} />{isArabic ? "انزل لتعرف لماذا صُممت RAVINE" : "Scroll to see why RAVINE exists"}</div>
          </div>

          <div className="relative mx-auto w-full max-w-xl animate-[ravine-reveal_1100ms_180ms_cubic-bezier(.22,1,.36,1)_both]">
            <div className="absolute -inset-6 rounded-[48px] opacity-40 blur-3xl" style={{ background: `linear-gradient(135deg, ${gold}22, ${olive}22, ${indigo}28)` }} />
            <div className="relative overflow-hidden rounded-[40px] border p-5 shadow-2xl" style={{ borderColor: `${gold}24`, background: dark ? "rgba(20,22,21,.84)" : "rgba(255,255,255,.66)" }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="group relative min-h-56 overflow-hidden rounded-[28px] border p-5" style={{ borderColor: line, background: `linear-gradient(145deg, ${indigo}80, ${gold}12)` }}><div className="absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl" style={{ background: `${gold}28` }} /><Camera size={22} style={{ color: gold }} /><p className="mt-14 text-2xl font-black">{isArabic ? "صورة لها صوت" : "Images with a voice"}</p><p className="mt-2 text-sm leading-6" style={{ color: muted }}>{isArabic ? "أعمال فوتوغرافية، أفلام قصيرة، قصص بصرية." : "Photography, short films, visual stories."}</p></div>
                <div className="group relative min-h-56 overflow-hidden rounded-[28px] border p-5" style={{ borderColor: line, background: `linear-gradient(145deg, ${olive}55, ${indigo}36)` }}><div className="absolute -bottom-10 -left-7 h-32 w-32 rounded-full blur-3xl" style={{ background: `${olive}42` }} /><Clapperboard size={22} style={{ color: gold }} /><p className="mt-14 text-2xl font-black">{isArabic ? "أعمال تُكتشف" : "Work worth finding"}</p><p className="mt-2 text-sm leading-6" style={{ color: muted }}>{isArabic ? "اكتشاف موجّه بعيدًا عن الضوضاء." : "Directed discovery without the noise."}</p></div>
              </div>
              <div className="mt-4 rounded-[28px] border p-5" style={{ borderColor: line, background: panel }}><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.24em]" style={{ color: gold }}>CREATOR SPACE</p><p className="mt-2 text-xl font-black">{isArabic ? "هوية، معرض، مجتمع، واستوديو" : "Identity, portfolio, community & studio"}</p></div><ArrowUpRight size={20} style={{ color: gold }} /></div><div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.07)" }}><div className="h-full w-[78%] rounded-full" style={{ background: `linear-gradient(90deg, ${indigo}, ${gold}, ${olive})` }} /></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-20">
        <div className="border-y py-8" style={{ borderColor: line }}><div className="grid grid-cols-3"><div className="flex flex-col items-center gap-2 px-2 text-center"><strong className="text-3xl font-black sm:text-4xl">{compact(stats.works)}</strong><span className="text-xs" style={{ color: muted }}>{isArabic ? "عمل منشور" : "Published works"}</span></div><div className="flex flex-col items-center gap-2 border-x px-2 text-center" style={{ borderColor: line }}><strong className="text-3xl font-black sm:text-4xl">{compact(stats.creators)}</strong><span className="text-xs" style={{ color: muted }}>{isArabic ? "مبدع" : "Creators"}</span></div><div className="flex flex-col items-center gap-2 px-2 text-center"><strong className="text-3xl font-black sm:text-4xl">{compact(stats.categories)}</strong><span className="text-xs" style={{ color: muted }}>{isArabic ? "فئة إبداعية" : "Creative categories"}</span></div></div></div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.28em]" style={{ color: gold }}>WHY RAVINE</p><h2 className="mt-4 font-ar text-4xl font-black leading-tight sm:text-5xl md:text-6xl">{isArabic ? "منصة مبنية على فكرة واحدة: العمل الجيد يستحق مكانًا أفضل." : "One idea: great work deserves a better place."}</h2><p className="mt-5 text-base leading-8 md:text-lg" style={{ color: muted }}>{isArabic ? "المنصات العامة تكافئ السرعة، الترند، والتمرير المستمر. RAVINE تقترح عكس ذلك: نبطئ اللحظة قليلًا، نوضح هوية المبدع، ونبني تجربة اكتشاف تجعل المشاهد يتوقف فعلًا." : "Mainstream platforms reward speed, trends and endless scrolling. RAVINE takes the opposite approach: slow the moment down, clarify creator identity, and make discovery feel intentional."}</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">{pillars.map((pillar, index) => { const Icon = pillar.icon; return <article key={pillar.title} className="group rounded-[30px] border p-7 transition duration-500 hover:-translate-y-1 hover:shadow-2xl" style={{ borderColor: line, background: panel }}><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl border" style={{ borderColor: `${gold}35`, background: `${gold}0d`, color: gold }}><Icon size={22} /></span><span className="text-[10px] font-black" style={{ color: muted }}>0{index + 1}</span></div><h3 className="mt-7 text-xl font-black">{pillar.title}</h3><p className="mt-3 text-sm leading-7" style={{ color: muted }}>{pillar.text}</p></article>; })}</div>
      </section>

      <section className="relative mx-auto max-w-7xl overflow-hidden px-5 py-16 md:px-8 md:py-24"><div className="absolute inset-x-5 top-0 h-px md:inset-x-8" style={{ background: `linear-gradient(90deg, transparent, ${gold}70, transparent)` }} /><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-[10px] font-black uppercase tracking-[.28em]" style={{ color: gold }}>MADE FOR</p><h2 className="mt-4 font-ar text-4xl font-black leading-tight sm:text-5xl">{isArabic ? "لمن يعيش وراء الكاميرا، الشاشة، والمايك." : "For the people behind the camera, screen and mic."}</h2></div><div className="grid gap-3 sm:grid-cols-2">{[isArabic ? "Filmmakers & Directors" : "Filmmakers & Directors", isArabic ? "Photographers" : "Photographers", isArabic ? "Editors & Motion Designers" : "Editors & Motion Designers", isArabic ? "VFX, Animation & Gaming Creators" : "VFX, Animation & Gaming Creators"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border px-5 py-4" style={{ borderColor: line, background: panel }}><span className="h-2 w-2 rounded-full" style={{ background: gold, boxShadow: `0 0 16px ${gold}` }} /><span className="text-sm font-semibold">{item}</span></div>)}</div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><div className="relative overflow-hidden rounded-[42px] border p-8 sm:p-12 md:p-16" style={{ borderColor: `${gold}28`, background: `linear-gradient(135deg, ${indigo}34, ${olive}22, ${gold}10)` }}><div className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: `${gold}28` }} /><div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.28em]" style={{ color: gold }}><Sparkles size={13} /> THE RAVINE IDEA</p><h2 className="mt-5 font-ar text-4xl font-black leading-tight sm:text-5xl md:text-6xl">{isArabic ? "مش Feed جديد. مش Template. مساحة لها شخصية." : "Not another feed. Not another template. A place with a point of view."}</h2><p className="mt-5 max-w-3xl text-base leading-8" style={{ color: muted }}>{isArabic ? "هنا، كل جزء من المنتج له وظيفة: الاكتشاف، العرض، الهوية، المجتمع، والاستوديو. والنتيجة ليست شبكة اجتماعية عامة، بل بيئة إبداعية متماسكة." : "Every part of the product has a job: discovery, presentation, identity, community and studio. The result is not a generic social network, but a coherent creative environment."}</p></div><button type="button" onClick={() => setAuthOpen(true)} className="ravine-interactive inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-black" style={{ background: gold, color: "#0B0B0B" }}>{isArabic ? "ادخل RAVINE" : "Enter RAVINE"}<ArrowUpRight size={17} /></button></div></div></section>

      <footer className="mx-auto max-w-7xl px-5 pb-12 pt-6 md:px-8"><div className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: line }}><div className="flex items-center gap-3"><img src="/RAVINE.png" alt="RAVINE" className={`h-7 w-auto ${!dark ? "invert" : ""}`} /><span className="text-xs" style={{ color: muted }}>Where vision becomes cinema.</span></div><span className="text-xs" style={{ color: muted }}>{isArabic ? "من أجل صناع الصورة" : "For visual creators."}</span></div></footer>
    </main>

    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
  </div>;
}
