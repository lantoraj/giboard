import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus,
  ChevronUp, ChevronDown, ChevronsUpDown,
  ExternalLink, Info, X, Search,
} from "lucide-react";

import { useData } from "../DataContext";
import { useSettings } from "../SettingsContext";
import { YEARS, CHART_COLORS, CHART_UI } from "../constants";
import ChartContainer from "../components/ChartContainer";
import SectionHeader from "../components/SectionHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import { useMkn10 } from "../mkn10";

const fmt     = (n) => n >= 1e6 ? `${(n/1e6).toFixed(2)} M` : n >= 1e3 ? `${(n/1e3).toFixed(1)} K` : String(Math.round(n));
const fmtFull = (n) => Math.round(n).toLocaleString("cs-CZ");

function yoyPct(prev, curr) {
  return prev > 0 ? ((curr - prev) / prev) * 100 : null;
}

function YoyBadge({ val }) {
  if (val === null || val === undefined || !isFinite(val))
    return <span className="text-gray-600">—</span>;
  const Icon = val > 0 ? TrendingUp : val < 0 ? TrendingDown : Minus;
  const cls  = val > 0 ? "text-emerald-400" : val < 0 ? "text-red-400" : "text-gray-500";
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${cls}`}>
      <Icon size={12} />
      {val > 0 ? "+" : ""}{val.toFixed(1)}%
    </span>
  );
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={11} className="text-gray-600 opacity-60" />;
  return sortDir === "desc"
    ? <ChevronDown size={11} className="text-blue-400" />
    : <ChevronUp   size={11} className="text-blue-400" />;
}

// ── MKN-10 chapter filter groups, per specialty ──────────────────────────────
const MKN_GROUPS_BY_SPEC = {
  gastro: [
    { id: "all",     label: "Vše",       subtitle: "",                                              color: "#3b82f6", ranges: [] },
    { id: "travici", label: "K00–K93",   subtitle: "Nemoci trávicí soustavy",                       color: "#06b6d4", ranges: [{from:"K00",to:"K93"}] },
    { id: "novot",   label: "C00–D48",   subtitle: "Novotvary",                                     color: "#ec4899", ranges: [{from:"C00",to:"D48"}] },
    { id: "vrozene", label: "Q38–Q45",   subtitle: "Jiné vrozené vady trávicí soustavy",            color: "#8b5cf6", ranges: [{from:"Q38",to:"Q45"}] },
    { id: "krev",    label: "D50–D89",   subtitle: "Nemoci krve a krvetvorných orgánů",             color: "#f59e0b", ranges: [{from:"D50",to:"D89"}] },
    { id: "endokr",  label: "E00–E90",   subtitle: "Nemoci endokrinní, výživy a přeměny látek",    color: "#10b981", ranges: [{from:"E00",to:"E90"}] },
    { id: "sympt",   label: "R10–R19",   subtitle: "Příznaky trávicí soustavy a břicha",            color: "#9ca3af", ranges: [{from:"R10",to:"R19"}] },
  ],
  chir: [
    { id: "all",     label: "Vše",       subtitle: "",                                              color: "#3b82f6", ranges: [] },
    { id: "travici", label: "K00–K93",   subtitle: "Nemoci trávicí soustavy",                       color: "#06b6d4", ranges: [{from:"K00",to:"K93"}] },
    { id: "novot",   label: "C00–D48",   subtitle: "Novotvary",                                     color: "#ec4899", ranges: [{from:"C00",to:"D48"}] },
    { id: "porane",  label: "S00–T98",   subtitle: "Poranění a otravy",                             color: "#ef4444", ranges: [{from:"S00",to:"T98"}] },
    { id: "kuze",    label: "L00–L99",   subtitle: "Nemoci kůže a podkožního vaziva",               color: "#f59e0b", ranges: [{from:"L00",to:"L99"}] },
    { id: "endokr",  label: "E00–E90",   subtitle: "Nemoci endokrinní, výživy a přeměny látek",    color: "#10b981", ranges: [{from:"E00",to:"E90"}] },
    { id: "sympt",   label: "R00–R99",   subtitle: "Příznaky a abnormální nálezy",                  color: "#9ca3af", ranges: [{from:"R00",to:"R99"}] },
  ],
  endo: [
    { id: "all",     label: "Vše",       subtitle: "",                                              color: "#3b82f6", ranges: [] },
    { id: "endokr",  label: "E00–E90",   subtitle: "Nemoci endokrinní, výživy a přeměny látek",    color: "#10b981", ranges: [{from:"E00",to:"E90"}] },
    { id: "novot",   label: "C73–D44",   subtitle: "Novotvary žláz s vnitřní sekrecí",              color: "#ec4899", ranges: [{from:"C73",to:"C75"},{from:"D34",to:"D35"},{from:"D44",to:"D44"}] },
    { id: "sympt",   label: "R00–R99",   subtitle: "Příznaky a abnormální nálezy",                  color: "#9ca3af", ranges: [{from:"R00",to:"R99"}] },
    { id: "tehot",   label: "O00–O99",   subtitle: "Těhotenství, porod a šestinedělí",              color: "#8b5cf6", ranges: [{from:"O00",to:"O99"}] },
    { id: "obeh",    label: "I00–I99",   subtitle: "Nemoci oběhové soustavy",                       color: "#f59e0b", ranges: [{from:"I00",to:"I99"}] },
  ],
};

// ── Clinical area sub-filter, per specialty ──────────────────────────────────
const MKN_AREAS_BY_SPEC = {
  gastro: [
    { id: "all",      label: "Celá oblast",          color: "#6b7280", ranges: [] },
    { id: "horni",    label: "Horní GIT",            color: "#10b981", ranges: [{from:"K20",to:"K31"}] },
    { id: "ibd",      label: "IBD",                  color: "#f59e0b", ranges: [{from:"K50",to:"K52"}] },
    { id: "kolon",    label: "Kolon / proktologie",  color: "#06b6d4", ranges: [{from:"K55",to:"K64"}] },
    { id: "hepato",   label: "Hepatologie",          color: "#8b5cf6", ranges: [{from:"K70",to:"K77"},{from:"B15",to:"B19"}] },
    { id: "biliarni", label: "Biliární / pankreas",  color: "#f97316", ranges: [{from:"K80",to:"K87"}] },
    { id: "krvaceni", label: "Krvácení GIT",         color: "#ef4444", ranges: [{from:"K92",to:"K92"}] },
    { id: "onko",     label: "Onkologie GIT",        color: "#ec4899", ranges: [{from:"C15",to:"C26"},{from:"D00",to:"D13"},{from:"D37",to:"D48"}] },
    { id: "infekce",  label: "Infekční",             color: "#84cc16", ranges: [{from:"A00",to:"A09"}] },
    { id: "malabs",   label: "Malabsorpce",          color: "#a78bfa", ranges: [{from:"K90",to:"K93"}] },
    { id: "sympt2",   label: "Symptomy",             color: "#9ca3af", ranges: [{from:"R10",to:"R19"}] },
  ],
  chir: [
    { id: "all",      label: "Celá oblast",          color: "#6b7280", ranges: [] },
    { id: "kyly",     label: "Kýly",                 color: "#10b981", ranges: [{from:"K40",to:"K46"}] },
    { id: "apendix",  label: "Apendix",              color: "#f59e0b", ranges: [{from:"K35",to:"K38"}] },
    { id: "biliarni", label: "Žlučník / žlučové cesty", color: "#f97316", ranges: [{from:"K80",to:"K87"}] },
    { id: "prokto",   label: "Proktologie",          color: "#06b6d4", ranges: [{from:"K55",to:"K64"},{from:"I84",to:"I84"}] },
    { id: "stitna",   label: "Štítná žláza",         color: "#8b5cf6", ranges: [{from:"E00",to:"E07"},{from:"C73",to:"C73"}] },
    { id: "onko",     label: "Onkologie",            color: "#ec4899", ranges: [{from:"C00",to:"C97"},{from:"D00",to:"D48"}] },
    { id: "porane",   label: "Poranění",             color: "#ef4444", ranges: [{from:"S00",to:"T14"}] },
    { id: "kuze",     label: "Kůže a rány",          color: "#84cc16", ranges: [{from:"L00",to:"L99"}] },
    { id: "zily",     label: "Žíly / cévy",          color: "#a78bfa", ranges: [{from:"I80",to:"I89"}] },
  ],
  endo: [
    { id: "all",      label: "Celá oblast",          color: "#6b7280", ranges: [] },
    { id: "dm",       label: "Diabetes mellitus",    color: "#10b981", ranges: [{from:"E10",to:"E14"}] },
    { id: "stitna",   label: "Štítná žláza",         color: "#8b5cf6", ranges: [{from:"E00",to:"E07"},{from:"C73",to:"C73"},{from:"D34",to:"D34"}] },
    { id: "hypofyza", label: "Hypofýza",             color: "#f59e0b", ranges: [{from:"E22",to:"E23"},{from:"D35",to:"D35"}] },
    { id: "nadledv",  label: "Nadledviny",           color: "#f97316", ranges: [{from:"E24",to:"E27"}] },
    { id: "obezita",  label: "Obezita / výživa",     color: "#06b6d4", ranges: [{from:"E65",to:"E68"}] },
    { id: "metabol",  label: "Poruchy metabolismu",  color: "#ec4899", ranges: [{from:"E70",to:"E90"}] },
    { id: "kalcium",  label: "Kalcium / kosti",      color: "#84cc16", ranges: [{from:"E20",to:"E21"},{from:"E55",to:"E55"},{from:"M80",to:"M85"}] },
  ],
};

function inGroup(diagCode, group) {
  if (group.id === "all") return true;
  const code = diagCode.slice(0, 3).toUpperCase();
  return group.ranges.some(({ from, to }) => code >= from && code <= to);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DiagAnalysis() {
  const { diagnoses, icoLoading, icoLoaded, loadIcoData } = useData();
  const { spec, t } = useSettings();
  const { label: mkn10Label, name: mkn10Name } = useMkn10();

  const MKN_GROUPS = MKN_GROUPS_BY_SPEC[spec] ?? MKN_GROUPS_BY_SPEC.gastro;
  const MKN_AREAS  = MKN_AREAS_BY_SPEC[spec]  ?? MKN_AREAS_BY_SPEC.gastro;

  const [selectedYear,  setSelectedYear]  = useState("2024");
  const [selectedGroup, setSelectedGroup] = useState(MKN_GROUPS[0]);
  const [metric,        setMetric]        = useState("mn");   // "mn" | "pp"
  const [sortCol,       setSortCol]       = useState(null);
  const [sortDir,       setSortDir]       = useState("desc");
  const [topN,          setTopN]          = useState(20);
  const [search,        setSearch]        = useState("");
  const [selectedArea,  setSelectedArea]  = useState(MKN_AREAS[0]);

  useEffect(() => { loadIcoData(); }, [loadIcoData]);
  useEffect(() => { setTopN(20); }, [selectedGroup, selectedArea, selectedYear, metric, sortCol, sortDir, search]);

  // ── Aggregate all procedure diagnoses → per-diagnosis yearly totals ─────
  const diagAgg = useMemo(() => {
    if (!icoLoaded || !diagnoses) return [];
    const agg = {};
    Object.values(diagnoses).forEach((diagList) => {
      if (!Array.isArray(diagList)) return;
      diagList.forEach(({ diag, years }) => {
        if (!diag || diag.length < 2) return;
        if (!agg[diag]) agg[diag] = { diag, years: {}, total: 0 };
        Object.entries(years || {}).forEach(([rok, vals]) => {
          if (!agg[diag].years[rok]) agg[diag].years[rok] = { mn: 0, pp: 0 };
          agg[diag].years[rok].mn += vals.mn ?? 0;
          agg[diag].years[rok].pp += vals.pp ?? 0;
          agg[diag].total         += vals.mn ?? 0;
        });
      });
    });
    return Object.values(agg).sort((a, b) => b.total - a.total);
  }, [diagnoses, icoLoaded]);

  // ── Filter by chapter + area + search + sort ────────────────────────────
  const filteredDiags = useMemo(() => {
    // 1) Chapter filter
    let rows = selectedGroup.id === "all"
      ? diagAgg
      : diagAgg.filter((d) => inGroup(d.diag, selectedGroup));

    // 2) Gastro area sub-filter
    if (selectedArea.id !== "all") {
      rows = rows.filter((d) => inGroup(d.diag, selectedArea));
    }

    // 3) Search by code or Czech name
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((d) =>
        d.diag.toLowerCase().includes(q) ||
        mkn10Name(d.diag).toLowerCase().includes(q)
      );
    }

    const prevYear = String(Number(selectedYear) - 1);

    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        let av, bv;
        if (sortCol === "yoy") {
          av = yoyPct(a.years[prevYear]?.[metric] ?? 0, a.years[selectedYear]?.[metric] ?? 0) ?? -Infinity;
          bv = yoyPct(b.years[prevYear]?.[metric] ?? 0, b.years[selectedYear]?.[metric] ?? 0) ?? -Infinity;
        } else if (sortCol === "5y") {
          av = yoyPct(a.years["2019"]?.[metric] ?? 0, a.years["2024"]?.[metric] ?? 0) ?? -Infinity;
          bv = yoyPct(b.years["2019"]?.[metric] ?? 0, b.years["2024"]?.[metric] ?? 0) ?? -Infinity;
        } else {
          av = a.years[sortCol]?.[metric] ?? 0;
          bv = b.years[sortCol]?.[metric] ?? 0;
        }
        return sortDir === "desc" ? bv - av : av - bv;
      });
    } else {
      rows = [...rows].sort(
        (a, b) => (b.years[selectedYear]?.[metric] ?? 0) - (a.years[selectedYear]?.[metric] ?? 0)
      );
    }
    return rows;
  }, [diagAgg, selectedGroup, selectedArea, selectedYear, metric, sortCol, sortDir, search, mkn10Name]);

  const visible  = filteredDiags.slice(0, topN);
  const prevYear = String(Number(selectedYear) - 1);

  function handleSort(col) {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpiTotal   = filteredDiags.reduce((s, d) => s + (d.years[selectedYear]?.[metric] ?? 0), 0);
  const kpiTopDiag = filteredDiags[0];
  const kpiTopYoy  = kpiTopDiag
    ? yoyPct(kpiTopDiag.years[prevYear]?.[metric] ?? 0, kpiTopDiag.years[selectedYear]?.[metric] ?? 0)
    : null;

  // ── Bar chart – top 15 ───────────────────────────────────────────────────
  const barData = useMemo(() =>
    filteredDiags.slice(0, 15).map((d) => ({
      name:  mkn10Label(d.diag),
      code:  d.diag,
      value: d.years[selectedYear]?.[metric] ?? 0,
    })),
    [filteredDiags, selectedYear, metric, mkn10Label]
  );

  // ── Trend chart – top 5 ──────────────────────────────────────────────────
  const top5 = useMemo(() => filteredDiags.slice(0, 5), [filteredDiags]);
  const trendData = useMemo(() =>
    YEARS.map((yr) => {
      const row = { year: yr };
      top5.forEach((d) => { row[d.diag] = d.years[yr]?.[metric] ?? 0; });
      return row;
    }),
    [top5, metric]
  );

  const metricLabel = metric === "mn" ? t("Počet výkonů") : t("Počet pacientů");
  const groupLabel  = selectedArea.id !== "all" ? t(selectedArea.label) : selectedGroup.id !== "all" ? selectedGroup.label : t("Vše");
  const groupColor  = selectedArea.id !== "all"
    ? selectedArea.color
    : selectedGroup.id !== "all" ? selectedGroup.color : "#3b82f6";

  if (icoLoading) return <LoadingSpinner message="Načítám data diagnóz…" />;
  if (!icoLoaded)  return null;

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-strong">{t("MKN-10 Diagnózy")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("Analýza trendů diagnóz dané odbornosti · NR-04-02 · 2019–2024")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Metric toggle */}
          <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5">
            {[["mn","Výkony"],["pp","Pacienti"]].map(([val, lbl]) => (
              <button key={val} onClick={() => setMetric(val)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  metric === val ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}>
                {t(lbl)}
              </button>
            ))}
          </div>
          {/* Year tabs */}
          <div className="flex gap-1">
            {YEARS.map((y) => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  y === selectedYear ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Info note ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-xs text-gray-500">
        <Info size={13} className="flex-shrink-0 text-gray-600" />
        <span>
          {t("Diagnózy dle MKN-10 z NR-04-02 (výkony pojišťoven dle poskytovatele a hlavní diagnózy). Každý kód odkáže na plný název v")}&nbsp;
          <a href="https://mkn10.uzis.cz/prohlizec/K00-K93" target="_blank" rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5">
            mkn10.uzis.cz <ExternalLink size={10} />
          </a>
        </span>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 space-y-4">

        {/* Row 1: Chapter (MKN-10 kapitola) */}
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">
            {t("Kapitola MKN-10")}
          </p>
          <div className="flex flex-wrap gap-2 items-start">
            {MKN_GROUPS.map((g) => (
              <button key={g.id}
                onClick={() => { setSelectedGroup(g); setSortCol(null); setSearch(""); }}
                className={`px-3 py-1.5 rounded-lg font-medium border transition-all flex flex-col items-start text-left ${
                  selectedGroup.id === g.id
                    ? "text-white border-transparent shadow-sm"
                    : "bg-gray-900/60 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
                }`}
                style={selectedGroup.id === g.id ? { background: g.color, borderColor: g.color } : {}}
              >
                <span className="text-xs font-mono font-bold leading-tight">{g.id === "all" ? t("Vše") : g.label}</span>
                {g.subtitle && (
                  <span className={`text-[10px] font-normal leading-tight mt-0.5 ${
                    selectedGroup.id === g.id ? "text-white/80" : "text-gray-600"
                  }`}>{t(g.subtitle)}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700/60" />

        {/* Row 2: Clinical gastro area */}
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">
            {t("Oblast gastroenterologie")}
          </p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {MKN_AREAS.map((g) => (
              <button key={g.id}
                onClick={() => { setSelectedArea(g); setSortCol(null); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  selectedArea.id === g.id
                    ? "text-white border-transparent shadow-sm"
                    : "bg-gray-900/60 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
                }`}
                style={selectedArea.id === g.id ? { background: g.color, borderColor: g.color } : {}}
              >
                {t(g.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700/60" />

        {/* Row 3: Search + result count + reset */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Hledat dle kódu nebo názvu…")}
              className="bg-gray-900/60 border border-gray-700 rounded-lg pl-8 pr-7 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors w-64"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                <X size={11} />
              </button>
            )}
          </div>
          <span className="text-xs text-gray-500">
            <span className="text-strong font-semibold">{filteredDiags.length}</span>
            {" "}{t("kódů")}{search ? ` ${t("odpovídá hledání")}` : ""}
          </span>
          {sortCol && (
            <button onClick={() => { setSortCol(null); setSortDir("desc"); }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:text-gray-200 transition-colors ml-auto">
              <X size={10} /> {t("Resetovat řazení")}
            </button>
          )}
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{metricLabel}</p>
          <p className="text-2xl font-bold" style={{ color: groupColor }}>{fmt(kpiTotal)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("rok {year}", { year: selectedYear })} · {groupLabel}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Počet diagnóz")}</p>
          <p className="text-2xl font-bold text-strong">{filteredDiags.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("kódů MKN-10")} · {groupLabel}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Top diagnóza")}</p>
          <p className="text-lg font-bold text-strong font-mono leading-tight">{kpiTopDiag?.diag ?? "—"}</p>
          {kpiTopDiag && mkn10Name(kpiTopDiag.diag) !== kpiTopDiag.diag && (
            <p className="text-xs text-blue-300 mt-0.5 leading-tight">{mkn10Name(kpiTopDiag.diag)}</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            {fmtFull(kpiTopDiag?.years[selectedYear]?.[metric] ?? 0)} · {t("rok {year}", { year: selectedYear })}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("YoY (top diagnóza)")}</p>
          <p className={`text-2xl font-bold ${
            kpiTopYoy === null ? "text-gray-600"
            : kpiTopYoy > 0 ? "text-emerald-400"
            : "text-red-400"
          }`}>
            {kpiTopYoy !== null ? `${kpiTopYoy > 0 ? "+" : ""}${kpiTopYoy.toFixed(1)}%` : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{t("vs. {year}", { year: prevYear })}</p>
        </div>
      </div>

      {/* ── Bar chart – top 15 ──────────────────────────────────────────── */}
      <ChartContainer
        title={t("Top 15 diagnóz – {g} – {year}", { g: groupLabel, year: selectedYear })}
        subtitle={t("{metric} · kódy MKN-10", { metric: metricLabel })}
      >
        <ResponsiveContainer width="100%" height={490}>
          <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 50, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_UI.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={fmt} tick={{ fill: CHART_UI.tick, fontSize: 14 }} />
            <YAxis type="category" dataKey="name" width={230}
              tick={{ fill: CHART_UI.tickAccent, fontSize: 14 }} />
            <Tooltip
              contentStyle={CHART_UI.tooltip}
              formatter={(v, _, props) => [fmtFull(v), `${props.payload.name} – ${metricLabel}`]}
            />
            <Bar dataKey="value" fill={groupColor} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* ── Trend chart – top 5 ─────────────────────────────────────────── */}
      {top5.length > 0 && (
        <ChartContainer
          title={t("Vývoj Top 5 diagnóz – {g} (2019–2024)", { g: groupLabel })}
          subtitle={metricLabel}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_UI.grid} />
              <XAxis dataKey="year" tick={{ fill: CHART_UI.tick, fontSize: 14 }} />
              <YAxis tickFormatter={fmt} tick={{ fill: CHART_UI.tick, fontSize: 14 }} width={60} />
              <Tooltip
                contentStyle={CHART_UI.tooltip}
                labelStyle={CHART_UI.tooltipLabel}
                formatter={(v, name) => [fmtFull(v), mkn10Label(name)]}
              />
              <Legend
                formatter={(val) => mkn10Label(val)}
                wrapperStyle={{ fontSize: 14, color: CHART_UI.tickAccent }}
              />
              <ReferenceLine x="2020" stroke="#ef444455" strokeDasharray="4 4"
                label={{ value: "COVID-19", position: "top", fill: "#ef4444", fontSize: 14 }} />
              {top5.map((d, i) => (
                <Line key={d.diag} type="monotone" dataKey={d.diag}
                  stroke={CHART_COLORS[i]} strokeWidth={2}
                  dot={{ r: 3, fill: CHART_COLORS[i] }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <SectionHeader
        title={t("Všechny diagnózy – {g}", { g: groupLabel })}
        subtitle={t("{n} kódů MKN-10 · {metric} · seřazeno dle {col}", { n: filteredDiags.length, metric: metricLabel, col: sortCol ?? selectedYear })}
      />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium w-8">#</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">{t("MKN-10 kód")}</th>
              {YEARS.map((y) => (
                <th key={y} onClick={() => handleSort(y)}
                  className={`text-right px-3 py-3 font-medium cursor-pointer select-none transition-colors ${
                    sortCol === y
                      ? "bg-gray-800/50 text-blue-300"
                      : y === selectedYear ? "text-blue-400 hover:text-blue-300" : "text-gray-400 hover:text-gray-200"
                  }`}>
                  <span className="inline-flex items-center justify-end gap-1">
                    {y}<SortIcon col={y} sortCol={sortCol} sortDir={sortDir} />
                  </span>
                </th>
              ))}
              <th onClick={() => handleSort("yoy")}
                className={`text-right px-3 py-3 font-medium cursor-pointer select-none transition-colors ${
                  sortCol === "yoy" ? "bg-gray-800/50 text-blue-300" : "text-gray-400 hover:text-gray-200"
                }`}>
                <span className="inline-flex items-center justify-end gap-1">
                  YoY<SortIcon col="yoy" sortCol={sortCol} sortDir={sortDir} />
                </span>
              </th>
              <th onClick={() => handleSort("5y")}
                className={`text-right px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap transition-colors ${
                  sortCol === "5y" ? "bg-gray-800/50 text-blue-300" : "text-gray-400 hover:text-gray-200"
                }`}>
                <span className="inline-flex items-center justify-end gap-1">
                  2019→2024<SortIcon col="5y" sortCol={sortCol} sortDir={sortDir} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d, idx) => {
              const curr  = d.years[selectedYear]?.[metric] ?? 0;
              const prev2 = d.years[prevYear]?.[metric]      ?? 0;
              const v2019 = d.years["2019"]?.[metric]         ?? 0;
              const v2024 = d.years["2024"]?.[metric]         ?? 0;
              const yoy   = yoyPct(prev2, curr);
              const d5y   = yoyPct(v2019, v2024);
              return (
                <tr key={d.diag} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-gray-600 tabular-nums text-xs">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <a
                      href={`https://mkn10.uzis.cz/prohlizec/${d.diag.slice(0, 3)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="font-mono text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 group"
                      title={t("Otevřít v MKN-10 prohlížeči")}
                    >
                      {d.diag}
                      <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                    </a>
                    {mkn10Name(d.diag) !== d.diag && (
                      <p className="text-xs text-gray-400 mt-0.5 leading-tight max-w-[260px]">
                        {mkn10Name(d.diag)}
                      </p>
                    )}
                  </td>
                  {YEARS.map((y) => (
                    <td key={y} className={`px-3 py-2.5 text-right tabular-nums text-xs ${
                      sortCol === y ? "bg-gray-800/25" : ""
                    } ${y === selectedYear ? "text-gray-200 font-semibold" : "text-gray-500"}`}>
                      {fmtFull(d.years[y]?.[metric] ?? 0)}
                    </td>
                  ))}
                  <td className={`px-3 py-2.5 text-right ${sortCol === "yoy" ? "bg-gray-800/25" : ""}`}>
                    <YoyBadge val={yoy} />
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular-nums text-xs ${
                    sortCol === "5y" ? "bg-gray-800/25" : ""
                  } ${d5y === null ? "text-gray-600" : d5y > 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {d5y !== null ? `${d5y > 0 ? "+" : ""}${d5y.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredDiags.length > topN && (
          <div className="px-4 py-3 border-t border-gray-800 text-center">
            <button onClick={() => setTopN((n) => n + 20)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              {t("Zobrazit dalších 20 z {n} zbývajících", { n: filteredDiags.length - topN })}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
