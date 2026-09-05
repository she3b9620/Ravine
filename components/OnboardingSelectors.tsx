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

function countryOptions(locale: Locale): CountryOption[] {
  if (typeof Intl.supportedValuesOf !== "function") return [];
  const codes = Intl.supportedValuesOf("region");
  const displayNames = new Intl.DisplayNames([locale], { type: "region" });
  return codes
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
