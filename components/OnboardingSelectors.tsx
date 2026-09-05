"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./OnboardingSelectors.module.css";

type Locale = "ar" | "en";
type Option = { code: "ar" | "en"; label: string };
type CountryOption = { code: string; label: string; normalized: string };

const languageOptions: Option[] = [
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
];

// Intl.supportedValuesOf() does not define a "region" key in TypeScript/ECMA-402.
// Keep the country source explicit and use Intl.DisplayNames for localized labels.
const COUNTRY_CODES = [
  "AF","AX","AL","DZ","AS","AD","AO","AI","AQ","AG","AR","AM","AW","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BM","BT","BO","BQ","BA","BW","BV","BR","IO","BN","BG","BF","BI","CV","KH","CM","CA","KY","CF","TD","CL","CN","CX","CC","CO","KM","CG","CD","CK","CR","CI","HR","CU","CW","CY","CZ","DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","SZ","ET","FK","FO","FJ","FI","FR","GF","PF","TF","GA","GM","GE","DE","GH","GI","GR","GL","GD","GP","GU","GT","GG","GN","GW","GY","HT","HM","VA","HN","HK","HU","IS","IN","ID","IR","IQ","IE","IM","IL","IT","JM","JP","JE","JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI","LT","LU","MO","MG","MW","MY","MV","ML","MT","MH","MQ","MR","MU","YT","MX","FM","MD","MC","MN","ME","MS","MA","MZ","MM","NA","NR","NP","NL","NC","NZ","NI","NE","NG","NU","NF","MK","MP","NO","OM","PK","PW","PS","PA","PG","PY","PE","PH","PN","PL","PT","PR","QA","RE","RO","RU","RW","BL","SH","KN","LC","MF","PM","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SX","SK","SI","SB","SO","ZA","GS","SS","ES","LK","SD","SR","SJ","SE","CH","SY","TW","TJ","TZ","TH","TL","TG","TK","TO","TT","TN","TR","TM","TC","TV","UG","UA","AE","GB","US","UM","UY","UZ","VU","VE","VN","VG","VI","WF","EH","YE","ZM","ZW"
] as const;

function countryOptions(locale: Locale): CountryOption[] {
  const displayNames = new Intl.DisplayNames([locale], { type: "region" });
  return COUNTRY_CODES
    .map((code) => {
      const label = displayNames.of(code) || code;
      return { code, label, normalized: `${label} ${code}`.toLocaleLowerCase(locale === "ar" ? "ar-EG" : "en-US") };
    })
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

export default function OnboardingSelectors({
  locale,
  language,
  country,
  onLanguageChange,
  onCountryChange,
}: {
  locale: Locale;
  language: Locale;
  country: string;
  onLanguageChange: (value: Locale) => void;
  onCountryChange: (value: string) => void;
}) {
  const ar = locale === "ar";
  const langWrapRef = useRef<HTMLDivElement>(null);
  const countryWrapRef = useRef<HTMLDivElement>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");

  const countries = useMemo(() => countryOptions(locale), [locale]);
  const selectedCountry = countries.find((item) => item.code === country);
  const filteredCountries = useMemo(() => {
    const query = countryQuery.trim().toLocaleLowerCase(ar ? "ar-EG" : "en-US");
    if (!query) return countries;
    return countries.filter((item) => item.normalized.includes(query));
  }, [ar, countryQuery, countries]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!langWrapRef.current?.contains(target)) setLanguageOpen(false);
      if (!countryWrapRef.current?.contains(target)) setCountryOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const selectedLanguage = languageOptions.find((item) => item.code === language) || languageOptions[0];

  return (
    <>
      <div className={styles.field} ref={langWrapRef}>
        <span className={styles.label}>{ar ? "اللغة" : "Language"}</span>
        <button
          type="button"
          className={`${styles.trigger} ${languageOpen ? styles.open : ""}`}
          aria-haspopup="listbox"
          aria-expanded={languageOpen}
          onClick={() => { setLanguageOpen((value) => !value); setCountryOpen(false); }}
        >
          <span>{selectedLanguage.label}</span>
          <span className={styles.chevron} aria-hidden="true">⌄</span>
        </button>
        {languageOpen ? (
          <div className={styles.menu} role="listbox" aria-label={ar ? "اختيار اللغة" : "Language selection"}>
            {languageOptions.map((item) => (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={item.code === language}
                className={`${styles.option} ${item.code === language ? styles.selected : ""}`}
                onClick={() => { onLanguageChange(item.code); setLanguageOpen(false); }}
              >
                <span>{item.label}</span>
                {item.code === language ? <span aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.field} ref={countryWrapRef}>
        <span className={styles.label}>{ar ? "البلد (اختياري)" : "Country (optional)"}</span>
        <button
          type="button"
          className={`${styles.trigger} ${countryOpen ? styles.open : ""}`}
          aria-haspopup="listbox"
          aria-expanded={countryOpen}
          onClick={() => { setCountryOpen((value) => !value); setLanguageOpen(false); }}
        >
          <span className={selectedCountry ? styles.value : styles.placeholder}>
            {selectedCountry?.label || (ar ? "اختر بلدك" : "Select your country")}
          </span>
          <span className={styles.code}>{selectedCountry?.code || ""}</span>
          <span className={styles.chevron} aria-hidden="true">⌄</span>
        </button>
        {countryOpen ? (
          <div className={styles.countryMenu} role="listbox" aria-label={ar ? "اختيار البلد" : "Country selection"}>
            <div className={styles.searchWrap}>
              <input
                autoFocus
                value={countryQuery}
                onChange={(event) => setCountryQuery(event.target.value)}
                placeholder={ar ? "ابحث عن بلد..." : "Search countries..."}
                aria-label={ar ? "البحث عن بلد" : "Search countries"}
              />
            </div>
            <div className={styles.optionsScroll}>
              {filteredCountries.length ? filteredCountries.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={item.code === country}
                  className={`${styles.option} ${item.code === country ? styles.selected : ""}`}
                  onClick={() => { onCountryChange(item.code); setCountryQuery(""); setCountryOpen(false); }}
                >
                  <span>{item.label}</span>
                  <span className={styles.code}>{item.code}</span>
                </button>
              )) : (
                <div className={styles.empty}>{ar ? "لا توجد نتائج." : "No countries found."}</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
