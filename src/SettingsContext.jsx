import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { translate } from "./i18n";

const LANG_KEY = "giboard.lang";
const THEME_KEY = "giboard.theme";
const SPEC_KEY = "giboard.spec";

export const THEMES = ["dark", "light", "graphite"];
export const SPEC_IDS = ["gastro", "chir", "endo"];

const SettingsContext = createContext(null);

function readStored(key, allowed, fallback) {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function SettingsProvider({ children }) {
  const [lang, setLang] = useState(() => readStored(LANG_KEY, ["cs", "en"], "cs"));
  const [theme, setTheme] = useState(() => readStored(THEME_KEY, THEMES, "dark"));
  // null = not chosen yet → App shows the specialty landing screen
  const [spec, setSpec] = useState(() => readStored(SPEC_KEY, SPEC_IDS, null));

  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!spec) return;
    try { localStorage.setItem(SPEC_KEY, spec); } catch { /* ignore */ }
  }, [spec]);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  return (
    <SettingsContext.Provider value={{ lang, setLang, theme, setTheme, spec, setSpec, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** Shorthand hook returning just the translate function. */
export function useT() {
  return useSettings().t;
}
