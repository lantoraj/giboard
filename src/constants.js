export const YEARS = ["2019", "2020", "2021", "2022", "2023", "2024"];

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

// Key endoscopy codes featured in navigation / quick-select
// All codes are SZV billing codes (szv.mzcr.cz) – specialties 105 + 115
export const KEY_CODES = [
  { kod: "15430", szv_code: "15430", label: "ERCP", color: "#3b82f6" },
  { kod: "15410", szv_code: "15410", label: "EUS", color: "#8b5cf6" },
  { kod: "15024", szv_code: "15024", label: "ESD", color: "#f59e0b" },
  { kod: "15401", szv_code: "15401", label: "Gastroskopie", color: "#10b981" },
  { kod: "15404", szv_code: "15404", label: "Koloskopie", color: "#06b6d4" },
  { kod: "15950", szv_code: "15950", label: "Polypektomie endoskopická", color: "#f97316" },
  { kod: "15475", szv_code: "15475", label: "EMR", color: "#ec4899" },
  { kod: "15470", szv_code: "15470", label: "Kapslová enteroskopie", color: "#84cc16" },
];

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
