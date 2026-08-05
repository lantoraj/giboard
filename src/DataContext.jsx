import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "./SettingsContext";
import { procLabelEn } from "./i18n";

const DataContext = createContext(null);

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

const EMPTY = {
  loading: true,
  error: null,
  procedures: [],
  national: {},
  regional: {},
  ageData: {},
  genderData: {},
  // ICO dataset – loaded lazily on first visit to Providers / Diagnoses / Explorer tabs
  providers: [],
  diagnoses: {},
  registry: [],   // provider registry (NRPZS) for the active specialty
  icoLoading: false,
  icoLoaded: false,
};

export function DataProvider({ children }) {
  const { lang, spec } = useSettings();
  const [state, setState] = useState(EMPTY);
  // Guards against a stale fetch finishing after the user switched specialty
  const specRef = useRef(spec);
  specRef.current = spec;

  useEffect(() => {
    if (!spec) return; // specialty not chosen yet – landing screen is shown
    setState({ ...EMPTY, loading: true });
    const base = `/data/${spec}`;
    Promise.all([
      loadJSON(`${base}/procedures.json`),
      loadJSON(`${base}/national_trends.json`),
      loadJSON(`${base}/regional_data.json`),
      loadJSON(`${base}/age_data.json`),
      loadJSON(`${base}/gender_data.json`),
    ])
      .then(([procedures, national, regional, ageData, genderData]) => {
        if (specRef.current !== spec) return;
        setState((s) => ({ ...s, loading: false, error: null, procedures, national, regional, ageData, genderData }));
      })
      .catch((err) => {
        if (specRef.current !== spec) return;
        setState((s) => ({ ...s, loading: false, error: err.message }));
      });
  }, [spec]);

  // Lazy loader – called by pages that need ICO data
  const loadIcoData = React.useCallback(() => {
    const forSpec = specRef.current;
    if (!forSpec) return;
    setState((s) => {
      if (s.icoLoaded || s.icoLoading) return s;
      const base = `/data/${forSpec}`;
      Promise.all([
        loadJSON(`${base}/providers_data.json`),
        loadJSON(`${base}/diagnosis_data.json`),
        loadJSON(`${base}/providers_registry.json`),
      ]).then(([providers, diagnoses, registry]) => {
        if (specRef.current !== forSpec) return;
        setState((prev) => ({ ...prev, providers, diagnoses, registry, icoLoading: false, icoLoaded: true }));
      }).catch(() => {
        if (specRef.current !== forSpec) return;
        setState((prev) => ({ ...prev, icoLoading: false }));
      });
      return { ...s, icoLoading: true };
    });
  }, []);

  // ── DRG (separate data model: hospitalisation cases, own pages) ───────────
  const [drg, setDrg] = useState({ loading: false, loaded: false, error: null, meta: null, levels: {}, providers: null });

  /** Loads DRG meta + one indicator level on demand; providers only when asked. */
  const loadDrg = React.useCallback((level = "mdc", withProviders = false) => {
    setDrg((s) => {
      const needLevel = !s.levels[level];
      const needProviders = withProviders && !s.providers;
      if (s.loading || (!needLevel && !needProviders && s.loaded)) return s;

      const jobs = [
        s.meta ? Promise.resolve(s.meta) : loadJSON("/data/drg/meta.json"),
        needLevel ? loadJSON(`/data/drg/indicators_${level}.json`) : Promise.resolve(s.levels[level]),
        needProviders ? loadJSON("/data/drg/providers.json") : Promise.resolve(s.providers),
      ];
      Promise.all(jobs)
        .then(([meta, levelData, providers]) => {
          setDrg((prev) => ({
            ...prev, loading: false, loaded: true, error: null, meta,
            levels: { ...prev.levels, [level]: levelData },
            providers: providers ?? prev.providers,
          }));
        })
        .catch((err) => setDrg((prev) => ({ ...prev, loading: false, error: err.message })));
      return { ...s, loading: true };
    });
  }, []);

  // Localize procedure labels for the active UI language
  const procedures = useMemo(
    () => (lang === "en" ? state.procedures.map((p) => ({ ...p, label: procLabelEn(p) })) : state.procedures),
    [state.procedures, lang]
  );

  return <DataContext.Provider value={{ ...state, procedures, loadIcoData, drg, loadDrg }}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}

// ── Procedure label helpers ───────────────────────────────────────────────────

/**
 * Returns the primary display code for a procedure.
 * Uses szv_code when known, falls back to nrhzs kod.
 * Example: "15401" for gastroskopie
 */
export function getProcCode(proc) {
  return proc?.szv_code ?? proc?.kod ?? "";
}

/**
 * Returns the short display label: "15401 – Gastroskopie"
 * or "09xxx – Name" when no SZV code is known.
 */
export function getProcLabel(proc) {
  if (!proc) return "";
  const code = proc.szv_code ?? proc.kod;
  return `${code} – ${proc.label}`;
}

/**
 * Returns just the label part (no code prefix).
 */
export function getProcName(proc) {
  return proc?.label ?? proc?.kod ?? "";
}

/**
 * Looks up a procedure object by its nrhzs kod from the procedures array.
 */
export function findProc(procedures, kod) {
  return procedures.find((p) => p.kod === kod);
}

// ── Helper selectors ──────────────────────────────────────────────────────────

/** Returns array: [{year, mnozstvi, pocet_pacientu, pocet_kontaktu}] */
export function getNationalTimeSeries(national, kod) {
  const byYear = national[kod] || {};
  return Object.entries(byYear)
    .map(([year, vals]) => ({ year, ...vals }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

/** Returns array: [{year, ...oneEntryPerCode}] for multi-code comparison */
export function getMultiCodeTimeSeries(national, codes, metric = "mnozstvi") {
  const years = [...new Set(Object.values(national).flatMap((v) => Object.keys(v)))].sort();
  return years.map((year) => {
    const row = { year };
    codes.forEach((kod) => {
      row[kod] = national[kod]?.[year]?.[metric] ?? 0;
    });
    return row;
  });
}

/** Returns array: [{region, mnozstvi, pocet_pacientu}] for a given code+year */
export function getRegionalData(regional, kod, year, metric = "mnozstvi") {
  const byRegion = regional[kod] || {};
  return Object.entries(byRegion)
    .map(([region, byYear]) => ({ region, value: byYear[year]?.[metric] ?? 0 }))
    .sort((a, b) => b.value - a.value);
}

/** Returns array: [{region, ...oneEntryPerYear}] for sparkline table */
export function getRegionalTimeSeries(regional, kod, metric = "mnozstvi") {
  const byRegion = regional[kod] || {};
  return Object.entries(byRegion).map(([region, byYear]) => {
    const row = { region };
    Object.entries(byYear).forEach(([yr, vals]) => { row[yr] = vals[metric] ?? 0; });
    return row;
  });
}

/** Returns [{ageGroup, mnozstvi, pocet_pacientu}] for a given code+year */
export function getAgeData(ageData, kod, year) {
  const byYear = ageData[kod] || {};
  const byAge = byYear[year] || {};
  return Object.entries(byAge)
    .map(([ageGroup, vals]) => ({ ageGroup, ...vals }))
    .sort((a, b) => {
      const aStart = parseInt(a.ageGroup.split("-")[0]) || 0;
      const bStart = parseInt(b.ageGroup.split("-")[0]) || 0;
      return aStart - bStart;
    });
}

/** Returns [{gender, mnozstvi, pocet_pacientu}] for a given code+year */
export function getGenderData(genderData, kod, year) {
  const byYear = genderData[kod] || {};
  const byGender = byYear[year] || {};
  return Object.entries(byGender).map(([gender, vals]) => ({ gender, ...vals }));
}
