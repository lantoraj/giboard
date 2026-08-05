import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, ZAxis, Cell,
} from "recharts";
import {
  Layers, Coins, Building2, Info, ExternalLink, Search, X,
  TrendingUp, TrendingDown, Minus, ChevronsUpDown, ChevronDown, ChevronUp,
} from "lucide-react";

import { useData } from "../DataContext";
import { useSettings } from "../SettingsContext";
import { CHART_COLORS, CHART_UI } from "../constants";
import ChartContainer from "../components/ChartContainer";
import SectionHeader from "../components/SectionHeader";
import LoadingSpinner from "../components/LoadingSpinner";

const fmt = (n) => n == null ? "—"
  : n >= 1e6 ? `${(n / 1e6).toFixed(2)} M`
  : n >= 1e3 ? `${(n / 1e3).toFixed(1)} K`
  : String(Math.round(n));
const fmtFull = (n) => n == null ? "—" : Math.round(n).toLocaleString("cs-CZ");
const fmtCzk  = (n) => n == null ? "—" : `${Math.round(n).toLocaleString("cs-CZ")} Kč`;

/** Large money amounts: mld / mil / thousands – "159672 M Kč" helps nobody. */
const fmtMoneyBig = (n, t) => {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} ${t("mld Kč")}`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} ${t("mil. Kč")}`;
  return fmtCzk(n);
};

const LEVELS = [
  { id: "mdc",       label: "MDC",          hint: "Hlavní diagnostické kategorie" },
  { id: "kategorie", label: "Kategorie",    hint: "DRG kategorie" },
  { id: "baze",      label: "DRG báze",     hint: "Bázové skupiny" },
  { id: "skupiny",   label: "DRG skupiny",  hint: "Nejpodrobnější úroveň" },
];

const TABS = [
  { id: "prehled",       label: "Přehled",       icon: Layers },
  { id: "nakladovost",   label: "Nákladovost",   icon: Coins },
  { id: "poskytovatele", label: "Poskytovatelé", icon: Building2 },
];

function YoyBadge({ val }) {
  if (val == null || !isFinite(val)) return <span className="text-gray-600">—</span>;
  const Icon = val > 0 ? TrendingUp : val < 0 ? TrendingDown : Minus;
  const cls = val > 0 ? "text-emerald-400" : val < 0 ? "text-red-400" : "text-gray-500";
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${cls}`}>
      <Icon size={12} />{val > 0 ? "+" : ""}{val.toFixed(1)}%
    </span>
  );
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={11} className="text-gray-600 opacity-60" />;
  return sortDir === "desc"
    ? <ChevronDown size={11} className="text-blue-400" />
    : <ChevronUp size={11} className="text-blue-400" />;
}

/** Info strip explaining that DRG is a different data model than the rest. */
function DrgNote({ meta }) {
  const { t } = useSettings();
  if (!meta) return null;
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs text-blue-300">
      <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-400" />
      <span>
        {t("DRG pracuje s hospitalizačními případy akutní lůžkové péče, nikoli s vykázanými výkony – čísla proto nejsou srovnatelná se zbytkem dashboardu.")}{" "}
        {t("Klinické a ekonomické ukazatele jsou za rok {year}; počty případů dle poskytovatele za {range}.",
           { year: meta.indicatorYear, range: `${meta.providerYears[0]}–${meta.providerYears.at(-1)}` })}
      </span>
    </div>
  );
}

// ── Tab 1: Přehled ────────────────────────────────────────────────────────────
function Prehled({ rows, level, setLevel, search, setSearch }) {
  const { t } = useSettings();

  const totals = useMemo(() => {
    const hp = rows.reduce((s, r) => s + (r.pocet_hp_cr || 0), 0);
    const deaths = rows.reduce((s, r) => s + (r.pocet_hp_umrti || 0), 0);
    const cm = rows.reduce((s, r) => s + (r.case_mix || 0), 0);
    const losW = rows.reduce((s, r) => s + (r.delka_hosp_prumer || 0) * (r.pocet_hp_cr || 0), 0);
    return { hp, deaths, cm, los: hp ? losW / hp : 0 };
  }, [rows]);

  const top = useMemo(() => rows.slice(0, 15).map((r) => ({
    name: `${r.kod} · ${r.nazev.length > 42 ? r.nazev.slice(0, 42) + "…" : r.nazev}`,
    value: r.pocet_hp_cr || 0,
  })), [rows]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Hospitalizační případy")}</p>
          <p className="text-2xl font-bold text-blue-400">{fmt(totals.hp)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("celkem ČR")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Průměrná délka hospitalizace")}</p>
          <p className="text-2xl font-bold text-strong">{totals.los.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("dnů (vážený průměr)")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Case-mix")}</p>
          <p className="text-2xl font-bold text-purple-400">{fmt(totals.cm)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("součet relativních vah")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Úmrtí v nemocnici")}</p>
          <p className="text-2xl font-bold text-red-400">{fmt(totals.deaths)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {totals.hp ? `${((totals.deaths / totals.hp) * 100).toFixed(2)} %` : "—"}
          </p>
        </div>
      </div>

      <ChartContainer
        title={t("Top 15 dle počtu hospitalizačních případů")}
        subtitle={t(LEVELS.find((l) => l.id === level)?.hint ?? "")}
      >
        <ResponsiveContainer width="100%" height={Math.max(420, top.length * 30)}>
          <BarChart data={top} layout="vertical" margin={{ top: 5, right: 50, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_UI.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={fmt} tick={{ fill: CHART_UI.tick, fontSize: 13 }} />
            <YAxis type="category" dataKey="name" width={330} tick={{ fill: CHART_UI.tickStrong, fontSize: 12 }} />
            <Tooltip contentStyle={CHART_UI.tooltip} itemStyle={CHART_UI.tooltipItem}
              formatter={(v) => [fmtFull(v), t("Hospitalizační případy")]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {top.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <SectionHeader
        title={t("Všechny jednotky – {n}", { n: rows.length })}
        subtitle={t("Řazeno dle počtu případů · klikněte na kód pro detail v prohlížeči CZ-DRG")}
      />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">{t("Kód")}</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">{t("Název")}</th>
              <th className="text-right px-3 py-3 text-gray-400 font-medium">{t("Případy")}</th>
              <th className="text-right px-3 py-3 text-gray-400 font-medium">{t("Délka (dny)")}</th>
              <th className="text-right px-3 py-3 text-gray-400 font-medium">{t("Věk")}</th>
              <th className="text-right px-3 py-3 text-gray-400 font-medium">{t("JIP")}</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">{t("Úmrtí")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((r) => (
              <tr key={r.kod} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-400 whitespace-nowrap">{r.kod}</td>
                <td className="px-4 py-2.5 text-gray-200 text-xs max-w-[380px]">{r.nazev}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-200 text-xs font-semibold">{fmtFull(r.pocet_hp_cr)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-400 text-xs">{r.delka_hosp_prumer ?? "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-400 text-xs">{r.vek_prijeti_prumer ?? "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-400 text-xs">{fmtFull(r.pocet_hp_pobyt_jip)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-red-300/80 text-xs">{fmtFull(r.pocet_hp_umrti)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 100 && (
          <p className="px-4 py-3 border-t border-gray-800 text-center text-xs text-gray-500">
            {t("Zobrazeno prvních 100 z {n} – zpřesněte hledáním výše.", { n: rows.length })}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Tab 2: Nákladovost ────────────────────────────────────────────────────────
function Nakladovost({ rows }) {
  const { t } = useSettings();
  const [sortCol, setSortCol] = useState("celkove_naklady_hp_prumer");
  const [sortDir, setSortDir] = useState("desc");

  const withCost = useMemo(
    () => rows.filter((r) => r.celkove_naklady_hp_prumer != null && (r.pocet_hp_cr || 0) > 0),
    [rows]
  );

  const sorted = useMemo(() => {
    const s = [...withCost];
    s.sort((a, b) => {
      const av = a[sortCol] ?? -Infinity, bv = b[sortCol] ?? -Infinity;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return s;
  }, [withCost, sortCol, sortDir]);

  const handleSort = (c) => {
    if (sortCol === c) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(c); setSortDir("desc"); }
  };

  const topCost = useMemo(() =>
    [...withCost].sort((a, b) => b.celkove_naklady_hp_prumer - a.celkove_naklady_hp_prumer).slice(0, 15)
      .map((r) => ({ name: `${r.kod} · ${r.nazev.length > 38 ? r.nazev.slice(0, 38) + "…" : r.nazev}`,
                     value: r.celkove_naklady_hp_prumer })),
    [withCost]
  );

  // cost vs volume – where the money actually is
  const scatter = useMemo(() => withCost.map((r) => ({
    x: r.pocet_hp_cr, y: r.celkove_naklady_hp_prumer, z: (r.pocet_hp_cr || 0) * (r.celkove_naklady_hp_prumer || 0),
    kod: r.kod, nazev: r.nazev,
  })), [withCost]);

  const totalSpend = useMemo(
    () => withCost.reduce((s, r) => s + (r.pocet_hp_cr || 0) * (r.celkove_naklady_hp_prumer || 0), 0),
    [withCost]
  );

  const COST_COLS = [
    ["celkove_naklady_hp_prumer",     "Celkem"],
    ["naklady_pobyt_standard_prumer", "Standardní lůžko"],
    ["naklady_pobyt_jip_prumer",      "JIP"],
    ["naklady_operacni_sluzby_prumer","Operační sály"],
    ["naklady_prime_prumer",          "Přímý materiál"],
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Odhad celkových nákladů")}</p>
          <p className="text-2xl font-bold text-amber-400">{fmtMoneyBig(totalSpend, t)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("případy × průměrné náklady")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Nejdražší jednotka")}</p>
          <p className="text-sm font-semibold text-strong leading-snug truncate">{topCost[0]?.name ?? "—"}</p>
          <p className="text-xs text-amber-400 mt-0.5 font-semibold">{fmtCzk(topCost[0]?.value)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Jednotky s náklady")}</p>
          <p className="text-2xl font-bold text-strong">{withCost.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("z {n} celkem", { n: rows.length })}</p>
        </div>
      </div>

      <ChartContainer title={t("Top 15 dle průměrných nákladů na případ")} subtitle={t("Kč na hospitalizační případ")}>
        <ResponsiveContainer width="100%" height={Math.max(420, topCost.length * 30)}>
          <BarChart data={topCost} layout="vertical" margin={{ top: 5, right: 70, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_UI.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={fmt} tick={{ fill: CHART_UI.tick, fontSize: 13 }} />
            <YAxis type="category" dataKey="name" width={310} tick={{ fill: CHART_UI.tickStrong, fontSize: 12 }} />
            <Tooltip contentStyle={CHART_UI.tooltip} itemStyle={CHART_UI.tooltipItem}
              formatter={(v) => [fmtCzk(v), t("Průměrné náklady")]} />
            <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer
        title={t("Objem vs. nákladovost")}
        subtitle={t("Vodorovně počet případů, svisle průměrné náklady – vpravo nahoře leží největší rozpočtové položky")}
      >
        <ResponsiveContainer width="100%" height={360}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_UI.grid} />
            <XAxis type="number" dataKey="x" name={t("Případy")} scale="log" domain={["auto", "auto"]}
              tickFormatter={fmt} tick={{ fill: CHART_UI.tick, fontSize: 12 }} />
            <YAxis type="number" dataKey="y" name={t("Náklady")} tickFormatter={fmt}
              tick={{ fill: CHART_UI.tick, fontSize: 12 }} width={70} />
            <ZAxis type="number" dataKey="z" range={[20, 400]} />
            <Tooltip
              contentStyle={CHART_UI.tooltip} itemStyle={CHART_UI.tooltipItem} cursor={{ strokeDasharray: "3 3" }}
              formatter={(v, name) => name === t("Náklady") ? [fmtCzk(v), name] : [fmtFull(v), name]}
              labelFormatter={() => ""}
              content={({ payload }) => {
                const p = payload?.[0]?.payload;
                if (!p) return null;
                return (
                  <div className="card p-3 text-xs">
                    <p className="font-mono font-semibold text-blue-400">{p.kod}</p>
                    <p className="text-gray-200 max-w-[240px] leading-tight mt-0.5">{p.nazev}</p>
                    <p className="text-gray-400 mt-1.5">{t("Případy")}: <span className="text-gray-200 tabular-nums">{fmtFull(p.x)}</span></p>
                    <p className="text-gray-400">{t("Náklady")}: <span className="text-amber-400 tabular-nums">{fmtCzk(p.y)}</span></p>
                  </div>
                );
              }}
            />
            <Scatter data={scatter} fill="#f59e0b" fillOpacity={0.55} />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartContainer>

      <SectionHeader title={t("Rozpad nákladů")} subtitle={t("Průměrné náklady na případ v Kč · klikněte na hlavičku pro řazení")} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">{t("Kód")}</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">{t("Název")}</th>
              <th className="text-right px-3 py-3 text-gray-400 font-medium">{t("Případy")}</th>
              {COST_COLS.map(([col, lbl]) => (
                <th key={col} onClick={() => handleSort(col)}
                  className={`text-right px-3 py-3 font-medium cursor-pointer select-none whitespace-nowrap transition-colors ${
                    sortCol === col ? "bg-gray-800/50 text-blue-300" : "text-gray-400 hover:text-gray-200"
                  }`}>
                  <span className="inline-flex items-center justify-end gap-1">
                    {t(lbl)}<SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 60).map((r) => (
              <tr key={r.kod} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-400 whitespace-nowrap">{r.kod}</td>
                <td className="px-4 py-2.5 text-gray-200 text-xs max-w-[300px]">{r.nazev}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-400 text-xs">{fmtFull(r.pocet_hp_cr)}</td>
                {COST_COLS.map(([col]) => (
                  <td key={col} className={`px-3 py-2.5 text-right tabular-nums text-xs ${
                    sortCol === col ? "bg-gray-800/25 text-amber-300 font-semibold" : "text-gray-300"
                  }`}>
                    {r[col] != null ? Math.round(r[col]).toLocaleString("cs-CZ") : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 3: Poskytovatelé ──────────────────────────────────────────────────────
function Poskytovatele({ providers }) {
  const { t } = useSettings();
  const [unitKod, setUnitKod] = useState(null);
  const [query, setQuery] = useState("");

  const units = providers?.units ?? [];
  const years = providers?.years ?? [];

  useEffect(() => {
    if (!unitKod && units.length) {
      // default: the MDC with the most cases in the latest year
      const counts = providers.counts ?? {};
      let best = units[0].kod, bestVal = -1;
      units.filter((u) => u.level === "mdc").forEach((u) => {
        const tot = Object.values(counts[u.kod] ?? {}).reduce((s, arr) => s + (arr.at(-1) || 0), 0);
        if (tot > bestVal) { bestVal = tot; best = u.kod; }
      });
      setUnitKod(best);
    }
  }, [units, providers, unitKod]);

  const filteredUnits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => u.kod.toLowerCase().includes(q) || u.nazev.toLowerCase().includes(q));
  }, [units, query]);

  const nameByIcz = useMemo(
    () => Object.fromEntries((providers?.providers ?? []).map((p) => [p.icz, p.name])),
    [providers]
  );

  const rows = useMemo(() => {
    if (!unitKod || !providers) return [];
    const byIcz = providers.counts?.[unitKod] ?? {};
    return Object.entries(byIcz).map(([icz, arr]) => {
      const last = arr.at(-1) || 0, prev = arr.at(-2) || 0;
      return {
        icz, name: nameByIcz[icz] ?? icz, values: arr, last,
        total: arr.reduce((s, v) => s + v, 0),
        yoy: prev > 0 ? ((last - prev) / prev) * 100 : null,
      };
    }).sort((a, b) => b.last - a.last);
  }, [unitKod, providers, nameByIcz]);

  const unit = units.find((u) => u.kod === unitKod);
  const totalLast = rows.reduce((s, r) => s + r.last, 0);

  const barData = useMemo(() => rows.slice(0, 15).map((r) => ({
    name: r.name.length > 38 ? r.name.slice(0, 38) + "…" : r.name,
    value: r.last,
  })), [rows]);

  const trendData = useMemo(() => {
    const top5 = rows.slice(0, 5);
    return years.map((y, i) => {
      const row = { year: y };
      top5.forEach((r) => { row[r.icz] = r.values[i] || 0; });
      return row;
    });
  }, [rows, years]);
  const top5 = rows.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* unit picker */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Hledat DRG jednotku (kód nebo název)…")}
            className="bg-transparent text-sm text-gray-200 outline-none flex-1 placeholder-gray-600"
          />
          {query && <button onClick={() => setQuery("")} className="text-gray-500 hover:text-gray-300"><X size={13} /></button>}
        </div>
        <select
          value={unitKod ?? ""}
          onChange={(e) => setUnitKod(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 outline-none"
          size={1}
        >
          {filteredUnits.slice(0, 400).map((u) => (
            <option key={u.kod} value={u.kod}>
              {u.level === "mdc" ? "MDC " : ""}{u.kod} – {u.nazev}
            </option>
          ))}
        </select>
        {filteredUnits.length > 400 && (
          <p className="text-[11px] text-gray-600">{t("Zobrazeno prvních 400 – zpřesněte hledání.")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Vybraná jednotka")}</p>
          <p className="text-sm font-semibold text-strong leading-snug">{unit?.nazev ?? "—"}</p>
          <p className="text-xs font-mono text-blue-400 mt-0.5">{unit?.kod}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Případy {year}", { year: years.at(-1) ?? "" })}</p>
          <p className="text-2xl font-bold text-blue-400">{fmtFull(totalLast)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("{n} pracovišť", { n: rows.length })}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("Top pracoviště")}</p>
          <p className="text-sm font-semibold text-strong leading-tight truncate">{rows[0]?.name ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">{fmtFull(rows[0]?.last)} {t("případů")}</p>
        </div>
      </div>

      {barData.length > 0 && (
        <ChartContainer
          title={t("Top 15 pracovišť – {unit} – {year}", { unit: unit?.kod ?? "", year: years.at(-1) ?? "" })}
          subtitle={t("Počet hospitalizačních případů")}
        >
          <ResponsiveContainer width="100%" height={Math.max(420, barData.length * 32)}>
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 250 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_UI.grid} horizontal={false} />
              <XAxis type="number" tickFormatter={fmt} tick={{ fill: CHART_UI.tick, fontSize: 13 }} />
              <YAxis type="category" dataKey="name" width={245} interval={0} tick={{ fill: CHART_UI.tickStrong, fontSize: 12 }} />
              <Tooltip contentStyle={CHART_UI.tooltip} itemStyle={CHART_UI.tooltipItem}
                formatter={(v) => [fmtFull(v), t("Případy")]} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {top5.length > 0 && (
        <ChartContainer title={t("Vývoj – Top 5 pracovišť")} subtitle={`${years[0]}–${years.at(-1)}`}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_UI.grid} />
              <XAxis dataKey="year" tick={{ fill: CHART_UI.tick, fontSize: 13 }} />
              <YAxis tickFormatter={fmt} tick={{ fill: CHART_UI.tick, fontSize: 13 }} width={60} />
              <Tooltip contentStyle={CHART_UI.tooltip} itemStyle={CHART_UI.tooltipItem}
                formatter={(v, icz) => [fmtFull(v), nameByIcz[icz] ?? icz]} />
              <Legend formatter={(icz) => (nameByIcz[icz] ?? icz).slice(0, 34)}
                wrapperStyle={{ fontSize: 12, color: CHART_UI.tick }} />
              {top5.map((r, i) => (
                <Line key={r.icz} type="monotone" dataKey={r.icz} stroke={CHART_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      <SectionHeader title={t("Všechna pracoviště")} subtitle={t("{n} pracovišť · {unit}", { n: rows.length, unit: unit?.kod ?? "" })} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium w-8">#</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">{t("Pracoviště")}</th>
              <th className="text-left px-3 py-3 text-gray-400 font-medium font-mono text-xs">IČZ</th>
              {years.map((y) => (
                <th key={y} className={`text-right px-3 py-3 font-medium ${y === years.at(-1) ? "text-blue-400" : "text-gray-400"}`}>{y}</th>
              ))}
              <th className="text-right px-4 py-3 text-gray-400 font-medium">YoY</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 60).map((r, i) => (
              <tr key={r.icz} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 text-gray-600 tabular-nums text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-gray-600 flex-shrink-0" />
                    <span className="font-medium text-gray-200 text-xs">{r.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-xs text-gray-600">{r.icz}</td>
                {r.values.map((v, vi) => (
                  <td key={vi} className={`px-3 py-3 text-right tabular-nums text-xs ${
                    vi === r.values.length - 1 ? "text-gray-200 font-semibold" : "text-gray-500"
                  }`}>{fmtFull(v)}</td>
                ))}
                <td className="px-4 py-3 text-right"><YoyBadge val={r.yoy} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function Drg() {
  const { drg, loadDrg } = useData();
  const { t } = useSettings();
  const [tab, setTab] = useState("prehled");
  const [level, setLevel] = useState("mdc");
  const [search, setSearch] = useState("");

  // load what the active tab needs
  useEffect(() => {
    loadDrg(level, tab === "poskytovatele");
  }, [loadDrg, level, tab]);

  const rows = useMemo(() => {
    const data = drg.levels[level] ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) => r.kod.toLowerCase().includes(q) || r.nazev.toLowerCase().includes(q));
  }, [drg.levels, level, search]);

  const busy = drg.loading && !drg.levels[level];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-strong">{t("CZ-DRG")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("Akutní lůžková péče dle klasifikace CZ-DRG · ÚZIS ČR")}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === tb.id ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
              }`}>
              <tb.icon size={14} /> {t(tb.label)}
            </button>
          ))}
        </div>
      </div>

      <DrgNote meta={drg.meta} />

      {/* level + search — only for the national-indicator tabs */}
      {tab !== "poskytovatele" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {LEVELS.map((l) => (
              <button key={l.id} onClick={() => setLevel(l.id)} title={t(l.hint)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  level === l.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}>
                {t(l.label)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg w-72">
            <Search size={14} className="text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Hledat kód nebo název…")}
              className="bg-transparent text-xs text-gray-200 outline-none flex-1 placeholder-gray-600" />
            {search && <button onClick={() => setSearch("")} className="text-gray-500 hover:text-gray-300"><X size={12} /></button>}
          </div>
          <span className="text-xs text-gray-500">{t("{n} jednotek", { n: rows.length })}</span>
        </div>
      )}

      {drg.error && (
        <div className="card p-4 border-red-700 text-sm text-red-300">{drg.error}</div>
      )}

      {busy ? <LoadingSpinner message="Načítám data DRG…" /> : (
        <>
          {tab === "prehled" && <Prehled rows={rows} level={level} setLevel={setLevel} search={search} setSearch={setSearch} />}
          {tab === "nakladovost" && <Nakladovost rows={rows} />}
          {tab === "poskytovatele" && (
            drg.providers ? <Poskytovatele providers={drg.providers} />
                          : <LoadingSpinner message="Načítám data pracovišť…" />
          )}
        </>
      )}

      {/* Sources */}
      {drg.meta?.sources && (
        <div className="card p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">{t("Zdroj dat")}</p>
          <div className="space-y-1.5">
            {drg.meta.sources.map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 transition-colors">
                <ExternalLink size={11} className="flex-shrink-0" />
                <span>{s.title} · {s.year} · {s.license}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
