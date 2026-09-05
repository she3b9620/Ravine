import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import RavineShell from "../../components/RavineShell";
import RavineUiEnhancer from "../../components/RavineUiEnhancer";
import "./ravine-overrides.css";
import "./home-spacing.css";
import "./ravine-final-visual-fixes.css";
import "./search-permission-fixes.css";
import "./messaging-header.css";
import "./ravine-typography-search-final.css";
import "./ravine-font-authority.css";
import "./ravine-script-font-lock.css";
import "./ravine-controls.css";
import "./ravine-final-font-lock.css";
import "./ravine-absolute-font-lock.css";
import "./ravine-account-edit-polish.css";
import "./ravine-sidebar.css";
import "./ravine-ui-shell-polish.css";

const locales = ["ar", "en"] as const;
type Locale = (typeof locales)[number];
export function generateStaticParams(){return locales.map((locale)=>({locale}))}
export default async function LocaleLayout({children,params}:{children:ReactNode;params:Promise<{locale:string}>}){const {locale}=await params;if(!locales.includes(locale as Locale))notFound();return <RavineShell locale={locale as Locale}><RavineUiEnhancer />{children}</RavineShell>}
