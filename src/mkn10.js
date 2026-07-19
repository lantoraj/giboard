import { useMemo } from "react";
import MKN10_CS from "./mkn10_cs";
import MKN10_EN from "./mkn10_en";
import { useSettings } from "./SettingsContext";

/**
 * Language-aware MKN-10 / ICD-10 lookup.
 * Returns { name, label } bound to the active UI language
 * (English names from WHO ICD-10, falling back to Czech, then the code).
 */
export function useMkn10() {
  const { lang } = useSettings();
  return useMemo(() => {
    const dict = lang === "en" ? { ...MKN10_CS, ...MKN10_EN } : MKN10_CS;
    const name = (code) => (code ? dict[code] ?? code : "");
    const label = (code) => {
      if (!code) return "";
      const n = dict[code];
      return n ? `${code} / ${n}` : code;
    };
    return { name, label };
  }, [lang]);
}
