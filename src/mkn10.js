import { useMemo } from "react";
import MKN10_CS from "./mkn10_cs";
import MKN10_CS_EXT from "./mkn10_cs_ext";
import MKN10_EN from "./mkn10_en";
import MKN10_EN_EXT from "./mkn10_en_ext";
import { useSettings } from "./SettingsContext";

// Hand-curated gastro names win over the generated extension sets.
const CS_ALL = { ...MKN10_CS_EXT, ...MKN10_CS };
const EN_ALL = { ...MKN10_EN_EXT, ...MKN10_EN };

/**
 * Language-aware MKN-10 / ICD-10 lookup.
 * Returns { name, label } bound to the active UI language
 * (English names from WHO ICD-10, falling back to Czech, then the code).
 */
export function useMkn10() {
  const { lang } = useSettings();
  return useMemo(() => {
    const dict = lang === "en" ? { ...CS_ALL, ...EN_ALL } : CS_ALL;
    const name = (code) => (code ? dict[code] ?? code : "");
    const label = (code) => {
      if (!code) return "";
      const n = dict[code];
      return n ? `${code} / ${n}` : code;
    };
    return { name, label };
  }, [lang]);
}
