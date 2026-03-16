import React, { createContext, useContext, useEffect, useState } from "react";

const DataContext = createContext(null);

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

export function DataProvider({ children }) {
  const [state, setState] = useState({
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
    gastroRegistry: [],   // list of gastro providers from NRPZS registry
    icoLoading: false,
    icoLoaded: false,
  });

  useEffect(() => {
    Promise.all([
      loadJSON("/data/procedures.json"),
      loadJSON("/data/national_trends.json"),
      loadJSON("/data/regional_data.json"),
      loadJSON("/data/age_data.json"),
      loadJSON("/data/gender_data.json"),
    ])
      .then(([procedures, national, regional, ageData, genderData]) => {
        setState((s) => ({ ...s, loading: false, error: null, procedures, national, regional, ageData, genderData }));
      })
      .catch((err) => setState((s) => ({ ...s, loading: false, error: err.message })));
  }, []);

  // Lazy loader – called by pages that need ICO data
  const loadIcoData = React.useCallback(() => {
    setState((s) => {
      if (s.icoLoaded || s.icoLoading) return s;
      Promise.all([
        loadJSON("/data/providers_data.json"),
        loadJSON("/data/diagnosis_data.json"),
        loadJSON("/data/gastro_providers_registry.json"),
      ]).then(([providers, diagnoses, gastroRegistry]) => {
        setState((prev) => ({ ...prev, providers, diagnoses, gastroRegistry, icoLoading: false, icoLoaded: true }));
      }).catch(() => {
        setState((prev) => ({ ...prev, icoLoading: false }));
      });
      return { ...s, icoLoading: true };
    });
  }, []);

  return <DataContext.Provider value={{ ...state, loadIcoData }}>{children}</DataContext.Provider>;
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
