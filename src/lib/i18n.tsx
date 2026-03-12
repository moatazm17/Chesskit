import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, PropsWithChildren } from "react";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";

export type Locale = "en" | "ar";

const translations: Record<Locale, Record<string, string>> = { en, ar };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("app-locale") as Locale | null;
    if (saved === "ar" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("app-locale", newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = translations[locale]?.[key] ?? translations.en[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return text;
    },
    [locale]
  );

  const dir = locale === "ar" ? "rtl" : "ltr";
  const isRTL = locale === "ar";

  const value = useMemo(
    () => ({ locale, setLocale, t, dir, isRTL }),
    [locale, setLocale, t, dir, isRTL]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
