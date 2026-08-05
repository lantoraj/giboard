export const YEARS = ["2019", "2020", "2021", "2022", "2023", "2024"];

// ── Specialties (odbornosti) ─────────────────────────────────────────────────
// Each has its own data folder under public/data/<id>/ and defaults.
export const SPECIALTIES = [
  {
    id: "gastro",
    label: "Gastroenterologie & endoskopie",
    short: "Gastroenterologie",
    description: "Endoskopické a ambulantní výkony odborností 105 a 115",
    color: "#3b82f6",
    defaultKod: "15430",
    trendKod: "15430",
    trendLabel: "ERCP – trend",
    trendSubtitle: "Počet ERCP – poslední rok",
    comparisonDefaults: ["15430", "15410", "15024", "15404"],
  },
  {
    id: "chir",
    label: "Chirurgie",
    short: "Chirurgie",
    description: "Operační a ambulantní výkony chirurgických odborností 5xx",
    color: "#ef4444",
    defaultKod: "51371",
    trendKod: "51371",
    trendLabel: "Cholecystektomie – trend",
    trendSubtitle: "Počet cholecystektomií – poslední rok",
    comparisonDefaults: ["51371", "51367", "51511", "51425"],
  },
  {
    id: "endo",
    label: "Endokrinologie & diabetologie",
    short: "Endo / diabetologie",
    description: "Výkony odborností 103 (diabetologie) a 104 (endokrinologie)",
    color: "#10b981",
    defaultKod: "13021",
    trendKod: "13075",
    trendLabel: "Monitorace glukózy – trend",
    trendSubtitle: "Kontinuální monitorace – poslední rok",
    comparisonDefaults: ["13021", "14021", "13075", "14220"],
  },
];

export const getSpec = (id) => SPECIALTIES.find((s) => s.id === id) ?? SPECIALTIES[0];

export const REGIONS = [
  "Praha",
  "Středočeský kraj",
  "Jihočeský kraj",
  "Plzeňský kraj",
  "Karlovarský kraj",
  "Ústecký kraj",
  "Liberecký kraj",
  "Královéhradecký kraj",
  "Pardubický kraj",
  "Kraj Vysočina",
  "Jihomoravský kraj",
  "Olomoucký kraj",
  "Zlínský kraj",
  "Moravskoslezský kraj",
];

// Key codes featured in navigation / quick-select, per specialty.
// All codes are SZV billing codes (szv.mzcr.cz).
export const KEY_CODES_BY_SPEC = {
  gastro: [
    { kod: "15430", szv_code: "15430", label: "ERCP", color: "#3b82f6" },
    { kod: "15410", szv_code: "15410", label: "EUS", color: "#8b5cf6" },
    { kod: "15024", szv_code: "15024", label: "ESD", color: "#f59e0b" },
    { kod: "15401", szv_code: "15401", label: "Gastroskopie", color: "#10b981" },
    { kod: "15404", szv_code: "15404", label: "Koloskopie", color: "#06b6d4" },
    { kod: "15950", szv_code: "15950", label: "Polypektomie endoskopická", color: "#f97316" },
    { kod: "15475", szv_code: "15475", label: "EMR", color: "#ec4899" },
    { kod: "15470", szv_code: "15470", label: "Kapslová enteroskopie", color: "#84cc16" },
  ],
  chir: [
    { kod: "51021", szv_code: "51021", label: "Vyšetření chirurgem", color: "#3b82f6" },
    { kod: "51367", szv_code: "51367", label: "Apendektomie", color: "#8b5cf6" },
    { kod: "51371", szv_code: "51371", label: "Cholecystektomie", color: "#f59e0b" },
    { kod: "51511", szv_code: "51511", label: "Operace tříselné kýly", color: "#10b981" },
    { kod: "51514", szv_code: "51514", label: "Ventrální kýla laparoskopicky", color: "#06b6d4" },
    { kod: "51425", szv_code: "51425", label: "Hemoroidektomie", color: "#f97316" },
    { kod: "51125", szv_code: "51125", label: "Tyreoidektomie", color: "#ec4899" },
    { kod: "51861", szv_code: "51861", label: "Sádrový obvaz – bérec", color: "#84cc16" },
  ],
  endo: [
    { kod: "13021", szv_code: "13021", label: "Vyšetření diabetologem", color: "#3b82f6" },
    { kod: "13023", szv_code: "13023", label: "Kontrola diabetologem", color: "#8b5cf6" },
    { kod: "14021", szv_code: "14021", label: "Vyšetření endokrinologem", color: "#f59e0b" },
    { kod: "14023", szv_code: "14023", label: "Kontrola endokrinologem", color: "#10b981" },
    { kod: "13075", szv_code: "13075", label: "Kontinuální monitorace glukózy", color: "#06b6d4" },
    { kod: "13051", szv_code: "13051", label: "Edukace diabetika", color: "#f97316" },
    { kod: "14220", szv_code: "14220", label: "Punkce štítné žlázy", color: "#ec4899" },
    { kod: "14110", szv_code: "14110", label: "Dynamické testy", color: "#84cc16" },
  ],
};

// Backwards-compatible alias (gastro)
export const KEY_CODES = KEY_CODES_BY_SPEC.gastro;

// Theme-aware chart UI colors (resolved from CSS variables set per data-theme)
export const CHART_UI = {
  grid:       "var(--chart-grid)",
  tick:       "var(--chart-tick)",
  tickStrong: "var(--chart-tick-strong)",
  tickAccent: "var(--chart-tick-accent)",
  tooltip: {
    background: "var(--chart-tooltip-bg)",
    border: "1px solid var(--chart-tooltip-border)",
    borderRadius: 8,
  },
  tooltipLabel: { color: "var(--chart-tooltip-text)", fontWeight: 600 },
  tooltipItem:  { color: "var(--chart-tooltip-item)" },
};

// Recharts colour palette for multi-series
export const CHART_COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444",
  "#06b6d4","#f97316","#ec4899","#84cc16","#a78bfa",
];

export const GENDER_COLORS = { "Muži": "#3b82f6", "Ženy": "#ec4899" };

export const YOY_COVID_YEAR = "2020"; // year to annotate as COVID impact
