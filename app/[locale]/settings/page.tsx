"use client";

import { ArrowUpRight, Check, MonitorCog, Moon, Palette, Sun, UserRound } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../account/account.module.css";

const LOGO_MOTION_KEY = "ravine-logo-motion";

export default function GeneralSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = use(params);
  const locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [logoMotion, setLogoMotion] = useState(true);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("ravine-theme");
    const nextTheme = storedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    const storedMotion = window.localStorage.getItem(LOGO_MOTION_KEY);
    const enabled = storedMotion !== "off";
    setLogoMotion(enabled);
    document.documentElement.dataset.ravineLogoMotion = enabled ? "on" : "off";
  }, []);

  const setThemeAndPersist = (next: "dark" | "light") => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("ravine-theme", next);
  };

  const setLogoMotionAndPersist = (enabled: boolean) => {
    setLogoMotion(enabled);
    document.documentElement.dataset.ravineLogoMotion = enabled ? "on" : "off";
    window.localStorage.setItem(LOGO_MOTION_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new CustomEvent("ravine-logo-motion-change", { detail: { enabled } }));
  };

  const switchLocale = (nextLocale: "ar" | "en") => {
    if (nextLocale === locale) return;
    router.replace(`/${nextLocale}/settings`);
    router.refresh();
  };

  return (
    <section className={`section ${styles.page}`} dir={ar ? "rtl" : "ltr"}>
      <div className={styles.hero}><div><div className={styles.eyebrow}>RAVINE / {ar ? "الإعدادات العامة" : "GENERAL SETTINGS"}</div><h1 className={styles.heroTitle}>{ar ? "إعداداتك العامة." : "General settings."}</h1><p className={styles.heroNote}>{ar ? "الخيارات العامة للتجربة، منفصلة عن تعديل ملفك وهويتك." : "Global experience preferences, kept separate from your public profile."}</p></div></div>
      <div className={styles.settingsShell}>
        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionLabel}>{ar ? "المظهر" : "Appearance"}</h2>
          <p className={styles.settingsNote}>{ar ? "اختر الشكل العام لواجهة RAVINE على هذا الجهاز." : "Choose the overall RAVINE interface appearance on this device."}</p>
          <div className={styles.generalOptionGrid}>
            <button type="button" className={`${styles.generalOption} ${theme === "dark" ? styles.generalOptionActive : ""}`} onClick={() => setThemeAndPersist("dark")}><span className={styles.generalOptionIcon}><Moon size={18} /></span><span><strong>{ar ? "داكن" : "Dark"}</strong><small>{ar ? "المظهر السينمائي الأساسي" : "The primary cinematic look"}</small></span>{theme === "dark" ? <Check size={15} /> : null}</button>
            <button type="button" className={`${styles.generalOption} ${theme === "light" ? styles.generalOptionActive : ""}`} onClick={() => setThemeAndPersist("light")}><span className={styles.generalOptionIcon}><Sun size={18} /></span><span><strong>{ar ? "فاتح" : "Light"}</strong><small>{ar ? "واجهة أكثر سطوعًا وهدوءًا" : "A brighter, quieter interface"}</small></span>{theme === "light" ? <Check size={15} /> : null}</button>
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionLabel}>{ar ? "حركة الشعار" : "Logo motion"}</h2>
          <p className={styles.settingsNote}>{ar ? "حركة هوية هادئة للشعار أثناء التفاعل، ويمكن إيقافها دون التأثير على بقية الحركة." : "A restrained identity motion for the RAVINE logo, independently switchable from the rest of the motion system."}</p>
          <div className={`${styles.generalOptionGrid} ravine-logo-motion-options`}>
            <button type="button" className={`${styles.generalOption} ${logoMotion ? styles.generalOptionActive : ""}`} onClick={() => setLogoMotionAndPersist(true)}><span className={styles.generalOptionIcon}><Palette size={18} /></span><span><strong>{ar ? "مفعّلة" : "Enabled"}</strong><small>{ar ? "حركة ألوان الشعار الهادئة" : "Subtle living color motion"}</small></span>{logoMotion ? <Check size={15} /> : <ArrowUpRight size={15} />}</button>
            <button type="button" className={`${styles.generalOption} ${!logoMotion ? styles.generalOptionActive : ""}`} onClick={() => setLogoMotionAndPersist(false)}><span className={styles.generalOptionIcon}><Palette size={18} /></span><span><strong>{ar ? "متوقفة" : "Off"}</strong><small>{ar ? "شعار ثابت بدون حركة ألوان" : "Static logo without color motion"}</small></span>{!logoMotion ? <Check size={15} /> : <ArrowUpRight size={15} />}</button>
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionLabel}>{ar ? "اللغة" : "Language"}</h2>
          <p className={styles.settingsNote}>{ar ? "غيّر واجهة RAVINE مع الحفاظ على الصفحة التي تتصفحها الآن." : "Switch the RAVINE interface while staying on the page you are viewing."}</p>
          <div className={styles.generalOptionGrid}>
            <button type="button" onClick={() => switchLocale("ar")} className={`${styles.generalOption} ${ar ? styles.generalOptionActive : ""}`} aria-current={ar ? "page" : undefined}><span className={styles.generalOptionIcon}><MonitorCog size={18} /></span><span><strong>العربية</strong><small>واجهة RAVINE بالعربية</small></span>{ar ? <Check size={15} /> : <ArrowUpRight size={15} />}</button>
            <button type="button" onClick={() => switchLocale("en")} className={`${styles.generalOption} ${!ar ? styles.generalOptionActive : ""}`} aria-current={!ar ? "page" : undefined}><span className={styles.generalOptionIcon}><MonitorCog size={18} /></span><span><strong>English</strong><small>RAVINE interface in English</small></span>{!ar ? <Check size={15} /> : <ArrowUpRight size={15} />}</button>
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionLabel}>{ar ? "هويتك" : "Your identity"}</h2>
          <p className={styles.settingsNote}>{ar ? "تعديل الاسم والاسم المستخدم والنبذة والصور من مساحة تعديل الملف." : "Edit your name, username, bio, and media from the dedicated profile editor."}</p>
          <div className={styles.actions}><a className={styles.actionLink} href={`/${locale}/account`}><UserRound size={14} />{ar ? "دخول إلى الحساب" : "Open account"}</a><a className={styles.actionLink} href={`/${locale}/account/edit`}>{ar ? "تعديل الملف الشخصي" : "Edit profile"}<ArrowUpRight size={14} /></a></div>
        </section>
      </div>
    </section>
  );
}
